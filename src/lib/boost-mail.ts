import { CURRENCY_SYMBOL, type Currency } from "@/lib/boost-types";

export type OrderMailInput = {
  toEmail: string;
  artistName: string;
  title: string;
  platform: string;
  mediaUrl: string;
  countries: string;
  ages: string;
  days: number;
  dailyBudgetMajor: number;
  adCents: number;
  feeCents: number;
  totalCents: number;
  currency: Currency;
  campaignId: number;
};

export type MailPayload = {
  subject: string;
  preview: string;
  html: string;
};

function money(cents: number, currency: Currency) {
  const n = (cents / 100).toLocaleString("he-IL", { maximumFractionDigits: 0 });
  return `${CURRENCY_SYMBOL[currency]}${n}`;
}

function escapeHtml(value: string) {
  const amp = String.fromCharCode(38);
  return value
    .replaceAll("&", `${amp}amp;`)
    .replaceAll("<", `${amp}lt;`)
    .replaceAll(">", `${amp}gt;`)
    .replaceAll('"', `${amp}quot;`);
}

export function buildOrderEmail(input: OrderMailInput): MailPayload {
  const subject = `אישור הזמנה, ${input.title}`;
  const preview = `העיסקה נסגרה. שילמת ${money(input.totalCents, input.currency)} לקמפיין ${input.title}. אישור זה נשלח אל ${input.toEmail}.`;
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<body style="margin:0;padding:0;background:#f3efe8;color:#1c1917;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e7e0d6;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#78716c;">MusicBoost, Ignite Records</td></tr>
        <tr><td style="padding:0 28px 8px;font-size:28px;line-height:1.2;font-weight:700;">העיסקה נסגרה</td></tr>
        <tr><td style="padding:0 28px 20px;font-size:15px;line-height:1.6;color:#57534e;">שלום ${escapeHtml(input.artistName)}, הזמנת הקמפיין התקבלה. האישור הזה נשלח אל ${escapeHtml(input.toEmail)}.</td></tr>
        <tr><td style="padding:0 28px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;border-radius:12px;">
            <tr><td style="padding:16px 18px;font-size:14px;line-height:1.7;">
              <div style="font-size:12px;color:#78716c;">קמפיין</div>
              <div style="font-size:18px;font-weight:700;padding-bottom:10px;">${escapeHtml(input.title)}</div>
              <div>פלטפורמה: ${escapeHtml(input.platform)}</div>
              <div>קהל: ${escapeHtml(input.countries)}, גילאים ${escapeHtml(input.ages)}</div>
              <div>משך: ${input.days} ימים, ${CURRENCY_SYMBOL[input.currency]}${input.dailyBudgetMajor} ליום</div>
              <div>קישור: ${escapeHtml(input.mediaUrl)}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 28px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.8;">
            <tr><td>תקציב</td><td align="left">${input.days} × ${CURRENCY_SYMBOL[input.currency]}${input.dailyBudgetMajor}</td></tr>
            <tr><td style="padding-top:8px;font-weight:700;border-top:1px solid #e7e0d6;">לתשלום</td><td align="left" style="padding-top:8px;font-weight:700;border-top:1px solid #e7e0d6;">${money(input.totalCents, input.currency)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 28px 28px;font-size:13px;line-height:1.6;color:#57534e;">
          אחרי שהתשלום יאושר הקמפיין עולה לאוויר בחשבון המטא של הלייבל, והביצועים יופיעו אצלך באפליקציה.
          <div style="padding-top:12px;color:#a8a29e;">מספר הזמנה #${input.campaignId}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, preview, html };
}

export function buildLiveEmail(input: {
  toEmail: string;
  artistName: string;
  title: string;
  campaignId: number;
}): MailPayload {
  const subject = `הקמפיין באוויר, ${input.title}`;
  const preview = `התשלום אושר. הקמפיין ${input.title} רץ עכשיו במטא.`;
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<body style="margin:0;padding:0;background:#f3efe8;color:#1c1917;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe8;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e7e0d6;border-radius:16px;">
        <tr><td style="padding:28px 28px 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#78716c;">MusicBoost</td></tr>
        <tr><td style="padding:0 28px 8px;font-size:28px;font-weight:700;">הקמפיין באוויר</td></tr>
        <tr><td style="padding:0 28px 28px;font-size:15px;line-height:1.6;color:#57534e;">שלום ${escapeHtml(input.artistName)}, התשלום אושר. הקמפיין «${escapeHtml(input.title)}» רץ בחשבון המטא של הלייבל. הביצועים מחכים לך באפליקציה.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, preview, html };
}
