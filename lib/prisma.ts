import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  let adapter: PrismaLibSql;

  if (tursoUrl) {
    // Production: Turso cloud database
    adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoToken,
    });
  } else {
    // Development: local SQLite file
    const dbPath = path.join(process.cwd(), "dev.db");
    adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
