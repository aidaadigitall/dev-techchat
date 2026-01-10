
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserService } from '../services/user.service';
import { z } from 'zod';

const userService = new UserService();

export class UserController {
  async create(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().min(6).optional(),
      tenantId: z.string().uuid(),
      role: z.string().optional()
    });

    try {
      const data = schema.parse(req.body);
      const user = await userService.create(data);
      return reply.code(201).send(user);
    } catch (error: any) {
      return reply.code(400).send({ error: error.message });
    }
  }

  async login(req: FastifyRequest, reply: FastifyReply) {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    try {
      const { email, password } = schema.parse(req.body);
      const user = await userService.login(email, password);
      
      // Generate JWT
      const token = (req.server as any).jwt.sign({ 
        id: user.id, 
        email: user.email, 
        tenantId: user.tenantId,
        role: user.role 
      });

      return reply.send({ user, token });
    } catch (error: any) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    // If tenantId is passed in query, filter by it
    const { tenantId } = req.query as any;
    const users = await userService.list(tenantId);
    return reply.send(users);
  }
}
