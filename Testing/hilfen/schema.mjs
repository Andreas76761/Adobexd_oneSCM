/**
 * Kleiner JSON-Schema-Pruefer fuer die im Projekt genutzte Teilmenge:
 * type, required, properties, items, enum, pattern, minItems, minLength,
 * minimum, maximum, additionalProperties:false, $ref auf #/$defs/... und
 * format: "date".
 */

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

const typPasst = (wert, typ) => {
  switch (typ) {
    case 'object':
      return wert !== null && typeof wert === 'object' && !Array.isArray(wert);
    case 'array':
      return Array.isArray(wert);
    case 'string':
      return typeof wert === 'string';
    case 'number':
      return typeof wert === 'number' && Number.isFinite(wert);
    case 'integer':
      return Number.isInteger(wert);
    case 'boolean':
      return typeof wert === 'boolean';
    case 'null':
      return wert === null;
    default:
      return true;
  }
};

export function pruefeSchema(wert, schema, wurzel = schema, pfad = '$') {
  const fehler = [];
  const melde = (text) => fehler.push(`${pfad}: ${text}`);

  if (schema.$ref) {
    const ziel = schema.$ref.replace(/^#\//, '').split('/').reduce((o, k) => (o ? o[k] : undefined), wurzel);
    if (!ziel) return [`${pfad}: $ref ${schema.$ref} nicht auflösbar`];
    return pruefeSchema(wert, ziel, wurzel, pfad);
  }

  if (schema.type) {
    const typen = [].concat(schema.type);
    if (!typen.some((t) => typPasst(wert, t))) {
      melde(`Typ ${typen.join('|')} erwartet, ${Array.isArray(wert) ? 'array' : typeof wert} erhalten`);
      return fehler;
    }
  }

  if (wert === null || wert === undefined) return fehler;

  if (schema.enum && !schema.enum.includes(wert)) melde(`Wert "${wert}" nicht im erlaubten Vorrat`);
  if (schema.pattern && typeof wert === 'string' && !new RegExp(schema.pattern).test(wert))
    melde(`"${wert}" passt nicht zu ${schema.pattern}`);
  if (schema.format === 'date' && typeof wert === 'string' && !DATUM.test(wert)) melde(`"${wert}" ist kein Datum`);
  if (schema.minLength && String(wert).length < schema.minLength)
    melde(`mindestens ${schema.minLength} Zeichen erwartet, ${String(wert).length} erhalten`);
  if (typeof wert === 'number') {
    if (schema.minimum !== undefined && wert < schema.minimum) melde(`Wert ${wert} unter Minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && wert > schema.maximum) melde(`Wert ${wert} über Maximum ${schema.maximum}`);
  }

  if (Array.isArray(wert)) {
    if (schema.minItems && wert.length < schema.minItems) melde(`mindestens ${schema.minItems} Einträge erwartet`);
    if (schema.items) wert.forEach((k, i) => fehler.push(...pruefeSchema(k, schema.items, wurzel, `${pfad}[${i}]`)));
  }

  if (typPasst(wert, 'object')) {
    for (const pflicht of schema.required || []) {
      if (!(pflicht in wert)) melde(`Pflichtfeld "${pflicht}" fehlt`);
    }
    for (const [schluessel, unterschema] of Object.entries(schema.properties || {})) {
      if (schluessel in wert) {
        fehler.push(...pruefeSchema(wert[schluessel], unterschema, wurzel, `${pfad}.${schluessel}`));
      }
    }
    if (schema.additionalProperties === false) {
      const erlaubt = Object.keys(schema.properties || {});
      for (const schluessel of Object.keys(wert)) {
        if (!erlaubt.includes(schluessel)) melde(`unbekanntes Feld "${schluessel}"`);
      }
    }
  }

  return fehler;
}
