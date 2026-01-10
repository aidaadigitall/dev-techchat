
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SaasService {
  
  // --- Tenant Operations ---
  
  async createTenant(data: { name: string; email: string; ownerName: string; planId?: string }) {
    // Verifica se já existe tenant com este email (opcional, mas boa prática)
    // const existing = await prisma.tenant.findFirst({ where: { email: data.email } });
    // if (existing) throw new Error('Empresa já registrada com este email.');

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        email: data.email,
        ownerName: data.ownerName,
        status: 'active',
        planId: data.planId || 'basic'
      }
    });
    return tenant;
  }

  async listTenants() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // --- User Operations ---

  async createUser(data: { name: string; email: string; password?: string; tenantId: string; role?: string }) {
    if (!data.tenantId) throw new Error('Tenant ID é obrigatório para criar usuário.');

    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new Error('Email já está em uso.');

    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
        tenantId: data.tenantId,
        role: data.role || 'user'
      }
    });

    const { password, ...safeUser } = user as any;
    return safeUser;
  }

  async listUsers(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    return prisma.user.findMany({
      where,
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        tenantId: true, 
        createdAt: true 
      }
    });
  }

  // --- Auth Operations ---

  async login(email: string, pass: string) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw new Error('Credenciais inválidas.');

    const isValid = await bcrypt.compare(pass, (user as any).password);
    if (!isValid) throw new Error('Credenciais inválidas.');

    // Remove a senha do objeto retornado
    const { password, ...safeUser } = user as any;
    return safeUser;
  }
}
