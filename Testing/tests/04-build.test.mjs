/** Prueft das Ergebnis des Builds - genau die Datei, die veroeffentlicht wird. */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { suite, wahr, gleich } from '../hilfen/pruefe.mjs';

const wurzel = join(import.meta.dirname, '..', '..');
const seitenPfad = join(wurzel, 'dist', 'index.html');
const daten = JSON.parse(readFileSync(join(wurzel, 'data', 'eintraege.json'), 'utf8'));
const css = readFileSync(join(wurzel, 'app', 'src', 'styles.css'), 'utf8');

const s = suite('Build');
const seite = existsSync(seitenPfad) ? readFileSync(seitenPfad, 'utf8') : '';

/**
 * Nur das Markup, das der Browser als HTML liest - ohne den Skriptbereich.
 * Im Skript stehen Zeichenfolgen wie "<!doctype" und "<img", weil dort der
 * Kontaktbogen zum Herunterladen erzeugt wird; für die Seite selbst gelten
 * die Regeln unverändert.
 */
const markup = (() => {
  const anfang = seite.indexOf('<script>');
  const ende = seite.lastIndexOf('</script>');
  if (anfang < 0 || ende < 0) return seite;
  return seite.slice(0, anfang) + seite.slice(ende + '</script>'.length);
})();

s.test('dist/index.html existiert und ist aktuell', () => {
  wahr(existsSync(seitenPfad), 'dist/index.html fehlt – "npm run build" ausführen');
  const vorher = readFileSync(seitenPfad, 'utf8');
  execFileSync(process.execPath, [join(wurzel, 'app', 'build', 'build.mjs')], { cwd: wurzel });
  gleich(readFileSync(seitenPfad, 'utf8'), vorher, 'der Build erzeugt ein anderes Ergebnis als die abgelegte Datei');
});

s.test('trägt einen eigenen Namen im Titel', () => {
  const treffer = seite.match(/<title>([^<]+)<\/title>/);
  wahr(treffer, '<title> fehlt – das Artifact bekäme sonst den Dateinamen');
  wahr(treffer[1].trim().length > 3 && treffer[1].length < 60, 'Titel ist kein kurzer Name');
  wahr(seite.indexOf('<title>') < 8192, 'Titel steht außerhalb der ersten 8 kB und wird nicht gefunden');
});

s.test('enthält keine Gerüst-Tags, die das Artifact selbst ergänzt', () => {
  // <header> darf vorkommen, <head> nicht - deshalb auf das Tag-Ende prüfen.
  for (const tag of ['<!doctype', '<html[\\s>]', '<head[\\s>]', '<body[\\s>]']) {
    wahr(!new RegExp(tag, 'i').test(markup), `${tag} darf nicht in der Datei stehen`);
  }
});

s.test('kein Platzhalter blieb stehen', () => {
  const rest = seite.match(/\/\*%[A-Z]+%\*\//g);
  wahr(!rest, 'nicht ersetzte Platzhalter: ' + (rest || []).join(', '));
});

s.test('lädt von außen nur erlaubte Schriftquellen', () => {
  const erlaubt = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
  // Die XML-Namensraum-Kennung ist keine Adresse, die abgerufen wird: sie steht
  // im Skript, das die Beispielquelle als Bild aufbereitet.
  const namensraum = 'http://www.w3.org/';
  const verweise = (seite.match(/https?:\/\/[^"')\s\\]+/g) || []).filter((v) => !v.startsWith(namensraum));
  for (const v of verweise) {
    wahr(erlaubt.some((h) => v.startsWith(h)), `nicht erlaubte externe Quelle: ${v}`);
  }
  wahr(!/<img\s/i.test(markup), 'externe Bilder werden im Artifact blockiert – Aufnahmen müssen inline sein');
  // Bilder entstehen zur Laufzeit; keines davon darf von außen kommen.
  wahr(!/src=["']https?:/i.test(seite), 'eine Quelle verweist nach außen');
});

s.test('alle Belege und Aufnahmen sind eingebettet', () => {
  for (const e of daten.eintraege) {
    wahr(seite.includes(`"${e.id}"`), `${e.id}: fehlt in der Seite`);
  }
  const svgs = (seite.match(/<svg /g) || []).length;
  wahr(svgs >= daten.eintraege.length * 2, `nur ${svgs} Aufnahmen eingebettet`);
});

s.test('das Skript ist als ein Block lauffähig (keine Module-Reste)', () => {
  const skript = seite.slice(seite.indexOf('<script>'));
  wahr(!/^\s*export\s/m.test(skript), 'export-Anweisung im eingebetteten Skript');
  wahr(!/\bimport\s+.*\bfrom\b/.test(skript), 'import-Anweisung im eingebetteten Skript');
  wahr(skript.includes('const DATEN ='), 'Datenblock fehlt');
});

s.test('der Skriptbereich ist die einzige Stelle mit Dokumentgerüst', () => {
  // Der Kontaktbogen zum Herunterladen ist ein vollständiges Dokument - er darf
  // nur als Zeichenfolge im Skript vorkommen, nie als Markup der Seite.
  wahr(seite.includes('<!doctype html>'), 'der Kontaktbogen-Erzeuger fehlt');
  gleich((markup.match(/<!doctype/gi) || []).length, 0);
});

s.test('nennt die Version der Anwendung', () => {
  const paket = JSON.parse(readFileSync(join(wurzel, 'package.json'), 'utf8'));
  wahr(seite.includes('v' + paket.version), `Version ${paket.version} steht nicht in der Seite`);
});

s.test('bleibt deutlich unter der Größengrenze des Artifacts', () => {
  const mb = statSync(seitenPfad).size / 1024 / 1024;
  wahr(mb < 16, `Seite ist ${mb.toFixed(1)} MB groß`);
  wahr(mb < 4, `Seite ist mit ${mb.toFixed(1)} MB unnötig schwer`);
});

s.test('Farbwerte sind vollständig im hellen Grundzustand definiert', () => {
  // Nur echte Deklarationen zählen - "--x:" in einem Selektor wie
  // .knopf--haupt:hover ist keine Farbfestlegung.
  const deklarationen = (text) =>
    [...text.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]);
  const grund = css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)'));
  const definiert = new Set(deklarationen(grund));
  const dunkel = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  const nurDunkel = deklarationen(dunkel).filter((t) => !definiert.has(t));
  gleich(nurDunkel.length, 0, 'nur im dunklen Thema definiert: ' + nurDunkel.join(', '));
  // var(--x, ersatz) darf aus dem Skript kommen; var(--x) ohne Ersatz nicht.
  const ohneErsatz = new Set([...css.matchAll(/var\((--[a-z0-9-]+)\s*\)/g)].map((m) => m[1]));
  const fehlend = [...ohneErsatz].filter((t) => !definiert.has(t));
  gleich(fehlend.length, 0, 'ohne Ersatzwert benutzt, aber nirgends definiert: ' + fehlend.join(', '));
});

s.test('beide Umschaltwege des dunklen Themas sind gesetzt', () => {
  wahr(css.includes(':root:not([data-theme="light"])'), 'Systemvorgabe dunkel ist nicht abgesichert');
  wahr(css.includes(':root[data-theme="dark"]'), 'ausdrückliche Wahl dunkel fehlt');
  wahr(/body\s*{[^}]*background:\s*var\(--grund\)/.test(css), 'body ohne eigenen Hintergrund aus dem Token');
});

s.test('Bewegung lässt sich abschalten und Fokus bleibt sichtbar', () => {
  wahr(css.includes('@media (prefers-reduced-motion: reduce)'), 'keine Rücksicht auf reduzierte Bewegung');
  wahr(css.includes(':focus-visible'), 'kein sichtbarer Tastaturfokus');
});

export default s;
