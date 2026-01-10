
import { FastifyReply, FastifyRequest } from 'fastify';
import { ContactService } from '../services/contact.service';
import { z } from 'zod';

const contactService = new ContactService();

const createContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  tenantId: z.string().optional() // Injetado automaticamente pelo middleware ou frontend body
});

export class ContactController {
  async list(req: FastifyRequest, reply: FastifyReply) {
    // Tenant ID vem da query (GET) ou do body (se POST), mas api.ts manda no GET via Query
    const { tenantId } = req.query as { tenantId: string };
    
    if (!tenantId) {
        return reply.code(400).send({ error: 'Tenant ID missing in query' });
    }

    try {
      const contacts = await contactService.list(tenantId);
      return reply.send(contacts);
    } catch (error: any) {
      console.error(error);
      return reply.code(500).send({ error: 'Failed to list contacts' });
    }
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createContactSchema.parse(req.body);
      // Se tenantId não vier no body, tentar pegar do user (se auth middleware estiver ativo)
      const tenantId = data.tenantId || (req as any).user?.tenantId;

      if (!tenantId) {
          return reply.code(400).send({ error: 'Tenant ID required' });
      }

      const contact = await contactService.create(tenantId, data);
      return reply.code(201).send(contact);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async update(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const updated = await contactService.update(req.params.id, req.body);
      return reply.send(updated);
    } catch (error) {
      return reply.code(400).send({ error: 'Update failed' });
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await contactService.delete(req.params.id);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(400).send({ error: 'Delete failed' });
    }
  }
}
