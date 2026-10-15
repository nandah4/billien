const ALLOWED_AUDIO_SOURCES = [
  { host: "ssl.gstatic.com", pathPrefix: "/dictionary/static/sounds/" },
  { host: "api.dictionaryapi.dev", pathPrefix: "/media/pronunciations/" },
] as const;

function decodeSource(token: string | null) {
  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const source = Buffer.from(token, "base64url").toString("utf8");
    return Buffer.from(source, "utf8").toString("base64url") === token ? source : null;
  } catch {
    return null;
  }
}

function isAllowedAudioSource(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_AUDIO_SOURCES.some(
      ({ host, pathPrefix }) => url.hostname === host && url.pathname.startsWith(pathPrefix),
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const source = decodeSource(new URL(request.url).searchParams.get("asset"));
  if (!source || !isAllowedAudioSource(source)) {
    return new Response("Invalid media asset.", { status: 400 });
  }

  try {
    const upstream = await fetch(source, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "audio/mpeg" },
    });
    if (!upstream.ok || !upstream.headers.get("content-type")?.startsWith("audio/")) {
      return new Response("Media asset is unavailable.", { status: 502 });
    }

    const audio = Buffer.from(await upstream.arrayBuffer()).toString("base64");
    if (!audio) return new Response("Media asset is unavailable.", { status: 502 });

    return Response.json({ audio }, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Media asset is unavailable.", { status: 502 });
  }
}
