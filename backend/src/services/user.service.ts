
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class UserService {
  async create(data: { name: string; email: string; password?: string; tenantId: string; role?: string }) {
    console.log(`[SAAS] Criando usuário: ${data.email} para tenant ${data.tenantId}`);

    const existing = await prisma.user.findFirst({ where: { email: data.email } });
    if (existing) throw new Error('Email already in use');

    // Hash password if provided (or set a default)
    const passwordHash = data.password 
      ? await bcrypt.hash(data.password, 10)
      : await bcrypt.hash('123456', 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash, // Assuming your prisma schema has a password field. If not, you need to add it.
        tenantId: data.tenantId,
        role: data.role || 'admin'
      }
    });

    // Remove password from return
    const { password, ...result } = user as any;
    return result;
  }

  async login(email: string, pass: string) {
    console.log(`[SAAS] Tentativa de login: ${email}`);
    
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    // Assuming user model has 'password' field. 
    // If your schema uses Supabase auth table externally, this logic changes.
    // Here we implement pure DB auth as requested.
    const isValid = await bcrypt.compare(pass, (user as any).password);
    if (!isValid) throw new Error('Invalid credentials');

    const { password, ...result } = user as any;
    return result;
  }

  async list(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    return prisma.user.findMany({ 
      where,
      select: { id: true, name: true, email: true, role: true, tenantId: true, createdAt: true }
    });
  }
}
