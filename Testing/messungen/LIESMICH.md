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

### `kette.mjs`

Lässt die ganze Kette einmal durchlaufen – Film, Abtastung, Texte, Strecke,
Designstudio – und legt den fertigen **Quick Guide als PDF** hin.

```bash
node Testing/messungen/kette.mjs <ordner mit film.webm> [zielordner]
```

Dieser Durchlauf hat in 1.63.0 gezeigt, dass die Bilder im Blatt unlesbar
waren: alles strukturell richtig, und doch unbrauchbar. Das sieht man nur,
wenn man die PDF **ansieht**.

### `word.mjs`

Dasselbe für **Word und PowerPoint**: die Kette läuft bis zum Output,
sichert `.docx` und `.pptx` und legt sie zum Ansehen hin.

```bash
node Testing/messungen/word.mjs <ordner mit film.webm> [zielordner]
```

Bei Word ist „Text bleibt Text" das ganze Versprechen (F-61), und der
Rückweg aus Word (F-65) hängt daran: was keine Überschrift ist, findet nicht
zurück in die Gliederung. Angesehen wird mit LibreOffice:

```bash
soffice --headless --convert-to pdf <datei> --outdir <ordner>
pdftoppm -r 100 -png <datei>.pdf seite
```

### `rueckweg.mjs`

Der **Umlauf**: eine Word-Datei, die die Seite selbst geschrieben hat,
unverändert wieder hineingeben.

```bash
node Testing/messungen/rueckweg.mjs <handbuch.docx>            # unverändert
node Testing/messungen/rueckweg.mjs <handbuch.docx> --aendern  # eine Änderung
```

Wer nichts ändert, darf keine Änderung angeboten bekommen – und wer eine
ändert, genau eine. Nur wenn beide Hälften stimmen, ist der Rückweg (F-65)
in Ordnung. Gepackt und entpackt wird mit den Werkzeugen der Seite selbst.

### `einfuhr.mjs`

Der Umlauf **durch das Register Import**: eine Office-Datei, die die Seite
selbst geschrieben hat, wieder hineingeben.

```bash
node Testing/messungen/einfuhr.mjs <datei.docx|.pptx> [weitere …]
```

Gezählt wird, wie viele Bilder ankommen, wie viele **verschiedene** Texte sie
tragen und wie viele **verschiedene** Stellen daraus werden. Die Zahl der
verschiedenen Texte ist die eigentliche Frage: trägt jedes Bild seinen
eigenen Text oder alle denselben?

### `netzseite.mjs`

Die **drei HTML-Ausgaben** – das ganze Handbuch (F-55), die Blätter zum
Drucken und das Format HTML im Register Output (F-56) – an echtem
Bildschirminhalt, auf Deutsch und auf Englisch.

```bash
node Testing/messungen/netzseite.mjs <ordner mit film.webm> [zielordner]
```

Bei HTML sind die Fragen andere als bei PDF. Die wichtigste: **öffnet sich
die Datei ohne Netz?** Dafür wird jede Anfrage abgewiesen, die nicht die
Datei selbst ist, und genannt – eine Seite, die eine Schrift oder ein Bild
nachlädt, ist im Haus hinter der Firewall leer. Dazu: trägt das Dokument
die Sprache, in der es geschrieben ist, und haben die Bilder einen Text?

### `fehlschlag.mjs`

Was die Register tun, wenn Claude **nicht** antwortet.

```bash
node Testing/messungen/fehlschlag.mjs [ordner mit film.webm]
```

Ohne den Ordner bleibt das Register Video aus – es braucht einen Film, und
ohne ihn ist sein Knopf zu Recht gesperrt. Für OCR legt der Prüfstand sich
sein Bild selbst an.

Vier Register fragen Claude über `sample`. Der Vertrag kennt mehrere
Ausgänge – die Fähigkeit fehlt, `not_granted`, `rate_limited`, eine leere
Antwort –, und die Prüfungen nahmen bisher nur den guten Fall. Gefragt
wird je Register und je Ausgang: sagt die Seite, was los ist; ist der
Knopf danach wieder offen; bleibt die Seite fehlerfrei.

### `ordner.mjs`

Was das Register Verzeichnis **wirklich** auf die Platte legt.

```bash
node Testing/messungen/ordner.mjs <ordner mit film.webm> [zielordner]
```

Die Browserpruefung haelt von jeder Datei nur Pfad, Groesse und Typ fest;
dieser Pruefstand schreibt den Ordner wirklich und zeigt den Baum samt
Beipackzettel und Uebersicht. Nur so sieht man, was in den Dateien steht.

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

## Was dabei herauskam (1.65.0)

Word und PowerPoint zum ersten Mal **angesehen**, an elf Schritten aus dem
Film:

| | Ergebnis |
| --- | --- |
| Handbuch als `.docx` | 615 kB, 68 Absätze, 2 × Heading1, 3 × Heading2, 11 × Heading3, 11 Bildunterschriften, 11 eingebettete JPEGs, 7 A4-Seiten |
| Bildschirmablauf als `.pptx` | 3 Folien im A4-Hochmaß, je ein Blatt als Bild |

An den Dateien war **nichts zu beanstanden** – die Überschriftenebenen
stehen wirklich im Dokument, die Rahmen sind sichtbar, die Bilder lesbar.
Das ist auch ein Ergebnis und wird hier so festgehalten.

Gefunden wurde etwas anderes, auf dem Weg dorthin: das Register **Output**
stand in einer Sackgasse. Die Vorgabe war Achse „Sprache" ohne Werte, und
`ausgabePlan` verlangt Werte – Vorlage und Inhalt zu wählen genügte nie,
während der Hinweis die Achse „wenn gewünscht" nannte. Behoben in 1.65.0.

## Was dabei herauskam (1.66.0)

Der Umlauf, zum ersten Mal gefahren:

| | vorher | nachher |
| --- | --- | --- |
| unverändert zurück | **15 von 15** als geändert angeboten | 0 |
| vorangekreuzt | 15 | 0 |
| mit einer Änderung | – | genau 1, das richtige Feld |

Die Ursache war ein Absatz ohne Namen: der Quellhinweis stand im Word als
gewöhnlicher Absatz da, und der Leser kannte nur Überschrift und
Bildunterschrift als „kein Text der Stelle".

Der Befund kam nicht aus einer Lücke in den Prüfungen, sondern aus dem Raum
**zwischen** zweien. Schreiber und Leser waren jeder für sich geprüft, seit
1.47.0. Den Weg über beide ging nie jemand.

## Was dabei herauskam (1.67.0)

Dieselbe Word-Datei, diesmal durch den **Import**:

| mit dem eigenen Handbuch | vorher | nachher |
| --- | --- | --- |
| Bilder | 11 | 11 |
| verschiedene Texte je Bild | **1** | **11** |
| verschiedene Stellen | **1** (alle 7.5) | **11** |

Die Meldung lautete vorher „11 von 11 Bild(ern) eine Stelle zugeordnet" –
ohne Einschränkung, und zehn davon falsch. Eine Fehlmeldung ist schlimmer
als keine Zuordnung.

Dass es niemandem auffiel, lag an der Prüfdatei: sie trug **ein** Bild und
**einen** Satz. Bei einem Bild ist „der Text des Dokuments" und „der Text
neben dem Bild" dasselbe. Der Unterschied beginnt beim zweiten. Eine
Prüfdatei mit einem Element prüft die Zahl eins, nicht die Regel.

## Was dabei herauskam (1.69.0)

Alle drei HTML-Ausgaben, einmal deutsch und einmal englisch:

| | Befund |
| --- | --- |
| von draußen geholt | **nichts** – jede Datei steht für sich |
| Handbuch | 11 von 11 Bildern, 16 Überschriften, 6085 Zeichen Text |
| Blätter und Output | Bilder, kein Text – so gebaut, kein Fehler |
| Sprache am Dokument | war bei zweien **immer `de`** |

Dass keine Prüfung das sah, lag am Nachbau: `downloads.save` nimmt laut
Vertrag auch eine **Zeichenkette**, und die Blätter zum Drucken geben genau
die. Der Nachbau kannte nur `data.text()` – eine Zeichenkette ließ ihn
scheitern, und damit konnte keine Prüfung je in diese Datei hineinsehen.

**Ein Nachbau, der enger ist als der Vertrag, verbirgt Code.**

Beim Messen selbst noch ein Stolperstein, zum zweiten Mal in dieser Reihe:
die Meldung *während* des Rechnens heißt „… wird gerechnet – 1 von 3 …" und
enthält dasselbe Wort wie die Meldung danach. Wer auf `/gerechnet/` wartet,
drückt zu früh. Drei Browserprüfungen taten das und kamen bisher damit
durch, weil die Rechnung dort schnell ist.

## Was dabei herauskam (1.70.0)

Die **Fehlerwege waren in Ordnung** – kein hängender Lauf, kein gesperrter
Knopf, keine stumme Seite. Gefunden wurde ein Fehler im **guten** Fall:

| Frage: „Zeig mir die Formulare auf Englisch" | gefiltert nach |
| --- | --- |
| ohne Claude | Sprache Englisch, Text „formulare" |
| mit Claude (vorher) | Sprache Englisch |
| mit Claude (nachher) | Sprache Englisch, Text „formulare" |

Die Antwort war nicht falsch: `{sprache:'en', text:''}` – Sprache richtig
erkannt, `text` leer. Genau die wahrscheinlichste Antwort. Der Schutz
„Claude darf ergänzen, nicht widersprechen" galt nur für die fünf Felder
mit festem Vokabular; `text`, `markt` und `grenze` kamen ungeprüft durch.

Wer so denkt, schützt, was sich prüfen lässt – und übersieht, dass ein
freies Feld genauso verloren gehen kann.

## Was dabei herauskam (1.71.0)

OCR und Video nachgeholt – in 1.70.0 ausdrücklich liegen geblieben. Drei
Befunde, alle derselben Art: **Meldungen, die nicht stimmen.**

| Register | Ausgang | stand da | richtig |
| --- | --- | --- | --- |
| OCR | abgewiesen | „0 von 1 gelesen, 1 nicht." | Grund voran, dann die Zahl |
| OCR | leere Antwort | „1 von 1 gelesen." | nichts gelesen – **und der vorhandene Text war gelöscht** |
| Video | leere Antwort | „… wird gedeutet …" | der Lauf war längst vorbei |

Keiner saß in der Fehlerbehandlung, sondern **dahinter**. Die Fangzweige
waren sorgfältig geschrieben; im OCR überschrieb die Schlusszeile ihre
Meldung eine Zeile später wieder. Was fehlte, war der Blick auf die Zeile,
die danach läuft.

## Was dabei herauskam (1.73.0)

Der geschriebene Ordner, zum ersten Mal gelesen. Baum und Namen stimmten;
im Beipackzettel stand:

```json
{ "bild": "AUF-2026-001.png", ... }
```

Die Datei daneben hiess
`2026-10-27-auf-2026-001-servicevertrag-anlegen-01-00m00s2.png`. Der Zettel
nannte eine Datei, die es in seinem Ordner nicht gibt.

Dass es niemandem auffiel, lag wieder am Nachbau: er hielt Pfad, Groesse
und Typ fest - **nicht den Inhalt**. Was nicht festgehalten wird, laesst
sich nicht pruefen.

Und ein Stolperstein beim Pruefen selbst: `Blob.text()` entfernt ein
fuehrendes BOM. Das ist die UTF-8-Dekodierung der Spezifikation und kein
Fehler - wer wissen will, ob das BOM in der Datei steht, muss die Bytes
ansehen. Die erste Fassung der Pruefung fiel genau darauf herein und
meldete einen Fehler, den es nicht gab.
