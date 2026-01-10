
import { FastifyInstance } from 'fastify';
import { SaasController } from '../controllers/saas.controller';

const controller = new SaasController();

export async function saasRoutes(app: FastifyInstance) {
  // Public Auth
  app.post('/auth/register', controller.register.bind(controller));
  app.post('/auth/login', controller.login.bind(controller));

  // Protected / Admin
  app.get('/tenants', controller.listTenants.bind(controller));
  app.get('/metrics', controller.getMetrics.bind(controller));
  
  app.get('/health', async () => ({ status: 'saas_ready' }));
}
