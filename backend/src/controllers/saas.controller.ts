
import { FastifyReply, FastifyRequest } from 'fastify';
import { SaasService } from '../services/saas.service';
import { z } from 'zod';

const service = new SaasService();

export class SaasController {

  async register(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      companyName: z.string().min(2),
      ownerName: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6)
    });

    try {
      const data = schema.parse(req.body);
      const result = await service.createTenantAndAdmin(data);
      
      // Gerar Token JWT
      const token = await reply.jwtSign({
        id: result.user.id,
        email: result.user.email,
        tenantId: result.user.tenantId,
        role: result.user.role
      });

      return reply.code(201).send({
        message: 'Empresa registrada com sucesso',
        tenant: result.tenant,
        user: result.user,
        token
      });

    } catch (error: any) {
      console.error("[Register Error]", error);
      const msg = error.issues ? error.issues[0].message : error.message;
      return reply.code(400).send({ error: msg });
    }
  }

  async login(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    try {
      const data = schema.parse(req.body);
      const user = await service.login(data);

      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role
      });

      return reply.code(200).send({ user, token });

    } catch (error: any) {
      return reply.code(401).send({ error: error.message || 'Falha na autenticação' });
    }
  }

  async getMetrics(req: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await service.getMetrics();
      return reply.send(metrics);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro interno' });
    }
  }
}
