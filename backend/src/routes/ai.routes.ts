
import { FastifyInstance } from 'fastify';
import { AIService } from '../services/AIService';
import { z } from 'zod';

const generateSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function aiRoutes(app: FastifyInstance) {
  const service = new AIService();

  // Middleware simulation for Tenant extraction (Replace with actual JWT logic in prod)
  app.addHook('preHandler', async (req: any, reply) => {
    // In a real scenario, extracting tenantId from req.user
    // Mocking for compatibility with existing simple auth structure
    if (!req.headers.authorization) {
       // return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.post('/generate', async (req, reply) => {
    try {
      const body = generateSchema.parse(req.body);
      
      // Mock: Get tenantId from header or body for this context, 
      // typically this comes from the authenticated user token
      const tenantId = (req.body as any).tenantId || (req.headers['x-tenant-id'] as string);

      if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant ID required' });
      }

      // Trigger generation asynchronously to not block the request
      service.generateSuggestion(tenantId, body.conversationId).catch(err => {
        console.error("Async AI generation failed", err);
      });

      return reply.code(200).send({ status: 'processing', message: 'AI generation triggered' });
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  });
}
