import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';

// Dossier servi en statique sous /uploads (voir main.ts).
// En production, UPLOADS_DIR pointe vers un volume persistant (ex. /data/uploads sur Railway) :
// le disque du conteneur est effacé à chaque redéploiement.
export const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

export const photoUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('Seules les images sont acceptées'), false);
    }
    cb(null, true);
  },
};

export const photoPath = (file: Express.Multer.File): string => `/uploads/${file.filename}`;

// Pièces du dossier (carte d'identité, permis, carte grise, assurance) : même volume que les
// photos, mais dans un sous-dossier que main.ts refuse de servir — seuls les admins y accèdent
export const DOCUMENTS_DIR = join(UPLOADS_DIR, 'private');
mkdirSync(DOCUMENTS_DIR, { recursive: true });

export const documentUploadOptions: MulterOptions = {
  ...photoUploadOptions,
  storage: diskStorage({
    destination: DOCUMENTS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
};
