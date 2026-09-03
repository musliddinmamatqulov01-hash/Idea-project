import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { nanoid } from 'nanoid';
import { createTestApp } from './utils/test-app';
import { PrismaService } from '../src/database/prisma.service';

/**
 * End-to-end coverage of the core marketplace journey:
 * seller creates + publishes a listing -> buyer offers -> seller counters ->
 * buyer accepts -> a Deal room is created transactionally. Also asserts the
 * IDOR/object-level-authorization boundaries around offers and documents.
 *
 * Requires a live PostgreSQL + Redis reachable via .env — point at a
 * disposable test database.
 */
describe('Deal flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const password = 'CorrectHorseBattery9!';
  const sellerEmail = `seller-${nanoid(8)}@example.com`;
  const buyerEmail = `buyer-${nanoid(8)}@example.com`;
  const outsiderEmail = `outsider-${nanoid(8)}@example.com`;

  let sellerCookies: string[];
  let buyerCookies: string[];
  let outsiderCookies: string[];
  let categoryId: string;
  let businessId: string;
  let offerId: string;
  let dealId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await registerAndVerify(sellerEmail, 'SELLER');
    await registerAndVerify(buyerEmail, 'BUYER');
    await registerAndVerify(outsiderEmail, 'BUYER');

    sellerCookies = await login(sellerEmail);
    buyerCookies = await login(buyerEmail);
    outsiderCookies = await login(outsiderEmail);

    const category = await prisma.businessCategory.upsert({
      where: { name: `E2E Category ${nanoid(4)}` },
      create: { name: `E2E Category ${nanoid(4)}`, slug: `e2e-category-${nanoid(6)}` },
      update: {},
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndVerify(email: string, role: 'BUYER' | 'SELLER'): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, role })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
  }

  async function login(email: string): Promise<string[]> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.headers['set-cookie'] as unknown as string[];
  }

  it('seller creates a business', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/businesses')
      .set('Cookie', sellerCookies)
      .send({
        name: `E2E Test Business ${nanoid(6)}`,
        description: 'A test SaaS business for e2e coverage',
        categoryId,
        businessModel: 'SaaS',
        country: 'US',
      })
      .expect(201);

    businessId = res.body.data.id;
    expect(res.body.data.status).toBe('DRAFT');
  });

  it('buyer cannot see the unpublished business via the public listings detail endpoint', async () => {
    await request(app.getHttpServer()).get(`/api/v1/listings/${businessId}`).expect(404);
  });

  it('outsider cannot fetch the business via the owner-only endpoint (IDOR check)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/businesses/${businessId}`)
      .set('Cookie', outsiderCookies)
      .expect(404);
    expect(res.body.error.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('seller sets an asking price and publishes the listing', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/businesses/${businessId}/listing`)
      .set('Cookie', sellerCookies)
      .send({ askingPrice: 50000, visibility: 'PUBLIC' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/businesses/${businessId}/publish`)
      .set('Cookie', sellerCookies)
      .expect(201);

    expect(res.body.data.status).toBe('PUBLISHED');
  });

  it('the business now appears in public search', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/listings').expect(200);
    expect(res.body.data.some((item: { id: string }) => item.id === businessId)).toBe(true);
  });

  it('seller cannot make an offer on their own business', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/businesses/${businessId}/offers`)
      .set('Cookie', sellerCookies)
      .send({ amount: 40000 })
      .expect(403);
    expect(res.body.error.code).toBe('OFFER_NOT_ALLOWED');
  });

  it('buyer submits an offer', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/businesses/${businessId}/offers`)
      .set('Cookie', buyerCookies)
      .send({ amount: 40000, terms: 'Cash, 30-day close' })
      .expect(201);

    offerId = res.body.data.id;
    expect(res.body.data.status).toBe('SUBMITTED');
  });

  it('an outsider cannot read the offer (IDOR check)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/offers/${offerId}`)
      .set('Cookie', outsiderCookies)
      .expect(404);
  });

  it('an outsider cannot accept the offer (IDOR check)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/offers/${offerId}/accept`)
      .set('Cookie', outsiderCookies)
      .expect(404);
  });

  it('buyer cannot accept their own offer', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/offers/${offerId}/accept`)
      .set('Cookie', buyerCookies)
      .expect(403);
    expect(res.body.error.code).toBe('OFFER_NOT_ALLOWED');
  });

  it('seller counters the offer', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/offers/${offerId}/counter`)
      .set('Cookie', sellerCookies)
      .send({ amount: 46000 })
      .expect(201);

    offerId = res.body.data.id; // counter creates a new Offer row in the chain
    expect(res.body.data.status).toBe('SUBMITTED');
    expect(res.body.data.amountMinor).toBe('4600000');
  });

  it('buyer accepts the counter — a Deal is created transactionally', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/offers/${offerId}/accept`)
      .set('Cookie', buyerCookies)
      .expect(201);

    dealId = res.body.data.id;
    expect(res.body.data.status).toBe('INITIATED');

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    expect(business.status).toBe('SOLD');
  });

  it('a second accept attempt on the same offer fails (no double-accept race)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/offers/${offerId}/accept`)
      .set('Cookie', buyerCookies)
      .expect(409);
    expect(res.body.error.code).toBe('OFFER_ALREADY_ACCEPTED');
  });

  it('an outsider cannot read the deal room (IDOR check)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/deals/${dealId}`)
      .set('Cookie', outsiderCookies)
      .expect(404);
  });

  it('both deal participants can read the deal room', async () => {
    const asBuyer = await request(app.getHttpServer())
      .get(`/api/v1/deals/${dealId}`)
      .set('Cookie', buyerCookies)
      .expect(200);
    const asSeller = await request(app.getHttpServer())
      .get(`/api/v1/deals/${dealId}`)
      .set('Cookie', sellerCookies)
      .expect(200);

    expect(asBuyer.body.data.participants).toHaveLength(2);
    expect(asSeller.body.data.participants).toHaveLength(2);
  });

  it('a private document uploaded to the deal is not accessible to an outsider', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post(`/api/v1/businesses/${businessId}/documents`)
      .set('Cookie', sellerCookies)
      .field('dealId', dealId)
      .field('category', 'FINANCIAL')
      .attach('file', Buffer.from('confidential financials'), {
        filename: 'financials.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    const documentId = uploadRes.body.data.id;

    await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}/download`)
      .set('Cookie', outsiderCookies)
      .expect(403);

    const asBuyer = await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentId}/download`)
      .set('Cookie', buyerCookies)
      .expect(200);
    expect(asBuyer.body.data.url).toBeDefined();
  });
});
