/**
 * Tests del conversor de Google Maps -> link de reseñas (src/lib/google.ts).
 * No toca la red: la conversión es puro cálculo.
 */
import {
  placeIdDesdeFeatureId,
  extraerPlaceId,
  linkDeResena,
  necesitaExpandirse,
  expandirLinkCorto,
  aLinkDeResena,
} from "../src/lib/google.ts";

let fallos = 0;
const check = (nombre, actual, esperado) => {
  const ok = String(actual) === String(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "ok  " : "FALL"} ${nombre}${ok ? "" : `\n       obtuve:   ${actual}\n       esperaba: ${esperado}`}`);
};

// Caso real verificado contra Google: Churros El Topo, Buenos Aires.
const URL_LARGA =
  "https://www.google.com/maps/place/Churros+El+Topo+%23SinTacc/@-34.5677265,-58.4515826,15z/" +
  "data=!4m6!3m5!1s0x95bcb5d08d830731:0x7f50e26552999af3!8m2!3d-34.5675795!4d-58.4551558!16s%2Fg%2F11b6t_f_1r?entry=ttu";
const PLACE_ID = "ChIJMQeDjdC1vJUR85qZUmXiUH8";
const RESENA = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;

check("feature id -> place id",
  placeIdDesdeFeatureId("0x95bcb5d08d830731", "0x7f50e26552999af3"), PLACE_ID);
check("acepta el hex sin el prefijo 0x",
  placeIdDesdeFeatureId("95bcb5d08d830731", "7f50e26552999af3"), PLACE_ID);

check("lo saca de la URL larga de Maps", extraerPlaceId(URL_LARGA), PLACE_ID);
check("lo saca de la forma ftid=",
  extraerPlaceId("https://www.google.com/maps?ftid=0x95bcb5d08d830731:0x7f50e26552999af3"), PLACE_ID);
check("lo saca de un link de reseñas ya armado", extraerPlaceId(RESENA), PLACE_ID);
check("lo saca de place_id= en la query",
  extraerPlaceId(`https://www.google.com/maps/place/?q=place_id:x&place_id=${PLACE_ID}`), PLACE_ID);
check("acepta el place id pelado", extraerPlaceId(PLACE_ID), PLACE_ID);
check("tolera espacios alrededor", extraerPlaceId(`  ${PLACE_ID}  `), PLACE_ID);

check("no inventa nada con una URL cualquiera",
  extraerPlaceId("https://instagram.com/churroseltopo"), null);
check("no inventa nada con texto suelto", extraerPlaceId("Churros El Topo"), null);
check("no inventa nada con el string vacío", extraerPlaceId("   "), null);
check("un cid pelado no alcanza (falta la otra mitad)",
  extraerPlaceId("https://maps.google.com/?cid=9174081365759073011"), null);

check("arma bien el link final", linkDeResena(PLACE_ID), RESENA);

check("el link corto de Maps hay que expandirlo",
  necesitaExpandirse("https://maps.app.goo.gl/abc123"), true);
check("la URL larga no necesita expandirse", necesitaExpandirse(URL_LARGA), false);
check("un host que no es de Google nunca se expande",
  necesitaExpandirse("https://bit.ly/abc123"), false);
check("ni siquiera uno que lo imita",
  necesitaExpandirse("https://maps.app.goo.gl.attacker.com/x"), false);

// La expansión solo salta entre hosts de Google.
check("expandir rechaza un host ajeno",
  await expandirLinkCorto("https://ejemplo.com/x"), null);

check("de punta a punta desde la URL larga", await aLinkDeResena(URL_LARGA), RESENA);
check("de punta a punta desde el place id", await aLinkDeResena(PLACE_ID), RESENA);
check("de punta a punta con algo que no es Maps",
  await aLinkDeResena("https://instagram.com/churroseltopo"), null);

console.log(fallos === 0 ? "\nTodo OK" : `\n${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
