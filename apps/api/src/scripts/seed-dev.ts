import 'dotenv/config';
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../prisma/prisma-client.factory';
import { hashPassword } from '../auth/auth-crypto';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

const DEV_SEED_USER_ID = process.env.DEV_SEED_USER_ID || '11111111-1111-1111-1111-111111111111';
const DEV_SEED_USER_EMAIL = process.env.DEV_SEED_USER_EMAIL || 'dev@jurnalsaham.local';
const DEV_SEED_WORKSPACE_ID = process.env.DEV_SEED_WORKSPACE_ID || '22222222-2222-2222-2222-222222222222';
const DEV_SEED_PORTFOLIO_ID = process.env.DEV_SEED_PORTFOLIO_ID || '33333333-3333-3333-3333-333333333333';
const ADMIN_SEED_USER_ID = process.env.ADMIN_SEED_USER_ID || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ADMIN_SEED_USER_EMAIL = process.env.ADMIN_SEED_USER_EMAIL || 'admin@admin.com';
const ADMIN_SEED_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'admin123';

async function main() {
  const [devPasswordHash, adminPasswordHash] = await Promise.all([
    hashPassword('dev-seed-password'),
    hashPassword(ADMIN_SEED_PASSWORD),
  ]);

  await prisma.user.upsert({
    where: { id: DEV_SEED_USER_ID },
    update: {
      email: DEV_SEED_USER_EMAIL,
      passwordHash: devPasswordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
    create: {
      id: DEV_SEED_USER_ID,
      email: DEV_SEED_USER_EMAIL,
      passwordHash: devPasswordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.profile.upsert({
    where: { userId: DEV_SEED_USER_ID },
    update: {
      displayName: 'Developer Seed',
      defaultRole: 'admin',
    },
    create: {
      userId: DEV_SEED_USER_ID,
      displayName: 'Developer Seed',
      defaultRole: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { id: ADMIN_SEED_USER_ID },
    update: {
      email: ADMIN_SEED_USER_EMAIL,
      passwordHash: adminPasswordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
    create: {
      id: ADMIN_SEED_USER_ID,
      email: ADMIN_SEED_USER_EMAIL,
      passwordHash: adminPasswordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.profile.upsert({
    where: { userId: ADMIN_SEED_USER_ID },
    update: {
      displayName: 'Administrator',
      defaultRole: 'admin',
    },
    create: {
      userId: ADMIN_SEED_USER_ID,
      displayName: 'Administrator',
      defaultRole: 'admin',
    },
  });

  await prisma.workspace.upsert({
    where: { id: DEV_SEED_WORKSPACE_ID },
    update: {
      name: 'Developer Workspace',
      ownerUserId: DEV_SEED_USER_ID,
    },
    create: {
      id: DEV_SEED_WORKSPACE_ID,
      name: 'Developer Workspace',
      ownerUserId: DEV_SEED_USER_ID,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: DEV_SEED_WORKSPACE_ID,
        userId: DEV_SEED_USER_ID,
      },
    },
    update: {
      role: 'admin',
    },
    create: {
      workspaceId: DEV_SEED_WORKSPACE_ID,
      userId: DEV_SEED_USER_ID,
      role: 'admin',
    },
  });

  await prisma.portfolio.upsert({
    where: { id: DEV_SEED_PORTFOLIO_ID },
    update: {
      ownerUserId: DEV_SEED_USER_ID,
      workspaceId: null,
      name: 'Portofolio Utama',
      isDefault: true,
      displayOrder: 0,
    },
    create: {
      id: DEV_SEED_PORTFOLIO_ID,
      ownerUserId: DEV_SEED_USER_ID,
      workspaceId: null,
      name: 'Portofolio Utama',
      description: 'Default portfolio for local backend development',
      isDefault: true,
      displayOrder: 0,
    },
  });

  console.log(
    JSON.stringify(
      {
        userId: DEV_SEED_USER_ID,
        email: DEV_SEED_USER_EMAIL,
        workspaceId: DEV_SEED_WORKSPACE_ID,
        defaultPortfolioId: DEV_SEED_PORTFOLIO_ID,
        adminUserId: ADMIN_SEED_USER_ID,
        adminEmail: ADMIN_SEED_USER_EMAIL,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
