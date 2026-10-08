import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const config = {
  port: parseInt(process.env.PORT || '8004', 10),
  host: process.env.HOST || '0.0.0.0',
  dataDir: DATA_DIR,
  dbPath: path.join(DATA_DIR, 'webmail.db'),
  secretKey: process.env.SECRET_KEY || 'outlook-webmail-super-secret-key-32b!',
  isDev: process.env.NODE_ENV !== 'production'
};
