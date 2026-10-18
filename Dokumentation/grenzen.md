# Grenzen und Wege

Was diese Seite nicht kann, warum – und was statt dessen geht. Die Seite zeigt
dieselben Angaben gemessen unter **Ausschneiden → Was hier geht** (F-30).

## Keine Verbindung nach außen

Die veröffentlichte Seite ist ein Artifact: eine einzelne HTML-Datei in einer
Hülle, deren Inhaltsrichtlinie **jede** ausgehende Verbindung sperrt – kein
`fetch`, kein XHR, kein WebSocket, keine externen Bilder oder Skripte. Erlaubt
sind allein die Schriften von Google Fonts.

Daraus folgt unmittelbar:

| gewünscht | möglich? | Weg statt dessen |
| --- | --- | --- |
| Upload nach SharePoint | nein | Ordner wählen, der mit SharePoint oder OneDrive synchronisiert wird – der Sync-Client trägt die Dateien weiter |
| Netzlaufwerk | nein, nicht direkt | dasselbe: ein lokal eingebundener Ordner |
| Datenbank (Supabase o. ä.) | nein | Kontaktbogen oder JSON sichern und dort einlesen |
| Serverseitige Prüfung | nein | die Prüfungen laufen in der Seite, siehe Werkbank (F-29) |

Das ist keine fehlende Funktion, die man nachrüsten könnte: Die Sperre liegt in
der Hülle. Eine eigene Fassung außerhalb des Artifacts hätte diese Grenze
nicht – dafür auch nicht den Vorteil, dass sie ohne Installation überall
läuft.

## Nicht jeder Browser kann alles

| Fähigkeit | Chromium (Chrome, Edge) | Firefox | Safari |
| --- | --- | --- | --- |
| Ordner wählen und still hineinschreiben | ja | nein | nein |
| Einzeln als Datei sichern | ja | ja | ja |
| Bildschirm freigeben | ja, wenn die Hülle es erlaubt | ja | eingeschränkt |
| Zwischenablage einfügen | ja | ja | ja |

Fehlt die Ordnerwahl, bleiben Eingang und Einzeldatei; alle Metadaten gehen
dann über den Beipackzettel oder den Kontaktbogen mit.

## Telefon und Tablet

Bildschirmfreigabe gibt es dort nicht – das ist eine Grenze des Geräts. Der
Weg: Bildschirmfoto mit der Systemtaste, dann **Bild öffnen** oder einfügen.
Trägt das Bild bereits einen Beipackzettel (ab 1.15.0), füllen sich die leeren
Felder von selbst.

## Der Eingang liegt im Browser

Die Metadaten der Aufnahmen stehen im `localStorage` dieses Geräts, die
Vorschauen, die Bilder in voller Auflösung und die Ordnerzugriffe in der
Browserdatenbank (seit 1.34.0). Wer die Browserdaten löscht, löscht den
Eingang. Dauerhaft
wird eine Aufnahme erst, wenn sie in einem Ordner oder einer Datei liegt –
darum gibt es die Ablage, den Beipackzettel und den Rückweg in den Eingang.

## Von Mensch zu Mensch nur als Datei

Zwei Browser kennen einander nicht, und die Seite erreicht kein Netz. Der Weg
zwischen zwei Menschen ist darum die **Projektdatei** (F-63): ein ZIP mit
allem darin, das der andere in seinem Browser einliest. Gleichzeitiges
Arbeiten am selben Bestand gibt es nicht – wer ergänzt, bekommt beim Einlesen
neue Kennungen für das, was doppelt ist.

## Der Bestand bleibt im Projekt

`data/eintraege.json` kann die Seite nicht schreiben. Der Belegentwurf (F-29)
ist der Übergabepunkt: eine Datei im Format des Bestands, die im Projekt
eingepflegt wird – dort entstehen auch die gezeichneten Aufnahmen aus Archetyp
und Schaltern. Der Skill `beleg-aufnehmen` beschreibt die Schritte.

## PDF-Seiten werden nicht gezeichnet

Der Import (ab 1.24.0) liest aus einer PDF-Datei die **eingebetteten
JPEG-Bilder** – bei Unterlagen aus Screenshots ist das der Normalfall. Eine
ganze **Seite** als Bild zu zeichnen ist etwas anderes: dafür bräuchte es
einen PDF-Zeichner. Ein fremdes Skript lässt die Inhaltsrichtlinie des
Artifacts nicht zu, und ein selbstgebauter Zeichner wäre schlechter als gar
keiner. Der Weg: die Seite im PDF-Betrachter als Bild exportieren und das Bild
importieren.

Ebenso übergangen werden **EMF** und **WMF** aus Office-Dateien – der Browser
zeigt diese Vektorformate nicht. Sie werden namentlich genannt, nicht still
weggelassen. Und `.ppt`, `.doc`, `.xls` sind keine ZIP-Archive: ein Speichern
als `.pptx` bzw. `.docx` genügt.

## Die Oberfläche ist deutsch, die Unterlagen nicht zwingend

Seit 1.48.0 lassen sich die **Rahmentexte** der erzeugten Unterlagen auf
Englisch stellen (F-66). Die Oberfläche selbst bleibt deutsch – sie bedient
das Team. Und die **Inhalte** werden nicht übersetzt: Titel, Notizen und die
Texte der Gliederung stehen so da, wie sie erfasst wurden. Eine Maschine, die
sie überträgt, würde behaupten, sie verstünde sie; für eine andere Sprache
gibt es die Varianten und die eigenen Texte.

## Satz und Layout macht nicht die Seite

Die Blätter des Studios sind gerechnete Bilder: was dort steht, steht an der
Stelle, an der es gezeichnet wurde. In PDF, Word und PowerPoint wandern sie
als Bild – richtig für den Druck, unveränderlich für den Leser.

Wer **Text** braucht, nimmt das Handbuch: als HTML (F-47) oder als Word-Datei
mit echten Überschriften (F-61). Dort setzt das Programm die Zeilen, nicht
die Seite. Ein eigener Zeilenumbruch mit eingebetteten Schriften wäre ein
zweites Satzprogramm – das baut diese Seite nicht.

## Das Verzeichnis braucht Chromium

Die Galerie in einen lokalen Ordner zu schreiben (ab 1.29.0) setzt den
Ordnerzugriff des Browsers voraus – den gibt es in Chrome und Edge, nicht in
Firefox und Safari. Die Ansicht sagt das, statt stumm zu bleiben, und nennt
den Weg über „Als JSON sichern“ im Eingang. In einen Ordner, der mit
SharePoint oder OneDrive synchronisiert wird, darf geschrieben werden – das
Hochladen macht dann der Synchronisationsdienst, nicht die Seite. Die Seite
selbst erreicht kein Netz.
