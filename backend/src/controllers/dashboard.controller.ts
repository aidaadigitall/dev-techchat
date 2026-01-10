
import { FastifyReply, FastifyRequest } from 'fastify';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getMetrics(req: FastifyRequest, reply: FastifyReply) {
    try {
      const metrics = await dashboardService.getMetrics();
      return reply.send(metrics);
    } catch (error: any) {
      console.error(error);
      return reply.code(500).send({ error: 'Failed to fetch metrics' });
    }
  }
}
