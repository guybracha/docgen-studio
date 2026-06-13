import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();

    if (!email || !token || !password) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
    }

    const record = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    });

    if (!record) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 400 });
    }
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });
      return NextResponse.json({ error: "הקישור פג תוקף — בקש איפוס חדש" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email }, data: { passwordHash } });
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "שגיאה באיפוס הסיסמה" }, { status: 500 });
  }
}
