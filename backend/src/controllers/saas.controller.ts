
import { FastifyReply, FastifyRequest } from 'fastify';
import { SaasService } from '../services/saas.service';
import { z } from 'zod';

const service = new SaasService();

export class SaasController {

  // POST /api/saas/auth/register
  async register(req: FastifyRequest, reply: FastifyReply) {
    console.log(`[SaaS] Registro iniciado:`, req.body);
    
    const schema = z.object({
      companyName: z.string().min(3, "Nome da empresa muito curto"),
      ownerName: z.string().min(3, "Nome do responsável muito curto"),
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
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
        message: 'Empresa registrada com sucesso',
        tenant: result.tenant,
        user: result.user,
        token
      });

    } catch (error: any) {
      console.error("[SaaS] Erro Registro:", error);
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
      return reply.code(401).send({ error: 'Email ou senha incorretos' });
    }
  }

  // GET /api/saas/tenants
  async listTenants(req: FastifyRequest, reply: FastifyReply) {
    try {
      // TODO: Validar se user é super_admin via request.user
      const tenants = await service.listTenants();
      return reply.send(tenants);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro ao listar empresas' });
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
