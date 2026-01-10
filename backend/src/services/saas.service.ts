
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

interface CreateTenantDTO {
  companyName: string;
  ownerName: string;
  email: string;
  password?: string;
}

interface LoginDTO {
  email: string;
  password?: string;
}

export class SaasService {
  
  /**
   * Cria uma nova empresa (Tenant) e o usuário administrador inicial.
   */
  async createTenant(data: CreateTenantDTO) {
    // 1. Verificar se o email já está em uso
    const existingUser = await prisma.user.findFirst({ 
      where: { email: data.email } 
    });
    
    if (existingUser) {
      throw new Error('Este email já está cadastrado no sistema.');
    }

    // 2. Hash da senha
    const passwordHash = await bcrypt.hash(data.password || '123456', 10);

    // 3. Transação: Criar Tenant e Usuário Admin
    // Usamos transaction para garantir que ou cria tudo ou nada
    const result = await prisma.$transaction(async (tx) => {
      // Criar Empresa
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          ownerName: data.ownerName,
          email: data.email,
          status: 'active',
          planId: 'basic' // Plano padrão
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
    const { password, ...safeUser } = result.user;
    
    return {
      tenant: result.tenant,
      user: safeUser
    };
  }

  /**
   * Autentica um usuário e retorna seus dados.
   */
  async login(data: LoginDTO) {
    const user = await prisma.user.findFirst({ 
      where: { email: data.email },
      include: {
        // Opcional: incluir dados da empresa se necessário
        // tenant: true 
      }
    });

    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    // @ts-ignore - Prisma types workaround if password field is missing in generated client type
    const isValid = await bcrypt.compare(data.password || '', user.password);

    if (!isValid) {
      throw new Error('Credenciais inválidas.');
    }

    // @ts-ignore
    const { password, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Lista todas as empresas (Apenas Super Admin)
   */
  async listTenants() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
  }
}
