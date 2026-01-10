
import { prisma } from '../lib/prisma';

export class TenantService {
  async create(data: { name: string; email: string; ownerName: string; planId?: string }) {
    console.log(`[SAAS] Criando tenant: ${data.name}`);
    
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        email: data.email,
        ownerName: data.ownerName,
        status: 'active',
        // If you have a Plan relation, connect it here, otherwise just store ID
        // planId: data.planId 
      }
    });

    console.log(`[SAAS] Tenant criado com sucesso: ${tenant.id}`);
    return tenant;
  }

  async list() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(id: string) {
    return prisma.tenant.findUnique({
      where: { id }
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
    // Ideally, implement soft delete or cascading delete logic here
    return prisma.tenant.delete({
      where: { id }
    });
  }
}
