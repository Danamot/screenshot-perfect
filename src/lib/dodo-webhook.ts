/** Verificación de firmas de Dodo Payments (especificación Standard Webhooks). Usa Web Crypto. */

const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signDodoPayload(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const keyBytes = base64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return bytesToBase64(sig);
}

export async function verifyDodoSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  body: string;
  nowSeconds?: number;
}): Promise<boolean> {
  const { secret, id, timestamp, signatureHeader, body } = input;
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const ts = Number(timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

  let expected: string;
  try {
    expected = await signDodoPayload(secret, id, timestamp, body);
  } catch {
    return false;
  }
  return signatureHeader
    .split(" ")
    .map((part) => part.split(","))
    .some(([version, sig]) => version === "v1" && !!sig && safeEqual(sig, expected));
}
