import assert from "node:assert/strict";
import test from "node:test";
import {
  MissingEnvError,
  readInt,
  readString,
  requireBaseUrl,
  requireString,
} from "../lib/env-core.ts";

test("a present value is trimmed", () => {
  assert.equal(readString({ A: "  value  " }, "A"), "value");
});

test("an absent or blank value is missing", () => {
  assert.equal(readString({}, "A"), undefined);
  assert.equal(readString({ A: "" }, "A"), undefined);
  assert.equal(readString({ A: "   " }, "A"), undefined);
});

test("a required value names the variable when it is missing", () => {
  assert.throws(
    () => requireString({}, "INFERHUB_MODEL"),
    (error: unknown) => {
      assert.ok(error instanceof MissingEnvError);
      assert.equal(error.variable, "INFERHUB_MODEL");
      assert.match(error.message, /INFERHUB_MODEL/);
      assert.match(error.message, /\.env\.example/);
      return true;
    },
  );
});

test("a required value is returned when set", () => {
  assert.equal(requireString({ A: "x" }, "A"), "x");
});

test("a base URL loses its trailing slash", () => {
  assert.equal(
    requireBaseUrl({ A: "https://api.example.com/" }, "A"),
    "https://api.example.com",
  );
  assert.equal(
    requireBaseUrl({ A: "https://api.example.com///" }, "A"),
    "https://api.example.com",
  );
});

test("a base URL keeps its path", () => {
  assert.equal(
    requireBaseUrl({ A: "https://example.com/api/v1/entries/en" }, "A"),
    "https://example.com/api/v1/entries/en",
  );
});

test("a malformed base URL is rejected with the variable name", () => {
  assert.throws(
    () =>
      requireBaseUrl(
        { DICTIONARY_BASE_URL: "not a url" },
        "DICTIONARY_BASE_URL",
      ),
    /DICTIONARY_BASE_URL must be an absolute URL/,
  );
});

test("a non-http protocol is rejected", () => {
  assert.throws(
    () => requireBaseUrl({ A: "ftp://example.com" }, "A"),
    /must use http or https/,
  );
});

test("an integer falls back when absent, blank, or malformed", () => {
  assert.equal(readInt({}, "TIMEOUT", 15000), 15000);
  assert.equal(readInt({ TIMEOUT: "" }, "TIMEOUT", 15000), 15000);
  assert.equal(readInt({ TIMEOUT: "abc" }, "TIMEOUT", 15000), 15000);
  assert.equal(readInt({ TIMEOUT: "0" }, "TIMEOUT", 15000), 15000);
  assert.equal(readInt({ TIMEOUT: "-5" }, "TIMEOUT", 15000), 15000);
});

test("an integer is parsed when valid", () => {
  assert.equal(readInt({ TIMEOUT: "20000" }, "TIMEOUT", 15000), 20000);
});
