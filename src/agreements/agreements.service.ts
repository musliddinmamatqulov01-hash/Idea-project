import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DealsService } from '../deals/deals.service';
import { ErrorCode } from '../common/constants/error-codes';
import { ConflictAppException, NotFoundAppException } from '../common/errors/app.exception';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { CreateAgreementVersionDto } from './dto/create-version.dto';

/**
 * Agreements produced here — including any AI-assisted drafts — are not
 * legal advice. `generatedByAI` and `reviewRequired` must always be surfaced
 * to clients so they never present a draft as final counsel.
 */
@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsService: DealsService,
  ) {}

  async create(user: AuthenticatedUser, dealId: string, dto: CreateAgreementDto) {
    await this.dealsService.assertParticipant(user.id, dealId);
    const agreement = await this.prisma.agreement.create({
      data: {
        dealId,
        title: dto.title,
        generatedByAI: dto.generatedByAI ?? false,
        reviewRequired: true,
      },
    });
    await this.dealsService.addTimelineEvent(dealId, 'AGREEMENT_CREATED', user.id, {
      agreementId: agreement.id,
    });
    return agreement;
  }

  async list(user: AuthenticatedUser, dealId: string) {
    await this.dealsService.assertParticipant(user.id, dealId);
    return this.prisma.agreement.findMany({
      where: { dealId },
      include: { versions: { include: { signatures: true }, orderBy: { version: 'desc' } } },
    });
  }

  async addVersion(
    user: AuthenticatedUser,
    dealId: string,
    agreementId: string,
    dto: CreateAgreementVersionDto,
  ) {
    await this.dealsService.assertParticipant(user.id, dealId);
    await this.getAgreement(dealId, agreementId); // throws if not found/not in this deal

    const latest = await this.prisma.agreementVersion.findFirst({
      where: { agreementId },
      orderBy: { version: 'desc' },
    });

    const version = await this.prisma.agreementVersion.create({
      data: {
        agreementId,
        version: (latest?.version ?? 0) + 1,
        contentUrl: dto.contentUrl,
        contentHash: dto.contentHash,
        createdById: user.id,
      },
    });

    await this.prisma.agreement.update({
      where: { id: agreementId },
      data: { status: 'PENDING_SIGNATURE' },
    });
    await this.dealsService.addTimelineEvent(dealId, 'AGREEMENT_VERSION_ADDED', user.id, {
      agreementId,
      version: version.version,
    });

    return version;
  }

  async sign(user: AuthenticatedUser, dealId: string, agreementId: string, versionId: string) {
    await this.dealsService.assertParticipant(user.id, dealId);
    const agreement = await this.getAgreement(dealId, agreementId);
    if (agreement.status === 'VOID') {
      throw new ConflictAppException(ErrorCode.CONFLICT, 'This agreement has been voided');
    }

    const signature = await this.prisma.agreementSignature.upsert({
      where: { agreementVersionId_userId: { agreementVersionId: versionId, userId: user.id } },
      create: { agreementVersionId: versionId, userId: user.id },
      update: {},
    });

    const participantCount = await this.prisma.dealParticipant.count({
      where: { dealId, role: { in: ['BUYER', 'SELLER'] } },
    });
    const signatureCount = await this.prisma.agreementSignature.count({
      where: { agreementVersionId: versionId },
    });

    await this.prisma.agreement.update({
      where: { id: agreementId },
      data: { status: signatureCount >= participantCount ? 'SIGNED' : 'PARTIALLY_SIGNED' },
    });

    await this.dealsService.addTimelineEvent(dealId, 'AGREEMENT_SIGNED', user.id, {
      agreementId,
      versionId,
    });

    return signature;
  }

  private async getAgreement(dealId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findFirst({ where: { id: agreementId, dealId } });
    if (!agreement) {
      throw new NotFoundAppException(ErrorCode.NOT_FOUND, 'Agreement not found');
    }
    return agreement;
  }
}
