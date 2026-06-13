import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import ExcelJS from "exceljs";

export async function POST(req: Request) {
  const { format, content, title } = await req.json();

  if (format === "docx") {
    const lines = (content as string).split("\n");
    const paragraphs = lines.map((line: string) => {
      if (line.startsWith("# ")) {
        return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
      } else if (line.startsWith("## ")) {
        return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
      } else if (line.startsWith("### ")) {
        return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        return new Paragraph({ text: line.slice(2), bullet: { level: 0 } });
      } else {
        return new Paragraph({ children: [new TextRun({ text: line })] });
      }
    });

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title ?? "document")}.docx"`,
      },
    });
  }

  if (format === "xlsx") {
    let data: { headers: string[]; rows: string[][] };
    try {
      data = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      return NextResponse.json({ error: "Invalid spreadsheet data" }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(title ?? "Data");
    sheet.addRow(data.headers);
    data.rows.forEach((row) => sheet.addRow(row));

    sheet.getRow(1).font = { bold: true };
    sheet.columns = data.headers.map((h) => ({ header: h, key: h, width: 20 }));

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title ?? "data")}.xlsx"`,
      },
    });
  }

  if (format === "html") {
    const html = typeof content === "string" ? content : JSON.stringify(content);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title ?? "infographic")}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
