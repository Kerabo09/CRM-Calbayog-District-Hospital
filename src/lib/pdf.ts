import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/** Standard PDF fonts only support Latin-1, so swap anything else (₱, –, curly quotes) for safe characters. */
export const clean = (s: string | null | undefined) => (s ?? "—").replace(/₱/g, "PHP ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "-");
export const php = (n: number | string) => "PHP " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const INK = rgb(0.12, 0.16, 0.23), GREY = rgb(0.45, 0.5, 0.58), TEAL = rgb(0, 0.5, 0.49);

/** Tiny top-to-bottom PDF writer with the CDH letterhead. */
export class PdfWriter {
  pdf!: PDFDocument; page!: PDFPage; font!: PDFFont; bold!: PDFFont;
  y = 800; readonly M = 50; readonly W = 495;

  static async create(subtitle: string) {
    const w = new PdfWriter();
    w.pdf = await PDFDocument.create();
    w.font = await w.pdf.embedFont(StandardFonts.Helvetica);
    w.bold = await w.pdf.embedFont(StandardFonts.HelveticaBold);
    w.page = w.pdf.addPage([595, 842]);
    const logo = await w.pdf.embedPng(await readFile(path.join(process.cwd(), "public", "logo.png")));
    w.page.drawImage(logo, { x: w.M, y: w.y - 40, width: 48, height: 48 });
    w.page.drawText("Calbayog District Hospital", { x: w.M + 60, y: w.y - 10, size: 15, font: w.bold, color: INK });
    w.page.drawText(clean(`Calbayog City, Samar, Philippines  |  ${subtitle}`), { x: w.M + 60, y: w.y - 28, size: 9, font: w.font, color: GREY });
    w.y -= 70; w.rule(TEAL, 1); w.y -= 26;
    return w;
  }
  ensure(h: number) { if (this.y - h < 70) { this.page = this.pdf.addPage([595, 842]); this.y = 800; } }
  rule(color = GREY, thickness = 0.5) { this.page.drawLine({ start: { x: this.M, y: this.y }, end: { x: this.M + this.W, y: this.y }, thickness, color }); }
  text(s: string, o: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
    this.page.drawText(clean(s), { x: o.x ?? this.M, y: this.y, size: o.size ?? 10, font: o.bold ? this.bold : this.font, color: o.color ?? INK });
  }
  /** Draws right-aligned text ending at the right margin. */
  right(s: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
    const f = o.bold ? this.bold : this.font, size = o.size ?? 10, str = clean(s);
    this.page.drawText(str, { x: this.M + this.W - f.widthOfTextAtSize(str, size), y: this.y, size, font: f, color: o.color ?? INK });
  }
  para(s: string, size = 10.5, x = this.M, width = this.W - (x - this.M)) {
    for (const p of clean(s).split("\n")) {
      let line = "";
      for (const word of p.split(" ")) {
        const t = line ? `${line} ${word}` : word;
        if (this.font.widthOfTextAtSize(t, size) > width && line) { this.ensure(16); this.text(line, { size, x }); this.y -= size + 4; line = word; } else line = t;
      }
      this.ensure(16); this.text(line, { size, x }); this.y -= size + 4;
    }
  }
  footer(s: string) { this.pdf.getPages().forEach((p) => p.drawText(clean(s), { x: this.M, y: 40, size: 8, font: this.font, color: GREY })); }
  async save() { return Buffer.from(await this.pdf.save()); }
}
