import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, scoresTable, emailVerificationsTable } from "@workspace/db";
import { scrapeLinkedInProfile, validateLinkedInUrl } from "../lib/scraper.js";
import { scoreProfile } from "../lib/scorer.js";
import { sendOtpEmail } from "../lib/email.js";
import { generateScorePdf } from "../lib/pdf.js";

const router = Router();

// POST /scores — submit LinkedIn URL
router.post("/", async (req, res) => {
  const { linkedin_url } = req.body as { linkedin_url?: string };

  if (!linkedin_url || typeof linkedin_url !== "string") {
    res.status(400).json({ error: "linkedin_url is required" });
    return;
  }

  if (!validateLinkedInUrl(linkedin_url.trim())) {
    res.status(400).json({
      error:
        "Please provide a valid LinkedIn profile URL (e.g. https://linkedin.com/in/yourname)",
    });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(scoresTable).values({
    id,
    linkedin_url: linkedin_url.trim(),
    status: "pending",
    email_verified: false,
    created_at: now,
  });

  // Start async processing (fire and forget)
  setImmediate(() => processScore(id, linkedin_url.trim()));

  res.status(201).json({
    id,
    linkedin_url: linkedin_url.trim(),
    status: "pending",
    created_at: now.toISOString(),
  });
});

// GET /scores/:id — get score result
router.get("/:id", async (req, res) => {
  const { id } = req.params as { id: string };

  const [score] = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.id, id))
    .limit(1);

  if (!score) {
    res.status(404).json({ error: "Score not found" });
    return;
  }

  res.json(formatScoreResult(score));
});

// POST /scores/:id/email — request OTP
router.post("/:id/email", async (req, res) => {
  const { id } = req.params as { id: string };
  const { email } = req.body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }

  const [score] = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.id, id))
    .limit(1);

  if (!score) {
    res.status(404).json({ error: "Score not found" });
    return;
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const verificationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Invalidate old pending verifications for this score
  await db
    .delete(emailVerificationsTable)
    .where(
      and(
        eq(emailVerificationsTable.score_id, id),
        eq(emailVerificationsTable.verified, false),
      ),
    );

  await db.insert(emailVerificationsTable).values({
    id: verificationId,
    score_id: id,
    email: email.trim().toLowerCase(),
    otp_code: otp,
    verified: false,
    expires_at: expiresAt,
    created_at: new Date(),
  });

  try {
    await sendOtpEmail({ to: email.trim(), otp, scoreId: id });
  } catch (err) {
    req.log.error({ err }, "Failed to send OTP email");
    // Still return success — dev mode logs the OTP
  }

  res.json({
    success: true,
    message: "Verification code sent to your email",
    verified: false,
    token: null,
  });
});

// POST /scores/:id/email/verify — verify OTP
router.post("/:id/email/verify", async (req, res) => {
  const { id } = req.params as { id: string };
  const { code } = req.body as { code?: string };

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Verification code is required" });
    return;
  }

  const now = new Date();

  const [verification] = await db
    .select()
    .from(emailVerificationsTable)
    .where(
      and(
        eq(emailVerificationsTable.score_id, id),
        eq(emailVerificationsTable.otp_code, code.trim()),
        eq(emailVerificationsTable.verified, false),
      ),
    )
    .limit(1);

  if (!verification) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  if (verification.expires_at < now) {
    res.status(400).json({
      error: "This code has expired. Please request a new one.",
    });
    return;
  }

  // Mark verified
  await db
    .update(emailVerificationsTable)
    .set({ verified: true })
    .where(eq(emailVerificationsTable.id, verification.id));

  await db
    .update(scoresTable)
    .set({
      email_verified: true,
      verified_email: verification.email,
    })
    .where(eq(scoresTable.id, id));

  // Token: simple base64 of scoreId:email for PDF download
  const token = Buffer.from(`${id}:${verification.email}`).toString("base64");

  res.json({
    success: true,
    message: "Email verified successfully",
    verified: true,
    token,
  });
});

// GET /scores/:id/pdf — download PDF report
router.get("/:id/pdf", async (req, res) => {
  const { id } = req.params as { id: string };

  const [score] = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.id, id))
    .limit(1);

  if (!score) {
    res.status(404).json({ error: "Score not found" });
    return;
  }

  if (!score.email_verified) {
    res.status(403).json({
      error: "Email verification required to download the PDF report",
    });
    return;
  }

  if (score.status !== "complete") {
    res.status(400).json({ error: "Score is not yet complete" });
    return;
  }

  try {
    const pdfBuffer = await generateScorePdf(formatScoreResult(score) as any);
    const slug = score.linkedin_url
      .split("/in/")[1]
      ?.replace(/\/$/, "")
      .replace(/[^a-zA-Z0-9-]/g, "") || id;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kyronix-presence-score-${slug}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    req.log.error({ err }, "Failed to generate PDF");
    res.status(500).json({ error: "Failed to generate PDF report" });
  }
});

// — Helpers

function formatScoreResult(score: typeof scoresTable.$inferSelect) {
  return {
    id: score.id,
    linkedin_url: score.linkedin_url,
    status: score.status,
    overall_score: score.overall_score ?? null,
    percentile: score.percentile ?? null,
    archetype: score.archetype ?? null,
    archetype_description: score.archetype_description ?? null,
    categories: (score.categories as any[]) ?? [],
    email_verified: score.email_verified,
    verified_email: score.verified_email ?? null,
    verification_token: null, // not exposed from server
    error_message: score.error_message ?? null,
    created_at: score.created_at.toISOString(),
  };
}

async function processScore(id: string, linkedinUrl: string) {
  try {
    await db
      .update(scoresTable)
      .set({ status: "processing" })
      .where(eq(scoresTable.id, id));

    // Scrape
    const rawData = await scrapeLinkedInProfile(linkedinUrl);

    // Score
    const result = scoreProfile(rawData);

    await db
      .update(scoresTable)
      .set({
        status: "complete",
        overall_score: result.overall_score,
        percentile: result.percentile,
        archetype: result.archetype,
        archetype_description: result.archetype_description,
        categories: result.categories,
        raw_data: rawData as any,
      })
      .where(eq(scoresTable.id, id));
  } catch (err) {
    await db
      .update(scoresTable)
      .set({
        status: "error",
        error_message:
          err instanceof Error ? err.message : "Unknown error occurred",
      })
      .where(eq(scoresTable.id, id));
  }
}

export default router;
