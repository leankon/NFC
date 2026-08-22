import "server-only";

type Entrada = { intentos: number; hasta: number };

const VENTANA_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 8;

const memoria = new Map<string, Entrada>();

/**
 * Límite muy simple en memoria para los formularios de login.
 * No es infalible en serverless (cada instancia tiene su mapa), pero corta
 * los intentos de fuerza bruta más obvios.
 */
export function permitirIntento(clave: string): boolean {
  const ahora = Date.now();
  const actual = memoria.get(clave);

  if (!actual || actual.hasta < ahora) {
    memoria.set(clave, { intentos: 1, hasta: ahora + VENTANA_MS });
    return true;
  }

  actual.intentos += 1;
  return actual.intentos <= MAX_INTENTOS;
}

export function limpiarIntentos(clave: string): void {
  memoria.delete(clave);
}
