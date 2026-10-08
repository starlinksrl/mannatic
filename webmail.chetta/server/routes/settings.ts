import { FastifyInstance } from 'fastify';
import { settingsRepo, UserSettings } from '../db/index.js';

export async function settingsRoutes(app: FastifyInstance) {
  // Get User Settings
  app.get('/api/settings/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const settings = settingsRepo.get(accountId);
    if (!settings) {
      // Auto-create default settings
      const created = settingsRepo.upsert({ account_id: accountId });
      return { settings: created };
    }
    return { settings };
  });

  // Update User Settings
  app.put('/api/settings/:accountId', async (req, reply) => {
    const { accountId } = req.params as { accountId: string };
    const body = req.body as Partial<UserSettings>;

    const updated = settingsRepo.upsert({
      ...body,
      account_id: accountId
    });

    return { success: true, settings: updated };
  });
}
