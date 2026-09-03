import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Creates or promotes the single VentureMarket Admin account from
 * server-only environment variables. This is the ONLY supported way to
 * create an Admin account — there is no API endpoint, request field, or UI
 * flow that can grant the ADMIN role.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD='...' npm run admin:bootstrap
 *
 * Safe to re-run: it upserts by email, so running it again (e.g. to rotate
 * the password) just updates the existing account rather than duplicating
 * it. It never touches any other user.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must both be set in the environment to run this script. ' +
        'These are server-only secrets — never commit them, never expose them to the frontend.',
    );
  }
  if (password.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters (same policy as normal accounts).');
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'VentureMarket', lastName: 'Admin' } },
      notificationPreference: { create: {} },
    },
    update: {
      // Re-running rotates the password and guarantees the account stays an
      // active, verified Admin even if it had drifted (e.g. suspended).
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // Never log the password or hash — only confirm which account now has
  // Admin access.
  // eslint-disable-next-line no-console
  console.log(`Admin account ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
