
import { FastifyReply, FastifyRequest } from 'fastify';
import { PlanService } from '../services/plan.service';
import { z } from 'zod';

const planService = new PlanService();

const planSchema = z.object({
  name: z.string().min(3),
  price: z.number().min(0),
  limits: z.object({
    users: z.number().default(1),
    connections: z.number().default(1),
    messages: z.number().default(1000)
  }),
  features: z.object({
    crm: z.boolean().default(true),
    campaigns: z.boolean().default(false),
    api: z.boolean().default(false),
    automations: z.boolean().default(false),
    reports: z.boolean().default(false)
  })
});

export class PlanController {
  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const data = planSchema.parse(req.body);
      const plan = await planService.create(data);
      return reply.code(201).send(plan);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    const { active } = req.query as { active?: string };
    const plans = await planService.list(active === 'true');
    return reply.send(plans);
  }

  async get(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const plan = await planService.getById(req.params.id);
    if (!plan) return reply.code(404).send({ error: 'Plan not found' });
    return reply.send(plan);
  }

  async update(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // Partial validation for updates
      const data = planSchema.partial().parse(req.body);
      const updated = await planService.update(req.params.id, data);
      return reply.send(updated);
    } catch (error) {
      return reply.code(400).send({ error: 'Update failed' });
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await planService.delete(req.params.id);
      return reply.code(204).send();
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }
}
