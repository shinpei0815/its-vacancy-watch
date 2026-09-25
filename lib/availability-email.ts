import { env } from "cloudflare:workers";

const facilityLabels: Record<string, string> = {
  viole: "トスラブ箱根 ビオーレ",
  wasorin: "トスラブ箱根 和奏林",
  luana: "トスラブ館山 ルアーナ",
  "758": "トスラブ箱根 ビオーレ",
  "759": "トスラブ箱根 和奏林",
  "761": "トスラブ館山 ルアーナ",
};

type AvailabilityMail = {
  facility: string;
  facilityLabel?: string | null;
  checkIn: string;
  nights: number;
  guests: number;
  email: string;
  status: string;
};

export async function sendAvailabilityEmail(
  watch: AvailabilityMail,
  keys: { resendApiKey?: string; brevoApiKey?: string } = {}
) {
  const facility =
    watch.facilityLabel ?? facilityLabels[watch.facility] ?? watch.facility;
  const availability = watch.status === "limited" ? "残りわずか" : "空きあり";
  const subject = `【ITS空室ウォッチ】${facility}に空きが出ました`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.7; color: #17343b;">
      <h2 style="color: #0b7d73;">${escapeHtml(availability)}を確認しました</h2>
      <p><strong>施設：</strong>${escapeHtml(facility)}</p>
      <p><strong>宿泊日：</strong>${escapeHtml(watch.checkIn)}</p>
      <p><strong>条件：</strong>${watch.nights}泊・${watch.guests}名</p>
      <p>空室は変動するため、早めにITS公式ページをご確認ください。</p>
      <p><a href="https://as.its-kenpo.or.jp/apply/empty_calendar?s=PUV6TjMwRFpwWlNaMUpIZDlrSGR3MVda">ITS公式の空き状況を見る</a></p>
    </div>
  `;

  const brevoApiKey = keys.brevoApiKey ?? env.BREVO_API_KEY;
  if (brevoApiKey && env.BREVO_SENDER_EMAIL) {
    return sendWithBrevo({
      apiKey: brevoApiKey,
      senderEmail: env.BREVO_SENDER_EMAIL,
      senderName: env.BREVO_SENDER_NAME ?? "ITS 空室ウォッチ",
      recipient: watch.email,
      subject,
      html,
    });
  }

  const resendApiKey = keys.resendApiKey ?? env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { sent: false, reason: "Email provider is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM ?? "ITS 空室ウォッチ <onboarding@resend.dev>",
      to: [watch.email],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${detail.slice(0, 160)}`);
  }

  return { sent: true, provider: "resend" as const };
}

async function sendWithBrevo(input: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  recipient: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": input.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: input.senderName, email: input.senderEmail },
      to: [{ email: input.recipient }],
      subject: input.subject,
      htmlContent: input.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Brevo email failed (${response.status}): ${detail.slice(0, 160)}`);
  }

  return { sent: true, provider: "brevo" as const };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}
