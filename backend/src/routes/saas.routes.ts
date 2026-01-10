
import { FastifyInstance } from 'fastify';
import { SaasController } from '../controllers/saas.controller';

const controller = new SaasController();

export async function saasRoutes(app: FastifyInstance) {
  // Autenticação e Registro
  app.post('/auth/login', controller.login.bind(controller));
  app.post('/auth/register', controller.register.bind(controller));

  // Gestão de Tenants
  app.get('/tenants', {
      // Opcional: Adicionar middleware de auth aqui para proteger a listagem
      // preValidation: [app.authenticate] 
  }, controller.listTenants.bind(controller));

  // Métricas do SaaS (Super Admin)
  app.get('/metrics', controller.getMetrics.bind(controller));

  // Rota de Usuários (Listagem geral ou por tenant)
  app.get('/users', controller.listUsers.bind(controller));
}
