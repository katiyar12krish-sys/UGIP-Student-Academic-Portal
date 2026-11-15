// ===================================================================================================
// Profile photos on disk (data/photos/<user id>.jpg), outside the database.
// ===================================================================================================
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './connection';

export const PHOTO_DIR = path.join(DATA_DIR, 'photos');
fs.mkdirSync(PHOTO_DIR, { recursive: true });

/** One file per user, named by the user id (ids are checked against the users table and this pattern before any file access). */
export function photoFile(userId: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId)) throw new Error('bad user id');
  return path.join(PHOTO_DIR, `${userId}.jpg`);
}
