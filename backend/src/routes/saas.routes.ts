
import { FastifyInstance } from 'fastify';
import { SaasController } from '../controllers/saas.controller';

const controller = new SaasController();

export async function saasRoutes(app: FastifyInstance) {
  // Rotas Públicas (Sem JWT)
  app.post('/auth/register', controller.register.bind(controller));
  app.post('/auth/login', controller.login.bind(controller));

  // Rotas Protegidas (JWT opcional ou obrigatório dependendo da regra)
  // TODO: Adicionar middleware 'authenticate' aqui quando necessário
  app.get('/metrics', controller.getMetrics.bind(controller));
}
