
import { FastifyReply, FastifyRequest } from 'fastify';
import { SaasService } from '../services/saas.service';
import { z } from 'zod';

const service = new SaasService();

export class SaasController {

  // POST /saas/tenants
  async register(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      companyName: z.string().min(3, "Nome da empresa deve ter no mínimo 3 caracteres"),
      ownerName: z.string().min(3, "Nome do responsável deve ter no mínimo 3 caracteres"),
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
    });

    try {
      const data = schema.parse(req.body);
      const result = await service.createTenant(data);
      
      // Gerar Token JWT automático após registro
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
      const msg = error.issues ? error.issues[0].message : error.message;
      return reply.code(400).send({ error: msg });
    }
  }

  // POST /saas/login
  async login(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    try {
      const data = schema.parse(req.body);
      const user = await service.login(data);

      // Gerar Token JWT contendo o tenantId
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
      return reply.code(401).send({ error: error.message || 'Falha na autenticação' });
    }
  }

  // GET /saas/tenants
  async listTenants(req: FastifyRequest, reply: FastifyReply) {
    try {
      const tenants = await service.listTenants();
      return reply.send(tenants);
    } catch (error) {
      return reply.code(500).send({ error: 'Erro interno ao listar empresas' });
    }
  }
}
