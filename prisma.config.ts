import { defineConfig } from "prisma";

export default defineConfig({
  schema: "prisma/schema.prisma",
  seed: "tsx prisma/seed.ts",
});

