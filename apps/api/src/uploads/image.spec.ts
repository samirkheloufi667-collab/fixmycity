import { detectImageType, stripJpegMetadata, stripPngMetadata } from './image';

/** Segment JPEG : marqueur + longueur (qui inclut ses 2 octets) + données. */
const segment = (marker: number, data: Buffer) => {
  const head = Buffer.alloc(4);
  head[0] = 0xff;
  head[1] = marker;
  head.writeUInt16BE(data.length + 2, 2);
  return Buffer.concat([head, data]);
};

const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  segment(0xe0, Buffer.from('JFIF\0\x01\x01')),
  segment(0xe1, Buffer.from('Exif\0\0GPS 48.8123N 2.3605E iPhone')),
  segment(0xfe, Buffer.from('commentaire')),
  segment(0xdb, Buffer.alloc(8, 1)),
  Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0x11, 0x22, 0xff, 0xd9]),
]);

/** Bloc PNG : longueur, type, données, CRC (non vérifié ici). */
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
};
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', Buffer.alloc(13)),
  chunk('eXIf', Buffer.from('GPS secret')),
  chunk('tEXt', Buffer.from('Author\0Lea')),
  chunk('IDAT', Buffer.alloc(10, 7)),
  chunk('IEND', Buffer.alloc(0)),
]);

describe('detectImageType', () => {
  it('reconnaît JPEG et PNG à leurs premiers octets', () => {
    expect(detectImageType(jpeg)).toBe('jpeg');
    expect(detectImageType(png)).toBe('png');
  });

  it('refuse un script déguisé en image, quel que soit son nom', () => {
    expect(detectImageType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
  });
});

describe('suppression des métadonnées', () => {
  it("retire EXIF et commentaires d'un JPEG et garde l'image intacte", () => {
    const clean = stripJpegMetadata(jpeg);
    expect(clean.includes(Buffer.from('GPS'))).toBe(false);
    expect(clean.includes(Buffer.from('commentaire'))).toBe(false);
    expect(clean.includes(Buffer.from('JFIF'))).toBe(true);
    expect(clean.subarray(-10).equals(jpeg.subarray(-10))).toBe(true);
  });

  it("retire eXIf et tEXt d'un PNG", () => {
    const clean = stripPngMetadata(png);
    expect(clean.includes(Buffer.from('GPS'))).toBe(false);
    expect(clean.includes(Buffer.from('Author'))).toBe(false);
    expect(clean.includes(Buffer.from('IDAT'))).toBe(true);
    expect(clean.includes(Buffer.from('IEND'))).toBe(true);
  });

  it("rejette un fichier tronqué au lieu de l'enregistrer à moitié", () => {
    expect(() => stripJpegMetadata(jpeg.subarray(0, 12))).toThrow();
    expect(() => stripPngMetadata(png.subarray(0, 30))).toThrow();
  });
});
