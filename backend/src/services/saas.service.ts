
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SaasService {
  
  async createTenantAndAdmin(data: { companyName: string; ownerName: string; email: string; password?: string }) {
    // 1. Check duplicates
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new Error('Este email já está em uso.');

    // 2. Prepare Password
    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    // 3. Ensure Basic Plan exists (Fail-safe)
    let plan = await prisma.plan.findUnique({ where: { id: 'basic' } });
    if (!plan) {
        console.log("[SaaS] Auto-seeding 'basic' plan...");
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

    // 4. Transaction: Tenant + User
    return await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          ownerName: data.ownerName,
          email: data.email,
          status: 'active',
          planId: 'basic'
        }
      });

      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          password: passwordHash,
          role: 'admin',
          tenantId: tenant.id
        }
      });

      const { password, ...safeUser } = user as any;
      return { tenant, user: safeUser };
    });
  }

  async login(data: { email: string; password?: string }) {
    const user = await prisma.user.findFirst({ where: { email: data.email } });
    if (!user) throw new Error('Email ou senha inválidos.');

    const userWithPass = user as any;
    const isValid = await bcrypt.compare(data.password || '', userWithPass.password);
    if (!isValid) throw new Error('Email ou senha inválidos.');

    const { password, ...safeUser } = userWithPass;
    return safeUser;
  }

  async listTenants() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } },
        plan: true
      }
    });
  }

  async getMetrics() {
    const [totalTenants, totalUsers] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count()
    ]);
    return {
      totalCompanies: totalTenants,
      activeUsers: totalUsers,
      mrr: totalTenants * 199.90, // Simple estimation
      churnRate: 0
    };
  }
}
