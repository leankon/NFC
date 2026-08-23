/**
 * Conversión de un lugar de Google Maps al link que abre directo la ventana
 * de "escribí una reseña".
 *
 * Una URL de Maps trae el identificador interno del lugar en la forma
 *   !1s0x95bcb5d08d830731:0x7f50e26552999af3
 * y el Place ID que necesita Google no es más que esos dos números de 64 bits
 * empaquetados en protobuf y codificados en base64url. O sea: se calcula, no
 * hace falta consultarle nada a Google.
 */

const HOSTS_DE_MAPS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "g.page",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "search.google.com",
]);

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function leBytes(valor: bigint): Uint8Array {
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) out[i] = Number((valor >> BigInt(8 * i)) & 0xffn);
  return out;
}

/** 0x95bcb5d08d830731 + 0x7f50e26552999af3 -> ChIJMQeDjdC1vJUR85qZUmXiUH8 */
export function placeIdDesdeFeatureId(hex1: string, hex2: string): string {
  const a = BigInt(hex1.startsWith("0x") ? hex1 : `0x${hex1}`);
  const b = BigInt(hex2.startsWith("0x") ? hex2 : `0x${hex2}`);

  const bytes = new Uint8Array(20);
  bytes[0] = 0x0a; // campo 1, tipo bytes
  bytes[1] = 0x12; // longitud 18
  bytes[2] = 0x09; // subcampo 1, fixed64
  bytes.set(leBytes(a), 3);
  bytes[11] = 0x11; // subcampo 2, fixed64
  bytes.set(leBytes(b), 12);

  return base64url(bytes);
}

export const PLACE_ID_REGEX = /^[A-Za-z0-9_-]{20,}$/;

/**
 * Saca el Place ID de lo que sea que peguen: una URL larga de Maps, un link
 * de reseñas ya armado, o el Place ID pelado. Devuelve null si no encuentra.
 */
export function extraerPlaceId(entrada: string): string | null {
  const texto = entrada.trim();
  if (!texto) return null;

  // Ya es un link de reseñas o trae place_id en la query.
  const enQuery = texto.match(/[?&](?:placeid|place_id)=([A-Za-z0-9_-]+)/i);
  if (enQuery) return enQuery[1];

  // URL de Maps: !1s0x...:0x...  o  ftid=0x...:0x...
  const featureId = texto.match(/(?:!1s|[?&]ftid=)(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
  if (featureId) return placeIdDesdeFeatureId(featureId[1], featureId[2]);

  // Place ID pelado (empieza con ChIJ / GhIJ / EiQ…).
  if (!texto.includes("/") && !texto.includes(" ") && PLACE_ID_REGEX.test(texto)) {
    return texto;
  }

  return null;
}

export function linkDeResena(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

function esHostDeGoogle(url: string): boolean {
  try {
    return HOSTS_DE_MAPS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** ¿Es un link corto que hay que expandir para ver el identificador? */
export function necesitaExpandirse(entrada: string): boolean {
  const texto = entrada.trim();
  if (!/^https?:\/\//i.test(texto)) return false;
  if (!esHostDeGoogle(texto)) return false;
  return extraerPlaceId(texto) === null;
}

/**
 * Sigue los redirects de un link corto de Maps hasta la URL larga.
 * Solo salta entre hosts de Google, así que no sirve para alcanzar otra cosa.
 */
export async function expandirLinkCorto(
  entrada: string,
  maxSaltos = 5,
): Promise<string | null> {
  let actual = entrada.trim();

  for (let i = 0; i < maxSaltos; i++) {
    if (!esHostDeGoogle(actual)) return null;

    let res: Response;
    try {
      res = await fetch(actual, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; nfc-redirect)" },
      });
    } catch {
      return null;
    }

    const location = res.headers.get("location");
    if (!location) return extraerPlaceId(actual) ? actual : null;

    actual = new URL(location, actual).toString();
    if (extraerPlaceId(actual)) return actual;
  }

  return null;
}

/**
 * Punto de entrada: recibe lo que el admin pegó y devuelve el link de reseñas,
 * o null si eso no era un lugar de Google.
 */
export async function aLinkDeResena(entrada: string): Promise<string | null> {
  const directo = extraerPlaceId(entrada);
  if (directo) return linkDeResena(directo);

  if (necesitaExpandirse(entrada)) {
    const largo = await expandirLinkCorto(entrada);
    const placeId = largo ? extraerPlaceId(largo) : null;
    if (placeId) return linkDeResena(placeId);
  }

  return null;
}
