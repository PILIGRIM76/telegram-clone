import { PrismaLibReader } from '@prisma/dev-prisma';

export default {
  schema: 'file:./schema.prisma',
  dataProxy: 'verified',
  experimental: {
    loadRawDbColumnNames: true,
  },
};

// DATABASE_URL должен быть в .env файле
// DATABASE_URL="postgresql://cipherlink:cipherlink_password@localhost:5432/cipherlink_db?schema=public"
