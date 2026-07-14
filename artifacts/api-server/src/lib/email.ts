import { logger } from "./logger.js";

export interface SendOtpOptions {
  to: string;
  otp: string;
  scoreId: string;
}

/**
 * Sends a verification OTP email.
 * Uses Resend if RESEND_API_KEY is set, otherwise logs to console (dev mode).
 */
export async function sendOtpEmail({ to, otp, scoreId }: SendOtpOptions): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];

  if (apiKey) {
    await sendViaResend({ to, otp, scoreId, apiKey });
  } else {
    // Dev mode: log OTP to server console
    logger.info(
      { to, otp, scoreId },
      "DEV MODE: OTP email not sent (no RESEND_API_KEY). Code logged here.",
    );
  }
}

async function sendViaResend({
  to,
  otp,
  apiKey,
}: SendOtpOptions & { apiKey: string }): Promise<void> {
  const body = {
    from: "Kyronix <scores@kyronix.ai>",
    to: [to],
    subject: "Your Executive Presence Report — Verification Code",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #0a0d12; color: #e2e8f0; padding: 40px 32px; border-radius: 12px;">
        <div style="margin-bottom: 32px;">
          <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; color: #14b8a6; text-transform: uppercase;">Kyronix.ai</span>
        </div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #f1f5f9;">
          Your verification code
        </h1>
        <p style="color: #94a3b8; margin: 0 0 32px; font-size: 15px; line-height: 1.6;">
          Enter this code to unlock your full Executive Presence Report.
        </p>
        <div style="background: #141820; border: 1px solid #1e2a3a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 0.3em; color: #14b8a6; font-family: 'Courier New', monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
          This code expires in 15 minutes. If you didn't request this report, you can safely ignore this email.
        </p>
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #1e2a3a;">
          <span style="font-size: 12px; color: #475569;">Kyronix.ai — Executive Intelligence Platform</span>
        </div>
      </div>
    `,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ err, to }, "Failed to send OTP via Resend");
    throw new Error(`Resend error: ${response.status}`);
  }

  logger.info({ to }, "OTP email sent via Resend");
}
