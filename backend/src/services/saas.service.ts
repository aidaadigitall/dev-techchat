
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
    
    return {
      tenant: result.tenant,
      user: safeUser
    };
  }

  /**
   * Autentica um usuário e retorna seus dados.
   */
  async login(data: LoginDTO) {
    // Busca usuário pelo email
    const user = await prisma.user.findFirst({ 
      where: { email: data.email }
    });

    // Segurança: Mensagem genérica para não revelar se email existe
    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    // Casting para any para acessar password caso o tipo gerado do Prisma esteja desatualizado
    const userWithPassword = user as any;

    if (!userWithPassword.password) {
       throw new Error('Usuário sem senha definida. Contate o suporte.');
    }

    const isValid = await bcrypt.compare(data.password || '', userWithPassword.password);

    if (!isValid) {
      throw new Error('Credenciais inválidas.');
    }

    // Remove a senha do objeto retornado
    const { password, ...safeUser } = userWithPassword;
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
