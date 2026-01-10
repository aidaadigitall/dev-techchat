
import { prisma } from '../lib/prisma';

export class TenantService {
  async create(data: { name: string; email: string; ownerName: string; planId?: string }) {
    console.log(`[SAAS] Criando tenant: ${data.name}`);
    
    // Validate Plan if provided
    if (data.planId) {
       const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
       if (!plan) throw new Error("Plano informado não existe.");
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        email: data.email,
        ownerName: data.ownerName,
        status: 'active',
        planId: data.planId || null
      }
    });

    console.log(`[SAAS] Tenant criado com sucesso: ${tenant.id}`);
    return tenant;
  }

  async list() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        // Include plan details for the frontend list
        plan: {
          select: { name: true, price: true }
        }
      }
    });
  }

  async getById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      include: { plan: true }
    });
  }

  async update(id: string, data: any) {
    console.log(`[SAAS] Atualizando tenant: ${id}`);
    return prisma.tenant.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    console.log(`[SAAS] Removendo tenant: ${id}`);
    
    // Transactional cleanup could be implemented here (delete users, messages, etc.)
    return prisma.tenant.delete({
      where: { id }
    });
  }
}
