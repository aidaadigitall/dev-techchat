
import { FastifyReply, FastifyRequest } from 'fastify';
import { SaasService } from '../services/saas.service';
import { z } from 'zod';

const service = new SaasService();

export class SaasController {

  // POST /api/saas/auth/register
  async register(req: FastifyRequest, reply: FastifyReply) {
    console.log(`[SaaS] Nova tentativa de registro`, req.body);
    
    const schema = z.object({
      companyName: z.string().min(3),
      ownerName: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6)
    });

    try {
      const data = schema.parse(req.body);
      const result = await service.createTenantAndAdmin(data);
      
      // Gera token JWT
      const token = await reply.jwtSign({
        id: result.user.id,
        email: result.user.email,
        tenantId: result.user.tenantId,
        role: result.user.role
      });

      return reply.code(201).send({
        message: 'Conta criada com sucesso',
        tenant: result.tenant,
        user: result.user,
        token
      });

    } catch (error: any) {
      console.error("Erro no registro:", error);
      const msg = error.issues ? error.issues[0].message : error.message;
      return reply.code(400).send({ error: msg });
    }
  }

  // POST /api/saas/auth/login
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

      return reply.code(200).send({
        user,
        token
      });

    } catch (error: any) {
      return reply.code(401).send({ error: error.message || 'Credenciais inválidas' });
    }
  }

  // GET /api/saas/tenants
  async listTenants(req: FastifyRequest, reply: FastifyReply) {
    try {
      const tenants = await service.listTenants();
      return reply.send(tenants);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro ao listar empresas' });
    }
  }

  // GET /api/saas/users
  async listUsers(req: FastifyRequest, reply: FastifyReply) {
    try {
        // Implementar filtro por tenantId se necessário
        const users = await service.listUsers();
        return reply.send(users);
    } catch (error) {
        return reply.code(500).send({ error: 'Erro ao listar usuários' });
    }
  }

  // GET /api/saas/metrics
  async getMetrics(req: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await service.getMetrics();
      return reply.send(metrics);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro ao calcular métricas' });
    }
  }
}
