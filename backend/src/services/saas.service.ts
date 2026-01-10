
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SaasService {
  
  async createTenantAndAdmin(data: { companyName: string; ownerName: string; email: string; password?: string }) {
    // 1. Validar duplicidade
    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new Error('Este email já está em uso.');

    // 2. Hash senha
    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    // 3. Transação
    return await prisma.$transaction(async (tx) => {
      // Criar Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          ownerName: data.ownerName,
          email: data.email,
          status: 'active',
          planId: 'basic' // Default plan
        }
      });

      // Criar User Admin
      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          password: passwordHash,
          role: 'admin',
          tenantId: tenant.id
        }
      });

      // Sanitizar retorno
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
        _count: { select: { users: true } }
      }
    });
  }

  async listUsers() {
      return prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true, tenantId: true }
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
      mrr: totalTenants * 199.90,
      churnRate: 0
    };
  }
}
