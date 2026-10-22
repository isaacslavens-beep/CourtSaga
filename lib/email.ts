import "server-only";
import { Resend } from "resend";

// The only email CourtSaga sends: a link to choose a new password. Sent through Resend from courtsaga.com.
const from = process.env.EMAIL_FROM || "CourtSaga <noreply@courtsaga.com>";

export async function sendPasswordReset(to: { email: string; name: string }, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Without Resend set up, development prints the link instead of sending it
    if (process.env.NODE_ENV !== "production") console.log(`\n[email] Password reset for ${to.email}: ${url}\n`);
    else console.error("RESEND_API_KEY isn't set, so a password reset email wasn't sent.");
    return;
  }
  const hi = to.name ? `Hi ${to.name},` : "Hi,";
  const text = [
    hi,
    "",
    "Someone, hopefully you, asked to reset the password for your CourtSaga diary. Choose a new one here:",
    "",
    url,
    "",
    "The link works for an hour. If you didn't ask, ignore this email and your password stays the same.",
    "",
    "CourtSaga",
  ].join("\n");
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.5;color:#0f1b2d;max-width:480px">
  <p>${escape(hi)}</p>
  <p>Someone, hopefully you, asked to reset the password for your CourtSaga diary.</p>
  <p><a href="${escape(url)}" style="display:inline-block;background:#d4e157;color:#0b0d12;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:999px">Choose a new password</a></p>
  <p style="color:#4b5a6e;font-size:14px">The link works for an hour. If you didn't ask, ignore this email and your password stays the same.</p>
  <p style="color:#4b5a6e;font-size:14px">CourtSaga</p>
</div>`;
  const { error } = await new Resend(key).emails.send({ from, to: to.email, subject: "Reset your CourtSaga password", text, html });
  if (error) console.error("Resend couldn't send a password reset email:", error.message);
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
