import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function BookIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, select: { status: true } });
  if (project && project.status !== "draft") redirect(`/studio/book/${id}/write`);
  redirect(`/studio/book/${id}/blueprint`);
}
