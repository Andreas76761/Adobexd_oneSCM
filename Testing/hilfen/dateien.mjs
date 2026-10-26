/**
 * Testdateien, die es ohne Fremdwerkzeug nicht gibt: ein echtes PNG, ein
 * echtes ZIP (und damit ein PPTX) und eine PDF-Datei mit eingebettetem
 * JPEG-Block. Alles wird hier gebaut, damit die Pruefungen ohne
 * Beispieldateien im Repo auskommen.
 */
import { deflateSync, deflateRawSync } from 'node:zlib';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/* ------------------------------------------------------------------ CRC32 */

const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABELLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* --------------------------------------------------------------------- PNG */

function pngBlock(art, inhalt) {
  const name = Buffer.from(art, 'ascii');
  const kopf = Buffer.alloc(4);
  kopf.writeUInt32BE(inhalt.length, 0);
  const pruef = Buffer.alloc(4);
  pruef.writeUInt32BE(crc32(Buffer.concat([name, inhalt])), 0);
  return Buffer.concat([kopf, name, inhalt, pruef]);
}

/** Ein echtes PNG in voller Farbe - gestreift, damit man es wiedererkennt. */
export function baueTestPng(breite = 320, hoehe = 200) {
  const zeilen = [];
  for (let y = 0; y < hoehe; y++) {
    const zeile = Buffer.alloc(1 + breite * 3);
    for (let x = 0; x < breite; x++) {
      const streifen = Math.floor(x / 20) % 2 === 0;
      zeile[1 + x * 3] = streifen ? 180 : 32;
      zeile[2 + x * 3] = streifen ? 68 : 40;
      zeile[3 + x * 3] = streifen ? 43 : 52;
    }
    zeilen.push(zeile);
  }
  const kopf = Buffer.alloc(13);
  kopf.writeUInt32BE(breite, 0);
  kopf.writeUInt32BE(hoehe, 4);
  kopf[8] = 8; // Bittiefe
  kopf[9] = 2; // Farbtyp: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngBlock('IHDR', kopf),
    pngBlock('IDAT', deflateSync(Buffer.concat(zeilen))),
    pngBlock('IEND', Buffer.alloc(0))
  ]);
}

/* --------------------------------------------------------------------- ZIP */

/**
 * Ein ZIP aus Einträgen `{ name, inhalt, gepackt }`. Gepackt heißt Deflate -
 * genau das Verfahren, das Office benutzt und das die Seite auspacken muss.
 */
export function baueZip(eintraege) {
  const stuecke = [];
  const verzeichnis = [];
  let lage = 0;
  for (const e of eintraege) {
    const roh = Buffer.isBuffer(e.inhalt) ? e.inhalt : Buffer.from(String(e.inhalt), 'utf-8');
    const gepackt = e.gepackt === false ? roh : deflateRawSync(roh);
    const verfahren = e.gepackt === false ? 0 : 8;
    const name = Buffer.from(e.name, 'utf-8');
    const pruef = crc32(roh);

    const kopf = Buffer.alloc(30);
    kopf.writeUInt32LE(0x04034b50, 0);
    kopf.writeUInt16LE(20, 4);
    kopf.writeUInt16LE(verfahren, 8);
    kopf.writeUInt32LE(pruef, 14);
    kopf.writeUInt32LE(gepackt.length, 18);
    kopf.writeUInt32LE(roh.length, 22);
    kopf.writeUInt16LE(name.length, 26);
    stuecke.push(kopf, name, gepackt);

    const satz = Buffer.alloc(46);
    satz.writeUInt32LE(0x02014b50, 0);
    satz.writeUInt16LE(20, 4);
    satz.writeUInt16LE(20, 6);
    satz.writeUInt16LE(verfahren, 10);
    satz.writeUInt32LE(pruef, 16);
    satz.writeUInt32LE(gepackt.length, 20);
    satz.writeUInt32LE(roh.length, 24);
    satz.writeUInt16LE(name.length, 28);
    satz.writeUInt32LE(lage, 42);
    verzeichnis.push(Buffer.concat([satz, name]));

    lage += kopf.length + name.length + gepackt.length;
  }
  const verzeichnisBytes = Buffer.concat(verzeichnis);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(eintraege.length, 8);
  ende.writeUInt16LE(eintraege.length, 10);
  ende.writeUInt32LE(verzeichnisBytes.length, 12);
  ende.writeUInt32LE(lage, 16);
  return Buffer.concat([...stuecke, verzeichnisBytes, ende]);
}

/** Eine Präsentation mit zwei Folien, je einem Bild und je einem Text. */
export function bauePptx() {
  const folie = (text) =>
    `<?xml version="1.0"?><p:sld xmlns:a="x" xmlns:p="y"><p:cSld><p:spTree>` +
    `<a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:spTree></p:cSld></p:sld>`;
  const rels = (bild) =>
    `<?xml version="1.0"?><Relationships><Relationship Id="rId2" Target="../media/${bild}"/></Relationships>`;
  return baueZip([
    { name: '[Content_Types].xml', inhalt: '<?xml version="1.0"?><Types/>' },
    { name: 'ppt/slides/slide1.xml', inhalt: folie('Template wählen') },
    { name: 'ppt/slides/slide2.xml', inhalt: folie('Create Template') },
    { name: 'ppt/slides/_rels/slide1.xml.rels', inhalt: rels('image1.png') },
    { name: 'ppt/slides/_rels/slide2.xml.rels', inhalt: rels('image2.png') },
    { name: 'ppt/media/image1.png', inhalt: baueTestPng(240, 150), gepackt: false },
    { name: 'ppt/media/image2.png', inhalt: baueTestPng(200, 120), gepackt: false },
    { name: 'ppt/media/image3.emf', inhalt: Buffer.alloc(64), gepackt: false }
  ]);
}

/** Ein Word-Dokument mit einem Bild und einem Satz. */
export function baueDocx() {
  return baueZip([
    { name: '[Content_Types].xml', inhalt: '<?xml version="1.0"?><Types/>' },
    {
      name: 'word/document.xml',
      inhalt: '<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Vertrag anlegen</w:t></w:r></w:p></w:body></w:document>'
    },
    {
      name: 'word/_rels/document.xml.rels',
      inhalt: '<?xml version="1.0"?><Relationships><Relationship Id="rId4" Target="media/image1.png"/></Relationships>'
    },
    { name: 'word/media/image1.png', inhalt: baueTestPng(180, 110), gepackt: false }
  ]);
}

/**
 * Ein Word-Handbuch mit zwei Kapiteln und je einem Bild - so, wie die Seite
 * selbst eines schreibt (F-61). Daran hängt, ob der Import ein Dokument an
 * seinen Überschriften teilt oder jedem Bild denselben Text gibt.
 */
export function baueHandbuchDocx() {
  const absatz = (text, vorlage) =>
    `<w:p>${vorlage ? `<w:pPr><w:pStyle w:val="${vorlage}"/></w:pPr>` : ''}<w:r><w:t>${text}</w:t></w:r></w:p>`;
  const bild = (id) => `<w:p><w:r><w:drawing><a:blip r:embed="${id}"/></w:drawing></w:r></w:p>`;
  return baueZip([
    { name: '[Content_Types].xml', inhalt: '<?xml version="1.0"?><Types/>' },
    {
      name: 'word/document.xml',
      inhalt:
        '<?xml version="1.0"?><w:document><w:body>' +
        absatz('Benutzerhandbuch', 'Heading1') +
        absatz('7.5.1 Dokumentierte Signaturwege', 'Heading3') +
        absatz('Fertig, wenn: der Beleg vorliegt', '') +
        bild('rIdBild1') +
        absatz('Schritt 1 · Vertragsnummer', 'Bildunterschrift') +
        absatz('7.5.2 Signaturergebnis', 'Heading3') +
        bild('rIdBild2') +
        absatz('Schritt 2 · Signatur geprüft', 'Bildunterschrift') +
        '</w:body></w:document>'
    },
    {
      name: 'word/_rels/document.xml.rels',
      inhalt:
        '<?xml version="1.0"?><Relationships>' +
        '<Relationship Id="rIdBild1" Target="media/bild1.png"/>' +
        '<Relationship Id="rIdBild2" Target="media/bild2.png"/>' +
        '</Relationships>'
    },
    { name: 'word/media/bild1.png', inhalt: baueTestPng(200, 120), gepackt: false },
    { name: 'word/media/bild2.png', inhalt: baueTestPng(210, 130), gepackt: false }
  ]);
}

/* --------------------------------------------------------------------- PDF */

/** Eine PDF-Datei; mit `jpeg` steckt ein JPEG-Block im Datenstrom. */
export function bauePdf({ mitJpeg = false } = {}) {
  const teile = ['%PDF-1.4\n', '1 0 obj<</Type/Catalog>>endobj\n'];
  if (mitJpeg) {
    const inhalt = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(2048, 0x41),
      Buffer.from([0xff, 0xd9])
    ]);
    teile.push('2 0 obj<</Subtype/Image/Filter/DCTDecode>>stream\n');
    return Buffer.concat([Buffer.from(teile.join(''), 'latin1'), inhalt, Buffer.from('\nendstream endobj\n%%EOF\n', 'latin1')]);
  }
  teile.push('%%EOF\n');
  return Buffer.from(teile.join(''), 'latin1');
}

/* ------------------------------------------------------------------ Ablage */

/** Legt die Testdateien in einen eigenen Ordner und gibt die Pfade zurück. */
export function legeTestdateienAb() {
  const ordner = mkdtempSync(join(tmpdir(), 'screenarchiv-import-'));
  const pfade = {
    png: join(ordner, 'Screen Template Market.png'),
    pptx: join(ordner, 'Quickguide oneSCM.pptx'),
    docx: join(ordner, 'Handbuch Auszug.docx'),
    handbuch: join(ordner, 'Benutzerhandbuch oneSCM.docx'),
    pdfLeer: join(ordner, 'Releaseletter.pdf'),
    alt: join(ordner, 'Altes Deck.ppt')
  };
  writeFileSync(pfade.png, baueTestPng(360, 220));
  writeFileSync(pfade.pptx, bauePptx());
  writeFileSync(pfade.docx, baueDocx());
  writeFileSync(pfade.handbuch, baueHandbuchDocx());
  writeFileSync(pfade.pdfLeer, bauePdf());
  writeFileSync(pfade.alt, Buffer.from('altes Format'));
  return { ordner, ...pfade };
}
