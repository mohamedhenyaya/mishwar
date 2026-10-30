import { readFile, unlink, writeFile } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';

// heic-convert : décodeur HEIC en JavaScript pur (aucune dépendance système), sans types publiés
// eslint-disable-next-line @typescript-eslint/no-var-requires
const convert: (opts: { buffer: Buffer; format: 'JPEG'; quality: number }) => Promise<ArrayBuffer> = require('heic-convert');

export const isHeic = (nameOrMime: string): boolean => /hei[cf]/i.test(nameOrMime);

// Photo HEIC (galerie iPhone) → JPEG à côté de l'original, supprimé ensuite.
// Les navigateurs ne savent pas afficher le HEIC : l'admin ne pourrait pas vérifier la pièce.
// Retourne le nom du fichier JPEG.
export async function heicToJpeg(path: string): Promise<string> {
  const jpeg = await convert({ buffer: await readFile(path), format: 'JPEG', quality: 0.85 });
  const target = join(dirname(path), `${basename(path, extname(path))}.jpg`);
  await writeFile(target, Buffer.from(jpeg));
  await unlink(path).catch(() => undefined);
  return basename(target);
}

// Fichier reçu par multer : converti s'il est en HEIC, sinon inchangé. Retourne le nom final.
export async function normalizeUploadedImage(file: Express.Multer.File): Promise<string> {
  if (!isHeic(file.mimetype) && !isHeic(file.originalname)) return file.filename;
  file.filename = await heicToJpeg(file.path);
  return file.filename;
}
