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

s.test('die Seite macht keine Netzanfrage – auch nicht auf eine Datenadresse', () => {
  // Die Inhaltsrichtlinie des Artifacts weist eine Netzanfrage *stillschweigend*
  // ab. Eine Prüfung über file:// merkt davon nichts: dort gibt es keine
  // Richtlinie, und `fetch('data:…')` gelingt. Genau so stand bis 1.60.0 ein
  // `fetch` im Register Video, das in der veröffentlichten Seite nie gelaufen
  // wäre. Darum hier ein Riegel am Text selbst.
  //
  // Ein Bild wird zum Blob über eine Leinwand (`canvas.toBlob`), nicht über
  // `fetch` – diesen Weg gehen OCR und Video.
  const treffer = [...seite.matchAll(/\b(fetch|XMLHttpRequest|EventSource|WebSocket|sendBeacon|importScripts)\s*\(/g)].map(
    (m) => m[1]
  );
  gleich(
    treffer.join(', '),
    '',
    'die Seite enthält einen Aufruf, der ins Netz greifen würde: ' + treffer.join(', ')
  );
});

s.test('lädt von außen nur erlaubte Schriftquellen', () => {
  const erlaubt = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
  // Eine XML-Namensraum-Kennung ist keine Adresse, die abgerufen wird: sie
  // steht im Skript, das die Beispielquelle als Bild aufbereitet (w3.org),
  // den Prozess als BPMN schreibt (omg.org, bpmn.io) oder ein Word- bzw.
  // PowerPoint-Paket baut (openxmlformats.org, purl.org). Namensräume sind
  // Namen - der Browser lädt sie nicht; abgerufen wird nur, was in src, href
  // oder einem fetch steht, und das prüfen die Zeilen darunter.
  const namensraeume = [
    'http://www.w3.org/',
    'http://www.omg.org/spec/BPMN/',
    'http://www.omg.org/spec/DD/',
    'http://bpmn.io/schema/bpmn',
    'http://schemas.openxmlformats.org/',
    'http://schemas.microsoft.com/',
    'http://purl.org/dc/'
  ];
  const verweise = (seite.match(/https?:\/\/[^"')\s\\]+/g) || []).filter(
    (v) => !namensraeume.some((n) => v.startsWith(n))
  );
  for (const v of verweise) {
    wahr(erlaubt.some((h) => v.startsWith(h)), `nicht erlaubte externe Quelle: ${v}`);
  }
  // Ein <img> im Markup ist erlaubt, solange es nichts von außen lädt: die
  // Vorschau der letzten Aufnahme bekommt ihre Quelle erst zur Laufzeit.
  for (const bild of markup.match(/<img\s[^>]*>/gi) || []) {
    const quelle = (bild.match(/\ssrc=["']([^"']*)["']/i) || [])[1];
    wahr(!quelle || quelle.startsWith('data:'), `Bild lädt von außen: ${bild}`);
  }
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

s.test('die Projektdatei trägt wirklich, was sie zu tragen verspricht (1.82.0)', () => {
  // `PAKET_INHALT` sagt je Speicherschlüssel, ob er mitreist. Geprüft wurde
  // daran bisher nur der **Kern**: dass die Liste alle Schlüssel kennt. Ob
  // die Oberfläche sie auch einpackt und wieder auspackt, prüfte niemand -
  // und `regeln` tat sie nicht. Die Datei zählte „2 Regel(n)" im Bericht und
  // enthielt keine; eingelesen wurde ohnehin nichts.
  const quelle = readFileSync(join(wurzel, 'app', 'src', 'ablage.js'), 'utf8');

  // Was `paketAngaben` entgegennimmt, muss die Oberfläche auch übergeben.
  // Die Namen kommen aus der Signatur des Kerns, nicht aus einer zweiten
  // Liste - eine zweite Liste wäre nur eine zweite Stelle zum Vergessen.
  const kern = readFileSync(join(wurzel, 'app', 'src', 'core.mjs'), 'utf8');
  const signatur = kern.slice(kern.indexOf('export function paketAngaben({'));
  const felder = signatur
    .slice(0, signatur.indexOf('} = {}) {'))
    .split('\n')
    .map((zeile) => (zeile.match(/^\s{2}([a-z]+) =/) || [])[1])
    .filter(Boolean)
    .filter((name) => name !== 'stand' && name !== 'anwendung');
  wahr(felder.length >= 10, 'die Signatur von paketAngaben wurde nicht gelesen: ' + felder.join(', '));

  const anfang = quelle.indexOf('paketAngaben({');
  wahr(anfang > 0, 'ablage.js ruft paketAngaben nicht auf');
  const aufruf = quelle.slice(anfang, quelle.indexOf('});', anfang));
  for (const feld of felder) {
    wahr(
      new RegExp(`(^|[\\s,{])${feld}\\s*[:,]`, 'm').test(aufruf),
      `paketAngaben kennt „${feld}", die Oberfläche übergibt es nicht - es reist nicht mit`
    );
  }

  // Und was mitreist, muss beim Einlesen auch ausgepackt werden.
  for (const feld of ['strecken', 'projekte', 'design', 'ocr', 'wortliste', 'vorgehen', 'texte', 'verzeichnis', 'regeln']) {
    wahr(quelle.includes(`gelesen.${feld}`), `beim Einlesen wird „${feld}" nicht übernommen`);
  }
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

s.test('jede Tinte hat auf jedem Grund genug Kontrast (1.77.0)', () => {
  // Es gab eine Kontrastprüfung, und sie war nicht falsch: sie sah den
  // Grund der Seite gegen die Schrift an, und eine Überschrift. Zwei
  // Stellen. Gemessen über **alle** sichtbaren Texte lagen in der hellen
  // Fassung 798 unter den 4,5:1, die WCAG 2.1 AA verlangt – und fast alle
  // an einem einzigen Token, `--tinte-3`.
  //
  // Hier wird gerechnet statt gemessen: jede Tinte gegen jeden Grund,
  // beide Themen, ohne Browser. Ein Token, das zu blass wird, fällt beim
  // Bauen auf und nicht erst auf einem Bildschirm.
  const leuchte = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const kontrast = (a, b) => {
    const [x, y] = [leuchte(a), leuchte(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const werte = (block) => {
    const karte = {};
    for (const t of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\b/g)) karte[t[1]] = t[2];
    return karte;
  };
  const hell = werte(css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)')));
  const dunkelBlock = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  const dunkel = { ...hell, ...werte(dunkelBlock.slice(0, dunkelBlock.indexOf('}\n}'))) };

  const GRUENDE = ['--grund', '--flaeche', '--flaeche-2', '--flaeche-3'];
  const TINTEN = ['--tinte', '--tinte-2', '--tinte-3'];
  const schwach = [];
  for (const [name, satz] of [['hell', hell], ['dunkel', dunkel]]) {
    for (const t of TINTEN) {
      for (const g of GRUENDE) {
        wahr(satz[t] && satz[g], `${name}: ${t} oder ${g} fehlt`);
        const k = kontrast(satz[t], satz[g]);
        if (k < 4.5) schwach.push(`${name} ${t} (${satz[t]}) auf ${g} (${satz[g]}): ${k.toFixed(2)}:1`);
      }
    }
  }
  gleich(schwach.length, 0, 'unter 4,5:1 nach WCAG 2.1 AA –\n  ' + schwach.join('\n  '));
});

s.test('kein Gitter ist breiter als der Bildschirm (1.76.0)', () => {
  // `repeat(auto-fit, minmax(380px, 1fr))` ist eine Spalte von **mindestens**
  // 380 px - auch dann, wenn nur 374 da sind. Auf einem Telefon schiebt
  // man die Seite dann waagerecht, um Text zu lesen.
  //
  // `minmax(min(380px, 100%), 1fr)` ändert nichts, wo der Platz reicht,
  // und lässt die Spalte schrumpfen, wo er fehlt. Gemessen bei 320 px:
  // vier Ansichten scrollten quer, danach keine.
  const starr = [...css.matchAll(/repeat\((?:auto-fit|auto-fill),\s*minmax\((\d+)px/g)].map((m) => m[0]);
  gleich(
    starr.length,
    0,
    'diese Gitter können breiter werden als das Fenster: ' + starr.join(' | ')
  );
  // Und es gibt sie wirklich - sonst prüfte der Riegel nichts.
  const weich = [...css.matchAll(/repeat\((?:auto-fit|auto-fill),\s*minmax\(min\(/g)];
  wahr(weich.length >= 15, 'die Gitter wurden nicht gefunden: ' + weich.length);
});

s.test('kein Selektor ist doppelt gesetzt', () => {
  // Zwei gleiche Blöcke heißen: eine Bearbeitung hat sich verdoppelt, und der
  // spätere Block hebt den früheren still auf.
  const selektoren = [...css.matchAll(/^([.#][a-z0-9_-]+)\s*\{/gm)].map((m) => m[1]);
  const doppelt = selektoren.filter((sel, i) => selektoren.indexOf(sel) !== i);
  gleich(doppelt.length, 0, 'mehrfach gesetzte Selektoren: ' + [...new Set(doppelt)].join(', '));
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
