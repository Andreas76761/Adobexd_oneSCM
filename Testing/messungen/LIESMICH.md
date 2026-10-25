# Messungen

Hier steht, was sich **messen** lässt, statt es zu schätzen. Die Prüfungen
im Ordner daneben sagen *ob etwas funktioniert*; diese Skripte sagen *wie
gut*. Sie laufen **nicht** im `npm test`-Durchlauf – sie dauern Minuten und
brauchen `ffmpeg`.

## Warum es sie gibt

Das Register Video (F-72) hatte drei Regler mit Voreinstellungen, die
geraten waren. Auf die Frage „sind die richtig?“ gab es keine Antwort,
weil kein Film da war, bei dem man **weiß**, wann sich etwas ändert.

## Die Werkzeuge

### `erzeuge-film.mjs`

Baut einen Bildschirmfilm einer oneSCM-ähnlichen Maske (`maske.html`,
1280 × 720): Felder werden ausgefüllt, eine Auswahlliste klappt auf, eine
Tabelle lädt, ein Dialog erscheint, ein Reiter wechselt – und ein Mauszeiger
wandert ständig umher, ohne dass sich etwas ändert.

```bash
node Testing/messungen/erzeuge-film.mjs <zielordner>
```

Heraus kommen `film.webm` und `wahrheit.json` mit den **zehn echten
Änderungen** und ihren Zeiten. Der Film entsteht aus echten
Bildschirmfotos, die ffmpeg zusammensetzt – ein Mitschnitt aus der Seite
heraus (Leinwand + MediaRecorder) zeichnet die Maske *nicht* mit, dabei kam
ein leerer Hintergrund mit Mauszeiger heraus.

### `miss-abtastung.mjs`

Lässt die **fertige Seite** den Film abtasten, in jeder Kombination von
Abtastdichte und Schwelle, und zählt: gefunden, verpasst, zusätzlich.

```bash
node Testing/messungen/miss-abtastung.mjs <ordner mit film.webm>
```

### `miss-kern.mjs`

Dasselbe an der Kernlogik, ohne Browser, mit ffmpeg als Bildquelle – dafür
auch über die Vergleichsbreite und den Punktabstand. Trennt die Frage
„rechnet der Kern richtig?“ von „macht die Seite das Richtige daraus?“.

## Was dabei herauskam (1.62.0)

| | vorher | nachher |
| --- | --- | --- |
| Voreinstellung | 2 % | **0,2 %** |
| gefunden von 10 | 3 | **10** |
| Bilder | 4 | 11 |

Zwei Befunde, beide hätte man nicht erraten:

1. **Die Schwellen waren eine Größenordnung zu hoch.** Ein ausgefülltes Feld
   ist in einer Maske von 1280 × 720 nur **zwei Promille** der Fläche. Bei
   2 % fand die Abtastung nur, was eine halbe Maske verändert.
2. **Der Browser verlor beim Verkleinern die Schrift.** 1280 px in einem
   Schritt auf 192 heißt: Punkte abtasten statt mitteln – dünne Schrift
   verschwindet spurlos. Stufenweises Halbieren behebt das. Vorher 8 von 10,
   danach 10 von 10.

Und ein Befund, der nichts brachte: zusätzlich auf ein *dargestelltes* Bild
zu warten (`requestVideoFrameCallback`) änderte **kein einziges Ergebnis**,
kostete aber bis zu 120 ms je Abtaststelle. Wieder entfernt.

## Mit einem echten Film

Wer einen eigenen Mitschnitt hat, legt ihn als `film.webm` (oder `.mp4`) in
einen Ordner und schreibt die echten Änderungen von Hand in `wahrheit.json`:

```json
{ "dauer": 42.5, "aenderungen": [ { "zeit": 3.2, "was": "Maske geöffnet" } ] }
```

Dann sagt `miss-abtastung.mjs`, welche Einstellung für **dieses** Material
taugt. Das ist der ehrlichste Weg zu Voreinstellungen – und der einzige, den
ein synthetischer Film nicht ersetzt.
