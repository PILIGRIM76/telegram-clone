import { PrismaLibReader } from '@prisma/dev-prisma';

const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://cipherlink:cypherlink_password@localhost:5432/cipherlink_db?schema=public';

export default {
  schema: 'file:./schema.prisma',
  dataProxy: 'verified',
  experimental: {
    loadRawDbColumnNames: true,
  },
};

// В Prisma 7.x DATABASE_URL должен быть в env файле
