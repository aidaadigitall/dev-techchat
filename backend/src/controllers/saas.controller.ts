
import { FastifyReply, FastifyRequest } from 'fastify';
import { SaasService } from '../services/saas.service';
import { z } from 'zod';

const service = new SaasService();

export class SaasController {

  // POST /saas/tenants
  async createTenant(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      ownerName: z.string(),
      planId: z.string().optional()
    });

    try {
      const data = schema.parse(req.body);
      const tenant = await service.createTenant(data);
      return reply.code(201).send(tenant);
    } catch (error: any) {
      console.error(error);
      return reply.code(400).send({ error: error.message || 'Erro ao criar empresa.' });
    }
  }

  // GET /saas/tenants
  async listTenants(req: FastifyRequest, reply: FastifyReply) {
    try {
      const tenants = await service.listTenants();
      return reply.send(tenants);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro ao listar empresas.' });
    }
  }

  // POST /saas/users
  async createUser(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      tenantId: z.string().uuid(),
      role: z.string().optional()
    });

    try {
      const data = schema.parse(req.body);
      const user = await service.createUser(data);
      return reply.code(201).send(user);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message || 'Erro ao criar usuário.' });
    }
  }

  // GET /saas/users
  async listUsers(req: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = req.query as { tenantId?: string };
    try {
      const users = await service.listUsers(tenantId);
      return reply.send(users);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro ao listar usuários.' });
    }
  }

  // POST /saas/login
  async login(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    try {
      const { email, password } = schema.parse(req.body);
      const user = await service.login(email, password);

      // Gerar JWT usando o plugin registrado no server.ts
      const token = await reply.jwtSign({
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role
      });

      return reply.send({ user, token });
    } catch (error: any) {
      return reply.code(401).send({ error: error.message || 'Autenticação falhou.' });
    }
  }
}
