import fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { authRoutes } from './routes/auth.js';
import { settingsRoutes } from './routes/settings.js';
import { folderRoutes } from './routes/folders.js';
import { mailRoutes } from './routes/mail.js';
import { sendRoutes } from './routes/send.js';
import { spamRoutes } from './routes/spam.js';
import { contactsRoutes } from './routes/contacts.js';
import { chatRoutes, markUserOnline, markUserOffline } from './routes/chat.js';
import { registerSocket } from './imap/idle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  // Initialize Database
  initDatabase();

  const app = fastify({
    logger: {
      level: config.isDev ? 'info' : 'warn'
    }
  });

  // Enable CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Enable Multipart upload for email attachments
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB max attachment size
    }
  });

  // Enable WebSockets for IMAP IDLE push notifications & Instant Encrypted Chat
  await app.register(fastifyWebsocket);

  app.get('/ws', { websocket: true }, (connection: any, req) => {
    const accountId = (req.query as { accountId?: string })?.accountId;
    if (accountId) {
      const socket = connection.socket || connection;
      registerSocket(accountId, socket);
      markUserOnline(accountId);

      socket.on('close', () => {
        markUserOffline(accountId);
      });
    }
  });

  // Register API routes
  await app.register(authRoutes);
  await app.register(settingsRoutes);
  await app.register(folderRoutes);
  await app.register(mailRoutes);
  await app.register(sendRoutes);
  await app.register(spamRoutes);
  await app.register(contactsRoutes);
  await app.register(chatRoutes);

  // Health check endpoint for Docker / Kubernetes
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }));

  // Serve Frontend Static files in production
  const candidates = [
    path.resolve(process.cwd(), 'dist/client'),
    path.join(__dirname, '../../dist/client'),
    path.join(__dirname, '../client')
  ];
  const clientDistPath = candidates.find(p => fs.existsSync(p));

  if (clientDistPath) {
    await app.register(fastifyStatic, {
      root: clientDistPath,
      prefix: '/'
    });

    // SPA fallback
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'Endpoint non trovato' });
      } else {
        reply.sendFile('index.html', clientDistPath);
      }
    });
  }

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 CryptoMail Server avviato con successo su http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
