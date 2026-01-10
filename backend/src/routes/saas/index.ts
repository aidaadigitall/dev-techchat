
import { FastifyInstance } from 'fastify';
import { TenantController } from '../../controllers/tenant.controller';
import { UserController } from '../../controllers/user.controller';
import { DashboardController } from '../../controllers/dashboard.controller';

const tenantCtrl = new TenantController();
const userCtrl = new UserController();
const dashCtrl = new DashboardController();

export async function saasRoutes(app: FastifyInstance) {
  
  // Public Route (Login)
  app.post('/login', userCtrl.login.bind(userCtrl));

  // --- Tenants ---
  app.post('/tenants', tenantCtrl.create.bind(tenantCtrl));
  app.get('/tenants', tenantCtrl.list.bind(tenantCtrl));
  app.get('/tenants/:id', tenantCtrl.get.bind(tenantCtrl));
  app.put('/tenants/:id', tenantCtrl.update.bind(tenantCtrl));
  app.delete('/tenants/:id', tenantCtrl.delete.bind(tenantCtrl));

  // --- Users ---
  app.post('/users', userCtrl.create.bind(userCtrl));
  app.get('/users', userCtrl.list.bind(userCtrl));

  // --- Plans (Mocked for now, can be expanded to Controller) ---
  app.get('/plans', async (req, reply) => {
    return [
        { id: 'basic', name: 'Start', price: 199.90, limits: { users: 3, connections: 1 } },
        { id: 'pro', name: 'Professional', price: 499.90, limits: { users: 10, connections: 3 } }
    ];
  });

  // --- Dashboard ---
  app.get('/metrics', dashCtrl.getMetrics.bind(dashCtrl));
}
