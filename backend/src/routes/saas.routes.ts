
import { FastifyInstance } from 'fastify';
import { SaasController } from '../controllers/saas.controller';

const controller = new SaasController();

export async function saasRoutes(app: FastifyInstance) {
  
  // --- Auth Public Routes ---
  app.post('/auth/login', controller.login.bind(controller));
  app.post('/auth/register', controller.register.bind(controller));

  // --- Management Routes (Protected Ideally) ---
  app.get('/tenants', controller.listTenants.bind(controller));
  app.get('/metrics', controller.getMetrics.bind(controller));

  // Health check específico do módulo SaaS
  app.get('/health', async () => ({ status: 'saas_active' }));
}
