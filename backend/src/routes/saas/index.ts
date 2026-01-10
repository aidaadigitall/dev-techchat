
import { FastifyInstance } from 'fastify';
import { TenantController } from '../../controllers/tenant.controller';
import { UserController } from '../../controllers/user.controller';
import { DashboardController } from '../../controllers/dashboard.controller';
import { PlanController } from '../../controllers/plan.controller';

const tenantCtrl = new TenantController();
const userCtrl = new UserController();
const dashCtrl = new DashboardController();
const planCtrl = new PlanController();

export async function saasRoutes(app: FastifyInstance) {
  
  // Public Route (Login)
  app.post('/login', userCtrl.login.bind(userCtrl));

  // --- Tenants (Companies) ---
  app.post('/tenants', tenantCtrl.create.bind(tenantCtrl));
  app.get('/tenants', tenantCtrl.list.bind(tenantCtrl));
  app.get('/tenants/:id', tenantCtrl.get.bind(tenantCtrl));
  app.put('/tenants/:id', tenantCtrl.update.bind(tenantCtrl));
  app.delete('/tenants/:id', tenantCtrl.delete.bind(tenantCtrl));

  // --- Users ---
  app.post('/users', userCtrl.create.bind(userCtrl));
  app.get('/users', userCtrl.list.bind(userCtrl));

  // --- Plans ---
  app.post('/plans', planCtrl.create.bind(planCtrl));
  app.get('/plans', planCtrl.list.bind(planCtrl));
  app.get('/plans/:id', planCtrl.get.bind(planCtrl));
  app.put('/plans/:id', planCtrl.update.bind(planCtrl));
  app.delete('/plans/:id', planCtrl.delete.bind(planCtrl));

  // --- Dashboard ---
  app.get('/metrics', dashCtrl.getMetrics.bind(dashCtrl));
}
