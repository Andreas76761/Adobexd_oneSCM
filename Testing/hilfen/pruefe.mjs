/** Minimaler Testbaukasten - keine externen Abhaengigkeiten. */

export function suite(name) {
  const faelle = [];
  return {
    name,
    faelle,
    test(beschreibung, fn) {
      faelle.push({ beschreibung, fn });
    }
  };
}

export class PruefFehler extends Error {}

function scheitere(nachricht, ist, soll) {
  const zusatz =
    arguments.length > 1 ? `\n      erwartet: ${JSON.stringify(soll)}\n      erhalten: ${JSON.stringify(ist)}` : '';
  throw new PruefFehler(nachricht + zusatz);
}

export function wahr(wert, nachricht) {
  if (!wert) scheitere(nachricht || 'Bedingung nicht erfüllt');
}

export function gleich(ist, soll, nachricht) {
  if (ist !== soll) scheitere(nachricht || 'Werte unterschiedlich', ist, soll);
}

export function nahe(ist, soll, toleranz, nachricht) {
  if (Math.abs(ist - soll) > toleranz) scheitere(nachricht || 'Wert außerhalb der Toleranz', ist, soll);
}

export function enthaelt(heuhaufen, nadel, nachricht) {
  if (!String(heuhaufen).includes(nadel)) scheitere(nachricht || `"${nadel}" nicht gefunden`);
}

export function enthaeltNicht(heuhaufen, nadel, nachricht) {
  if (String(heuhaufen).includes(nadel)) scheitere(nachricht || `"${nadel}" sollte nicht vorkommen`);
}

export function tieferGleich(ist, soll, nachricht) {
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  if (a !== b) scheitere(nachricht || 'Strukturen unterschiedlich', ist, soll);
}
