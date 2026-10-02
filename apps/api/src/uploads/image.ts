/**
 * Vérification et nettoyage des photos envoyées, sans dépendance.
 *
 * 1. Le type est déduit des premiers octets du fichier (« nombre magique »),
 *    jamais de l'extension ni du Content-Type annoncés par le client : un
 *    script renommé en .jpg est refusé.
 * 2. Les métadonnées sont retirées. Une photo prise au téléphone contient
 *    souvent les coordonnées GPS exactes du domicile de l'habitant, la date,
 *    le modèle de l'appareil : on ne les publie pas.
 */

export type ImageType = 'jpeg' | 'png';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageType(buf: Buffer): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  return null;
}

/**
 * JPEG : suit la chaîne des segments jusqu'au début des données d'image (SOS)
 * et supprime APP1 (EXIF, XMP), APP13 (IPTC) et les commentaires (COM).
 * APP0 (JFIF) et APP2 (profil de couleur ICC) sont gardés : l'image s'affiche
 * à l'identique.
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  const DROP = new Set([0xe1, 0xed, 0xfe]);
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let offset = 2;

  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) throw new Error('JPEG invalide');
    const marker = buf[offset + 1];
    // Octets de remplissage 0xFF autorisés entre deux segments.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Début des données compressées : on recopie tout le reste tel quel.
    if (marker === 0xda) {
      parts.push(buf.subarray(offset));
      return Buffer.concat(parts);
    }
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buf.length) throw new Error('JPEG invalide');
    if (!DROP.has(marker)) parts.push(buf.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }
  throw new Error('JPEG invalide');
}

/**
 * PNG : supprime les blocs de métadonnées (eXIf, tEXt, iTXt, zTXt, tIME).
 * Les blocs d'image et de couleur sont conservés.
 */
export function stripPngMetadata(buf: Buffer): Buffer {
  const DROP = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let offset = 8;

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > buf.length) throw new Error('PNG invalide');
    if (!DROP.has(type)) parts.push(buf.subarray(offset, end));
    offset = end;
    if (type === 'IEND') return Buffer.concat(parts);
  }
  throw new Error('PNG invalide');
}

export function stripMetadata(buf: Buffer, type: ImageType): Buffer {
  return type === 'jpeg' ? stripJpegMetadata(buf) : stripPngMetadata(buf);
}
