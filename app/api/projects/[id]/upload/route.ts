import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, assertProjectOwner } from "@/lib/auth-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const IMAGE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/svg+xml", "image/bmp", "image/tiff",
]);

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const BINARY_TYPES = new Set([
  DOCX_TYPE,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/pdf",
  "application/zip",
  "application/octet-stream",
]);

const IS_VERCEL = process.env.VERCEL === "1";

async function extractDocxContent(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });
    return result.value ?? "";
  } catch {
    return "";
  }
}

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
        fileUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
      } else {
        const uploadDir = path.join(process.cwd(), "public", "uploads", user.id!, projectId);
        await mkdir(uploadDir, { recursive: true });
        const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
        const fileName = `${Date.now()}_${safeName}`;
        await writeFile(path.join(uploadDir, fileName), buffer);
        fileUrl = `/uploads/${user.id}/${projectId}/${fileName}`;
      }

      // Extract editable HTML content from DOCX files
      const content = mimeType === DOCX_TYPE ? await extractDocxContent(buffer) : "";

      const doc = await prisma.document.create({
        data: { name: file.name, path: relativePath, content, mimeType, fileUrl, projectId },
      });
      created.push(doc);
    }

    return NextResponse.json(created);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
