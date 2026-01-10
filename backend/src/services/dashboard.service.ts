
import { prisma } from '../lib/prisma';

export class DashboardService {
  async getMetrics() {
    console.log(`[SAAS] Calculando métricas globais`);

    const [
      totalTenants,
      totalUsers,
      totalMessages, // Assuming Message table exists
      recentTenants
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.message.count().catch(() => 0), // Fallback if table empty/error
      prisma.tenant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, status: true }
      })
    ]);

    // Mock MRR calculation (Sum of plan prices if Plan table existed)
    // For now, assuming fixed value per tenant
    const estimatedMRR = totalTenants * 199.90; 

    return {
      overview: {
        totalTenants,
        activeUsers: totalUsers,
        totalMessages,
        mrr: estimatedMRR
      },
      recentActivity: recentTenants,
      churnRate: 0 // Implement logic later
    };
  }
}
