import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertProjectOwner } from "@/lib/auth-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const IMAGE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/svg+xml", "image/bmp", "image/tiff",
]);

// Binary files that should be stored as files, not parsed as text
const BINARY_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/msword",        // doc
  "application/vnd.ms-excel",  // xls
  "application/vnd.ms-powerpoint", // ppt
  "application/pdf",
  "application/zip",
  "application/octet-stream",
]);

const IS_VERCEL = process.env.VERCEL === "1";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    const { error } = await assertProjectOwner(projectId, user.id!);
    if (error) return error;

    const formData = await req.formData();
    const created = [];

    for (const [, value] of formData.entries()) {
      if (typeof value === "string") continue;
      const file = value as File;

      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const mimeType = file.type || "application/octet-stream";
      if (!IMAGE_TYPES.has(mimeType) && !BINARY_TYPES.has(mimeType)) continue;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      let fileUrl: string;
      if (IS_VERCEL) {
        // Vercel: no persistent filesystem — store as base64 data URL
        fileUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
      } else {
        // Local dev: store under public/uploads/[userId]/[projectId]/
        const uploadDir = path.join(process.cwd(), "public", "uploads", user.id!, projectId);
        await mkdir(uploadDir, { recursive: true });
        const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
        const fileName = `${Date.now()}_${safeName}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        fileUrl = `/uploads/${user.id}/${projectId}/${fileName}`;
      }

      const doc = await prisma.document.create({
        data: { name: file.name, path: relativePath, content: "", mimeType, fileUrl, projectId },
      });
      created.push(doc);
    }

    return NextResponse.json(created);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
