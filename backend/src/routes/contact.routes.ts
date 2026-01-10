
import { FastifyInstance } from 'fastify';
import { ContactController } from '../controllers/contact.controller';

const controller = new ContactController();

export async function contactRoutes(app: FastifyInstance) {
  app.get('/', controller.list.bind(controller));
  app.post('/', controller.create.bind(controller));
  app.put('/:id', controller.update.bind(controller));
  app.delete('/:id', controller.delete.bind(controller));
}
