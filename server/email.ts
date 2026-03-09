import { logger } from "./logger";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    logger.info("Email not sent (no email provider configured)", {
      source: "email",
      to: message.to,
      subject: message.subject,
    });
    return false;
  }

  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "ReOrg AI <noreply@reorg.ai>",
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend API error: ${err}`);
      }
      logger.info("Email sent via Resend", { source: "email", to: message.to, subject: message.subject });
      return true;
    }

    if (process.env.SENDGRID_API_KEY) {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: message.to }] }],
          from: { email: process.env.EMAIL_FROM || "noreply@reorg.ai" },
          subject: message.subject,
          content: [
            { type: "text/html", value: message.html },
            ...(message.text ? [{ type: "text/plain", value: message.text }] : []),
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid API error: ${err}`);
      }
      logger.info("Email sent via SendGrid", { source: "email", to: message.to, subject: message.subject });
      return true;
    }

    return false;
  } catch (err: any) {
    logger.error("Failed to send email", { source: "email", to: message.to, message: err.message });
    return false;
  }
}

export function buildInviteEmail(tenantName: string, inviterName: string, inviteToken: string, baseUrl: string): EmailMessage {
  const inviteUrl = `${baseUrl}/invite?token=${inviteToken}`;
  return {
    to: "",
    subject: `You've been invited to join ${tenantName} on ReOrg AI`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="background: #0f172a; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold;">ReOrg AI</div>
        </div>
        <h2 style="color: #1e293b;">You've been invited!</h2>
        <p style="color: #475569; line-height: 1.6;">${inviterName} has invited you to join <strong>${tenantName}</strong> on ReOrg AI — the enterprise AI transformation platform.</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${inviteUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Accept Invitation</a>
        </div>
        <p style="color: #94a3b8; font-size: 0.875rem;">Or copy this link: ${inviteUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />
        <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">ReOrg AI — Enterprise AI Transformation Platform</p>
      </div>
    `,
    text: `${inviterName} has invited you to join ${tenantName} on ReOrg AI. Accept your invitation: ${inviteUrl}`,
  };
}

export function buildPhaseCompleteEmail(projectName: string, phaseNumber: number, phaseName: string, projectUrl: string): EmailMessage {
  return {
    to: "",
    subject: `Phase ${phaseNumber} (${phaseName}) completed — ${projectName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="background: #0f172a; color: white; display: inline-block; padding: 8px 16px; border-radius: 8px; font-weight: bold;">ReOrg AI</div>
        </div>
        <h2 style="color: #1e293b;">Phase ${phaseNumber} Complete</h2>
        <p style="color: #475569; line-height: 1.6;"><strong>${phaseName}</strong> has been completed for project <strong>${projectName}</strong>.</p>
        <p style="color: #475569;">The artifacts and analysis are now ready for your review.</p>
        <div style="text-align: center; margin: 2rem 0;">
          <a href="${projectUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Results</a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0;" />
        <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">ReOrg AI — Enterprise AI Transformation Platform</p>
      </div>
    `,
    text: `Phase ${phaseNumber} (${phaseName}) has been completed for project ${projectName}. View results: ${projectUrl}`,
  };
}
