import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertProjectOwner } from "@/lib/auth-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { error } = await assertProjectOwner(projectId, user.id!);
  if (error) return error;

  const { name, content, path, mimeType } = await req.json();
  const doc = await prisma.document.create({
    data: { name, content: content ?? "", path: path ?? name, mimeType: mimeType ?? "text/plain", projectId },
  });
  return NextResponse.json(doc);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { error } = await assertProjectOwner(projectId, user.id!);
  if (error) return error;

  const docs = await prisma.document.findMany({ where: { projectId }, orderBy: { path: "asc" } });
  return NextResponse.json(docs);
}
