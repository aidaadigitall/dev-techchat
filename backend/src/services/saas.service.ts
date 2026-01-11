
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SaasService {
  
  // Criação de Tenant + Admin + Plano Default
  async createTenantAndAdmin(data: { companyName: string; ownerName: string; email: string; password?: string }) {
    console.log(`[SaaS] Iniciando registro para: ${data.email}`);

    // 1. Verificar duplicidade de email
    const existingUser = await prisma.user.findFirst({ where: { email: data.email } });
    if (existingUser) {
        throw new Error('Este email já está cadastrado no sistema.');
    }

    // 2. Hash da Senha
    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    // 3. Garantir Plano Basic (Fail-safe)
    let plan = await prisma.plan.findUnique({ where: { id: 'basic' } });
    if (!plan) {
        console.log("[SaaS] Plano 'basic' não encontrado. Criando automaticamente...");
        try {
            plan = await prisma.plan.create({
                data: {
                    id: 'basic',
                    name: 'Start',
                    price: 199.90,
                    active: true,
                    limits: { users: 3, connections: 1, messages: 1000 },
                    features: { crm: true, campaigns: false, api: false }
                }
            });
        } catch (e) {
            // Ignora erro se criado em paralelo
            plan = await prisma.plan.findUnique({ where: { id: 'basic' } });
        }
    }

    // 4. Transação Atômica (Tenant + User)
    const result = await prisma.$transaction(async (tx) => {
      // Criar Empresa
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          ownerName: data.ownerName,
          email: data.email,
          status: 'active',
          planId: 'basic'
        }
      });

      // Criar Usuário Admin vinculado
      const user = await tx.user.create({
        data: {
          name: data.ownerName,
          email: data.email,
          password: passwordHash,
          role: 'admin',
          tenantId: tenant.id
        }
      });

      return { tenant, user };
    });

    // Remover senha do retorno
    const { password, ...safeUser } = result.user as any;
    return { tenant: result.tenant, user: safeUser };
  }

  // Login Seguro
  async login(data: { email: string; password?: string }) {
    const user = await prisma.user.findFirst({ 
        where: { email: data.email },
        include: { tenant: true }
    });
    
    if (!user) throw new Error('Email ou senha inválidos.');
    
    // Validar status da empresa
    if (user.tenant?.status === 'suspended') {
        throw new Error('Conta suspensa. Entre em contato com o suporte.');
    }

    // Comparar senha
    const userWithPass = user as any;
    const isValid = await bcrypt.compare(data.password || '', userWithPass.password);
    
    if (!isValid) throw new Error('Email ou senha inválidos.');

    const { password, ...safeUser } = userWithPass;
    return safeUser;
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
