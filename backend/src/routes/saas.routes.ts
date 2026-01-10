
import { FastifyInstance } from 'fastify';
import { SaasController } from '../controllers/saas.controller';

const controller = new SaasController();

export async function saasRoutes(app: FastifyInstance) {
  
  // Rota Pública: Criar Empresa (Register)
  app.post('/tenants', controller.register.bind(controller));

  // Rota Pública: Login
  app.post('/login', controller.login.bind(controller));

  // Rotas Protegidas (Exemplo para listagem)
  app.get('/tenants', {
    // Middleware de Auth opcional aqui se quiser proteger a listagem
    // preValidation: [app.authenticate] 
  }, controller.listTenants.bind(controller));

  // Healthcheck do módulo SaaS
  app.get('/health', async () => ({ status: 'SaaS Module Active' }));
}
