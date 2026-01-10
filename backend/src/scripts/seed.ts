
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed do Banco de Dados...');

  // 1. Criar Planos Padrão
  const basicPlan = await prisma.plan.upsert({
    where: { id: 'basic' },
    update: {},
    create: {
      id: 'basic',
      name: 'Start',
      price: 199.90,
      active: true,
      limits: {
        users: 3,
        connections: 1,
        messages: 1000
      },
      features: {
        crm: true,
        campaigns: false,
        api: false,
        automations: false,
        reports: true
      }
    }
  });

  const proPlan = await prisma.plan.upsert({
    where: { id: 'pro' },
    update: {},
    create: {
      id: 'pro',
      name: 'Professional',
      price: 499.90,
      active: true,
      limits: {
        users: 10,
        connections: 3,
        messages: 10000
      },
      features: {
        crm: true,
        campaigns: true,
        api: true,
        automations: true,
        reports: true
      }
    }
  });

  console.log('✅ Planos criados/verificados.');

  // 2. Criar Tenant "Matriz" (Super Admin Tenant)
  const adminTenant = await prisma.tenant.upsert({
    where: { id: 'super-admin-tenant' }, // Use um ID fixo ou email único se preferir
    update: {},
    create: {
      id: 'super-admin-tenant',
      name: 'Administração SaaS',
      email: 'admin@saas.com',
      ownerName: 'Super Admin',
      status: 'active',
      planId: 'pro'
    }
  });

  // 3. Criar Usuário Super Admin
  const email = 'admin@admin.com';
  const password = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      password: password, // Atualiza a senha caso já exista
      role: 'super_admin'
    },
    create: {
      name: 'Super Admin',
      email,
      password,
      role: 'super_admin',
      tenantId: adminTenant.id
    }
  });

  console.log(`
  ✅ Seed concluído com sucesso!
  
  ------------------------------------------------
  🔑 Credenciais de Acesso Super Admin:
  Email: ${email}
  Senha: admin123
  ------------------------------------------------
  `);
}

main()
  .catch((e) => {
    console.error(e);
    (process as any).exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
