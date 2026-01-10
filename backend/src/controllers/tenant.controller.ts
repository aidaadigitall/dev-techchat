
import { FastifyReply, FastifyRequest } from 'fastify';
import { TenantService } from '../services/tenant.service';
import { z } from 'zod';

const tenantService = new TenantService();

const createSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  ownerName: z.string(),
  planId: z.string().optional()
});

export class TenantController {
  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createSchema.parse(req.body);
      const tenant = await tenantService.create(data);
      return reply.code(201).send(tenant);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    const tenants = await tenantService.list();
    return reply.send(tenants);
  }

  async get(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const tenant = await tenantService.getById(req.params.id);
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });
    return reply.send(tenant);
  }

  async update(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const updated = await tenantService.update(req.params.id, req.body);
      return reply.send(updated);
    } catch (error) {
      return reply.code(400).send({ error: 'Update failed' });
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await tenantService.delete(req.params.id);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(400).send({ error: 'Delete failed' });
    }
  }
}
