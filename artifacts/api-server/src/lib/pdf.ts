import PDFDocument from "pdfkit";
import type { ScoreResult } from "@workspace/api-zod";

const TEAL = "#14b8a6";
const DARK = "#0a0d12";
const DARK_CARD = "#141820";
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_MUTED = "#94a3b8";
const BORDER = "#1e2a3a";

function getLabelColor(label: string): string {
  switch (label) {
    case "elite": return "#14b8a6";
    case "strong": return "#3b82f6";
    case "developing": return "#f59e0b";
    case "weak": return "#ef4444";
    default: return "#64748b";
  }
}

export function generateScorePdf(score: ScoreResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: "Executive Presence Report — Kyronix.ai",
        Author: "Kyronix.ai",
        Subject: "LinkedIn Executive Presence Score",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const margin = 48;
    const contentW = pageW - margin * 2;

    // — Background
    doc.rect(0, 0, pageW, pageH).fill(DARK);

    // — Header bar
    doc.rect(0, 0, pageW, 72).fill(DARK_CARD);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(TEAL)
      .text("KYRONIX.AI", margin, 28, { characterSpacing: 2 });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(TEXT_MUTED)
      .text("Executive Presence Report", pageW - margin - 160, 28, {
        width: 160,
        align: "right",
      });

    // — Profile URL
    let y = 96;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .text("LINKEDIN PROFILE", margin, y, { characterSpacing: 1 });
    y += 16;
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(TEXT_PRIMARY)
      .text(score.linkedin_url || "", margin, y, { width: contentW });
    y += 32;

    // — Score hero
    doc.rect(margin, y, contentW, 100).fill(DARK_CARD);
    // subtle teal border left
    doc.rect(margin, y, 3, 100).fill(TEAL);

    const overallScore = score.overall_score ?? 0;
    const percentile = score.percentile ?? 0;

    doc
      .font("Helvetica-Bold")
      .fontSize(56)
      .fillColor(TEAL)
      .text(String(overallScore), margin + 24, y + 18, { width: 120, align: "left" });

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(TEXT_MUTED)
      .text("/ 100", margin + 24, y + 76, { width: 100 });

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(TEXT_PRIMARY)
      .text(score.archetype || "", margin + 160, y + 20, { width: contentW - 180 });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(TEXT_MUTED)
      .text(
        `You score higher than ${percentile}% of LinkedIn profiles`,
        margin + 160,
        y + 42,
        { width: contentW - 180 },
      );

    if (score.archetype_description) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(TEXT_MUTED)
        .text(score.archetype_description, margin + 160, y + 62, {
          width: contentW - 180,
          lineGap: 2,
        });
    }

    y += 120;

    // — Category breakdown
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(TEXT_MUTED)
      .text("CATEGORY BREAKDOWN", margin, y, { characterSpacing: 1.5 });
    y += 20;

    const categories = (score.categories as any[]) || [];
    for (const cat of categories) {
      if (y > pageH - 80) {
        doc.addPage();
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK);
        y = margin;
      }

      const pct = cat.max_score > 0 ? cat.score / cat.max_score : 0;
      const barW = Math.round(contentW * pct);
      const labelColor = getLabelColor(cat.label);

      // Category row
      doc.rect(margin, y, contentW, 48).fill(DARK_CARD);

      // Name & score
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(TEXT_PRIMARY)
        .text(cat.name, margin + 12, y + 9, { width: 200 });

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(labelColor)
        .text(`${cat.score} / ${cat.max_score}`, margin + contentW - 80, y + 9, {
          width: 68,
          align: "right",
        });

      // Label badge
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(labelColor)
        .text(cat.label.toUpperCase(), margin + 12, y + 30, { characterSpacing: 0.8 });

      // Progress bar background
      doc.rect(margin + 220, y + 18, contentW - 300, 8).fill(BORDER);
      // Progress bar fill
      if (barW > 0) {
        const fillW = Math.round((contentW - 300) * pct);
        doc.rect(margin + 220, y + 18, fillW, 8).fill(labelColor);
      }

      y += 56;

      // Fixes
      for (const fix of cat.fixes || []) {
        if (y > pageH - 50) {
          doc.addPage();
          doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK);
          y = margin;
        }
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(TEXT_MUTED)
          .text(`• ${fix}`, margin + 16, y, { width: contentW - 32, lineGap: 2 });
        y += 20;
      }

      y += 8;
    }

    // — Footer
    const footerY = Math.min(y + 24, pageH - 40);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#475569")
      .text(
        `Generated by Kyronix.ai — ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        margin,
        footerY,
        { width: contentW, align: "center" },
      );

    doc.end();
  });
}
