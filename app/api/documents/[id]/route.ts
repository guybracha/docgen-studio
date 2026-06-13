import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { unlink } from "fs/promises";
import path from "path";

async function checkDocAccess(docId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { project: { select: { userId: true } } },
  });
  if (!doc) return { doc: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (doc.project.userId !== userId) return { doc: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { doc, error: null };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { doc, error } = await checkDocAccess(id, user.id!);
  if (error) return error;
  return NextResponse.json(doc);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await checkDocAccess(id, user.id!);
  if (error) return error;

  const body = await req.json();
  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...(body.content !== undefined && { content: body.content }),
      ...(body.name !== undefined && { name: body.name }),
    },
  });
  return NextResponse.json(doc);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { doc, error } = await checkDocAccess(id, user.id!);
  if (error) return error;

  // Only delete physical files (not base64 data URLs)
  if (doc?.fileUrl && doc.fileUrl.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", doc.fileUrl)).catch(() => {});
  }
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
