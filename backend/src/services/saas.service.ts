
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SaasService {
  
  // Criação de Empresa + Usuário Admin em uma única transação
  async createTenantAndAdmin(data: { companyName: string; ownerName: string; email: string; password?: string }) {
    // 1. Validar duplicidade de email
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new Error('Este email já está em uso.');

    // 2. Hash da senha
    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    // 3. Garantir existência do Plano Basic (Fallback)
    let plan = await prisma.plan.findUnique({ where: { id: 'basic' } });
    if (!plan) {
        console.log("[SaaS] Criando plano 'basic' padrão...");
        plan = await prisma.plan.create({
            data: {
                id: 'basic',
                name: 'Start',
                price: 199.90,
                active: true,
                limits: { users: 3, connections: 1, messages: 1000 },
                features: { crm: true, campaigns: false, api: false, automations: false, reports: true }
            }
        });
    }

    // 4. Executar Transação
    return await prisma.$transaction(async (tx) => {
      // Criar Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          ownerName: data.ownerName,
          email: data.email,
          status: 'active',
          planId: 'basic'
        }
      });

      // Criar User Admin vinculado ao Tenant
      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          password: passwordHash,
          role: 'admin',
          tenantId: tenant.id
        }
      });

      // Remover senha do retorno
      const { password, ...safeUser } = user as any;
      return { tenant, user: safeUser };
    });
  }

  // Login Unificado (SaaS)
  async login(data: { email: string; password?: string }) {
    const user = await prisma.user.findFirst({ where: { email: data.email } });
    if (!user) throw new Error('Credenciais inválidas.');

    const userWithPass = user as any;
    const isValid = await bcrypt.compare(data.password || '', userWithPass.password);
    if (!isValid) throw new Error('Credenciais inválidas.');

    const { password, ...safeUser } = userWithPass;
    return safeUser;
  }

  // Listagem de Tenants (Para Super Admin)
  async listTenants() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
        plan: true
      }
    });
  }

  // Métricas Globais (SaaS Dashboard)
  async getMetrics() {
    const [totalTenants, totalUsers] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count()
    ]);

    // Cálculo estimado de MRR baseado nos planos ativos
    const tenants = await prisma.tenant.findMany({ include: { plan: true } });
    const mrr = tenants.reduce((acc, t) => acc + (t.plan?.price || 0), 0);

    return {
      totalCompanies: totalTenants,
      activeUsers: totalUsers,
      mrr: mrr,
      churnRate: 0 // Implementar lógica futura
    };
  }
}
