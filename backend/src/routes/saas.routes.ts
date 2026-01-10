
import { FastifyInstance } from 'fastify';
import { SaasController } from '../controllers/saas.controller';

const controller = new SaasController();

export async function saasRoutes(app: FastifyInstance) {
  
  // Auth
  app.post('/login', controller.login.bind(controller));

  // Tenants
  app.post('/tenants', controller.createTenant.bind(controller));
  app.get('/tenants', controller.listTenants.bind(controller));

  // Users
  app.post('/users', controller.createUser.bind(controller));
  app.get('/users', controller.listUsers.bind(controller));
  
  // Rota de teste/debug para verificar JWT (protegida)
  app.get('/me', {
    preValidation: [app.authenticate] 
  } as any, async (req: any, reply) => {
    return req.user;
  });
}
