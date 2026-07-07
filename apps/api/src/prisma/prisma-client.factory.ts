import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize PrismaClient.');
  }
  return databaseUrl;
}

export function createPrismaAdapter() {
  return new PrismaPg(getDatabaseUrl());
}

export function createPrismaClient() {
  return new PrismaClient({
    adapter: createPrismaAdapter(),
  });
}
