/**
 * Erzeugt ein einfaches PNG ohne fremde Pakete - fuer die Pruefung des
 * Bild-Uploads im Aufnahmestudio.
 */
import { deflateSync } from 'node:zlib';

const CRC_TABELLE = (() => {
  const tabelle = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabelle[n] = c;
  }
  return tabelle;
})();

function crc32(puffer) {
  let c = 0xffffffff;
  for (const b of puffer) c = CRC_TABELLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function block(art, daten) {
  const kopf = Buffer.alloc(4);
  kopf.writeUInt32BE(daten.length);
  const koerper = Buffer.concat([Buffer.from(art, 'ascii'), daten]);
  const pruefsumme = Buffer.alloc(4);
  pruefsumme.writeUInt32BE(crc32(koerper));
  return Buffer.concat([kopf, koerper, pruefsumme]);
}

/**
 * @param {number} breite
 * @param {number} hoehe
 * @param {(x:number,y:number)=>[number,number,number]} farbe
 */
export function erzeugePng(breite, hoehe, farbe = (x, y) => [(x * 8) % 256, (y * 8) % 256, 128]) {
  const zeilen = [];
  for (let y = 0; y < hoehe; y++) {
    const zeile = Buffer.alloc(1 + breite * 3);
    for (let x = 0; x < breite; x++) {
      const [r, g, b] = farbe(x, y);
      zeile[1 + x * 3] = r;
      zeile[2 + x * 3] = g;
      zeile[3 + x * 3] = b;
    }
    zeilen.push(zeile);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; // Bittiefe
  ihdr[9] = 2; // Echtfarbe
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    block('IHDR', ihdr),
    block('IDAT', deflateSync(Buffer.concat(zeilen))),
    block('IEND', Buffer.alloc(0))
  ]);
}
