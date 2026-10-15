/**
 * `crypto.randomUUID()` is only exposed in secure contexts (HTTPS or
 * localhost). When the dev server is opened over plain HTTP from another device
 * on the network (e.g. http://192.168.110.246:3000) the method is missing, and
 * `@neondatabase/auth` calls it at module scope. That throws
 * `crypto.randomUUID is not a function` while the client bundle is still being
 * evaluated, taking down every component that imports `lib/auth-client.ts`.
 *
 * `crypto.getRandomValues()` *is* available in insecure contexts, so derive an
 * RFC 4122 version 4 UUID from it. This file is evaluated before the app's
 * module graph, so the shim is in place before the auth library loads. It is a
 * no-op in secure contexts and in production.
 */
const cryptoApi = globalThis.crypto as
  | (Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string })
  | undefined;

if (cryptoApi && typeof cryptoApi.randomUUID !== "function") {
  Object.defineProperty(cryptoApi, "randomUUID", {
    configurable: true,
    writable: true,
    value: () => {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
  });
}
