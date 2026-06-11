import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Returns the single local author (slice 1 is single-profile; auth drops in later). */
export async function getAuthor() {
  let author = await prisma.author.findFirst({ include: { settings: true } });
  if (!author) {
    author = await prisma.author.create({
      data: {
        name: "Author",
        settings: { create: {} },
      },
      include: { settings: true },
    });
  }
  if (!author.settings) {
    await prisma.settings.create({ data: { authorId: author.id } });
    author = await prisma.author.findFirstOrThrow({ include: { settings: true } });
  }
  return author;
}
