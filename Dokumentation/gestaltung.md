# Gestaltung

## Leitbild

Das Archiv wird nicht gelesen, sondern durchgesehen – wie ein Kontaktbogen im
Fotoarchiv. Daraus folgen: kühles Blaupausenpapier als Grund, ein einziger
warmer Akzent in der Art eines Archivstempels, klare Kanten statt weicher
Rundungen und Zahlen in Tabellenziffern.

## Farbe

| Rolle | Hell | Dunkel |
| --- | --- | --- |
| Grund | `#EDEFF3` | `#0F131A` |
| Fläche (Karte, Dialog) | `#FFFFFF` | `#171C24` |
| Tinte / zweite / dritte Stufe | `#141A24` / `#4A5769` / `#77839A` | `#E8ECF2` / `#A9B4C3` / `#7B8698` |
| Linie / starke Linie | `#D6DBE4` / `#B4BECD` | `#29313D` / `#3B4553` |
| Akzent (Stempel) | `#B4432B` | `#DD7B60` |
| Serie „Vorher“ | `#2C6FA8` | `#4E92CE` |
| Serie „Nachher“ | `#B4432B` | `#D96F52` |
| Status gut / prüfend / ruhend | `#1E7A5A` / `#8A6110` / `#57626F` | `#52C199` / `#D7A445` / `#8B95A5` |

**Statusfarben sind vom Akzent getrennt** und treten nie allein auf: jede
Statusmarke trägt Symbol und Wort. Ebenso im Kennzahlenvergleich – die Farbe
benennt die Aufnahme, die Bewertung steht als Vorzeichen daneben.

Die beiden Serienfarben wurden mit dem Palettenvalidator geprüft (helle und
dunkle Fläche getrennt): Helligkeitsband, Buntheit, Unterscheidbarkeit bei
Farbfehlsichtigkeit (ΔE 17,9–18,8 bei Protanopie) und Kontrast zur Fläche
bestehen in beiden Themen.

## Schrift

| Rolle | Schrift | Einsatz |
| --- | --- | --- |
| Auszeichnung | Archivo 600/700 | Titel, Kennzahlwerte, Abschnittsmarken |
| Fließtext | IBM Plex Sans 400/500/600 | Begründungen, Bedienelemente |
| Technisch | IBM Plex Mono 400/500 | Kennungen, Daten, Werte, Pfade, Tastenkürzel |

Die Mono-Schrift trennt sichtbar, was aus dem System kommt (Kennung, Pfad,
Datum, Messwert), von dem, was ein Mensch geschrieben hat (Titel, Begründung).
Alle drei Familien kommen von `fonts.googleapis.com`, mit echter Ersatzkette.

## Layout

Zweispaltig ab 900 px: links die mitlaufende Filterleiste, rechts das
Belegraster (`auto-fill, minmax(340px, 1fr)`). Darüber Kopfzeile mit Suche und
die Kennzahlenleiste. Die Detailansicht ist ein `<dialog>` mit Vergleichsbühne
links und Begründungsblatt rechts; unter 940 px stapeln sie sich.

## Bewegung

Sparsam: Karten heben sich beim Überfahren um 2 px, der Dialog blendet ein, die
Trennkante folgt dem Regler. Unter `prefers-reduced-motion: reduce` entfällt
alles davon.

## Barrierefreiheit

* Sichtbarer Tastaturfokus in Akzentfarbe, Sprungmarke zu den Belegen.
* Karten sind mit `Enter`/`Leertaste` bedienbar und beschriftet.
* Der Vergleichsregler ist ein echtes `<input type="range">` mit Beschriftung –
  damit auch per Pfeiltaste bedienbar.
* Jede Aufnahme trägt `role="img"`, `aria-label` und einen `<title>`.
* Trefferzahl als `aria-live`-Bereich.
* Kontrast im dunklen Thema wird im Test gegen 7:1 geprüft.
