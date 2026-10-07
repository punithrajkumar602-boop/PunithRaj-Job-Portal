const enc = new TextEncoder();
export function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function unb64(s: string) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
}
export async function hashPassword(
  password: string,
  salt = b64(crypto.getRandomValues(new Uint8Array(16))),
) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return `${salt}.${b64(new Uint8Array(bits))}`;
}
export async function verifyPassword(password: string, hash: string) {
  return constantTime(await hashPassword(password, hash.split(".")[0]), hash);
}
export function constantTime(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
async function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function signJwt(sub: string, secret: string) {
  const data = `${b64(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))}.${b64(enc.encode(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 86400, iat: Math.floor(Date.now() / 1000) })))}`;
  return `${data}.${b64(new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(data))))}`;
}
export async function verifyJwt(token: string, secret: string) {
  try {
    const [h, p, s, ...rest] = token.split(".");
    if (rest.length || !h || !p || !s) return null;
    const header = JSON.parse(new TextDecoder().decode(unb64(h)));
    if (header.alg !== "HS256") return null;
    if (
      !(await crypto.subtle.verify(
        "HMAC",
        await key(secret),
        unb64(s),
        enc.encode(`${h}.${p}`),
      ))
    )
      return null;
    const claim = JSON.parse(new TextDecoder().decode(unb64(p)));
    return typeof claim.sub === "string" && claim.exp > Date.now() / 1000
      ? claim.sub
      : null;
  } catch {
    return null;
  }
}
