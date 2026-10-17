#!/usr/bin/env node
/**
 * One-off backfill for words saved before dictionary v2. Re-fetches each row
 * that still has an empty `entries` array and writes the normalized shape.
 *
 *   node scripts/backfill-dictionary-v2.mjs
 *
 * Safe to run repeatedly: the update guard only touches empty rows.
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { normalizeDictionary } from "../lib/normalize.ts";

const BASE_URL = "https://freedictionaryapi.com/api/v1/entries/en";

function readEnv() {
  const path = new URL("../.env.local", import.meta.url);
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

const env = readEnv();
if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from .env.local");
  process.exit(1);
}

const sql = neon(env.DATABASE_URL);
const rows = await sql`
  select id, word, normalized_word
  from public.vocabulary_words
  where jsonb_array_length(entries) = 0
  order by created_at
`;

if (rows.length === 0) {
  console.log("Nothing to backfill: every word already has entries.");
  process.exit(0);
}

let updated = 0;
let failed = 0;

for (const row of rows) {
  try {
    const response = await fetch(
      `${BASE_URL}/${encodeURIComponent(row.normalized_word)}?translations=true`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) {
      console.error(`✗ ${row.word}: HTTP ${response.status}`);
      failed += 1;
      continue;
    }
    const normalized = normalizeDictionary(await response.json());
    if (normalized.entries.length === 0) {
      console.error(`✗ ${row.word}: provider returned no entries`);
      failed += 1;
      continue;
    }
    const result = await sql`
      update public.vocabulary_words
      set entries = ${JSON.stringify(normalized.entries)}::jsonb,
          translations = ${JSON.stringify(normalized.translations)}::jsonb,
          forms = ${JSON.stringify(normalized.forms)}::jsonb,
          source = ${JSON.stringify(normalized.source)}::jsonb,
          phonetic = ${normalized.phonetic},
          entries_fetched_at = now()
      where id = ${row.id}::uuid and jsonb_array_length(entries) = 0
      returning id
    `;
    if (result.length > 0) {
      updated += 1;
      console.log(`✓ ${row.word}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`✗ ${row.word}:`, error instanceof Error ? error.message : error);
  }
}

console.log(`\nBackfill finished: ${updated} updated, ${failed} failed, ${rows.length} candidates.`);
if (failed > 0) process.exitCode = 1;
