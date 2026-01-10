
import { prisma } from '../lib/prisma';

export class ContactService {
  async list(tenantId: string) {
    if (!tenantId) throw new Error("Tenant ID required");
    // Assumindo que a tabela Contact tem coluna company_id ou tenantId
    // Baseado no webhook.routes.ts, usa 'contacts' e 'company_id'
    return prisma.contact.findMany({
      where: { company_id: tenantId },
      orderBy: { last_message_at: 'desc' }
    });
  }

  async create(tenantId: string, data: { name: string; phone: string; email?: string }) {
    if (!tenantId) throw new Error("Tenant ID required");
    
    return prisma.contact.create({
      data: {
        company_id: tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        status: 'saved', // default status
        last_message_at: new Date()
      }
    });
  }

  async update(id: string, data: any) {
    return prisma.contact.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.contact.delete({
      where: { id }
    });
  }
}
