import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_API_KEY;
const localUrl = `file:${path.join(process.cwd(), "dev.db")}`;

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrate: {
    async adapter() {
      const { PrismaLibSql } = await import("@prisma/adapter-libsql");

      if (tursoUrl) {
        return new PrismaLibSql({ url: tursoUrl, authToken: tursoToken });
      }

      return new PrismaLibSql({ url: localUrl });
    },
  },
  datasource: {
    url: tursoUrl ?? localUrl,
  },
});
