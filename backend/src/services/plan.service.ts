
import { prisma } from '../lib/prisma';

export class PlanService {
  async create(data: { 
    name: string; 
    price: number; 
    limits: any; 
    features: any; 
  }) {
    console.log(`[SAAS] Criando plano: ${data.name}`);
    
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        price: data.price,
        limits: data.limits,     // JSONB field in Postgres
        features: data.features, // JSONB field in Postgres
        active: true
      }
    });

    return plan;
  }

  async list(onlyActive = false) {
    const where = onlyActive ? { active: true } : {};
    return prisma.plan.findMany({
      where,
      orderBy: { price: 'asc' }
    });
  }

  async getById(id: string) {
    return prisma.plan.findUnique({
      where: { id }
    });
  }

  async update(id: string, data: any) {
    console.log(`[SAAS] Atualizando plano: ${id}`);
    return prisma.plan.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    // Check if any tenant is using this plan
    const usageCount = await prisma.tenant.count({
      where: { planId: id }
    });

    if (usageCount > 0) {
      throw new Error(`Não é possível excluir este plano pois existem ${usageCount} empresas vinculadas a ele. Tente arquivá-lo.`);
    }

    console.log(`[SAAS] Removendo plano: ${id}`);
    return prisma.plan.delete({
      where: { id }
    });
  }
}
