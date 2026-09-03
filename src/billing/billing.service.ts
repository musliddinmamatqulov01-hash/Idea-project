import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ErrorCode } from '../common/constants/error-codes';
import { NotFoundAppException } from '../common/errors/app.exception';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.plan.findMany({ where: { active: true } });
  }

  async getOwnSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async subscribe(userId: string, planCode: string) {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode as never } });
    if (!plan || !plan.active) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'Plan not found');
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plan: true },
    });
  }
}
