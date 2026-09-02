import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  connectMetaCore,
  exchangeCodeCore,
  fetchCampaignInsights,
  publishCampaignCore,
  type CampaignSpec,
} from "@/lib/meta-api";
import { buildLiveEmail, buildOrderEmail, type MailPayload } from "@/lib/boost-mail";
import { MAX_DAILY_BUDGET, MIN_DAILY_BUDGET, type Currency } from "@/lib/boost-types";

const COMMISSION_BPS = 1000;

type OperatorRow = {
  owner_user_id: string | null;
  meta_token: string | null;
  meta_user_name: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  page_id: string | null;
  page_name: string | null;
  payout_note: string | null;
  commission_bps: number;
};

type CampaignRow = {
  id: number;
  user_id: string;
  title: string;
  platform: string;
  content_type: string;
  media_url: string;
  thumbnail: string | null;
  spec_json: string;
  daily_budget_cents: number;
  days: number;
  ad_cents: number;
  fee_cents: number;
  total_cents: number;
  currency: string;
  status: string;
  meta_campaign_id: string | null;
  ads_manager_url: string | null;
  error_message: string | null;
  insights_json: string | null;
  created_at: string;
  paid_at: string | null;
};

type EmailRow = {
  id: number;
  user_id: string;
  campaign_id: number;
  to_email: string;
  subject: string;
  preview: string;
  body_html: string;
  kind: string;
  created_at: string;
};

export type Insights = {
  impressions: number;
  spend: number;
  clicks: number;
  cpc: number;
  ctr: number;
  reach: number;
  status: string;
};

export type PublicCampaign = {
  id: number;
  title: string;
  platform: string;
  contentType: string;
  mediaUrl: string;
  thumbnail: string | null;
  dailyBudgetCents: number;
  days: number;
  adCents: number;
  feeCents: number;
  totalCents: number;
  currency: string;
  status: string;
  adsManagerUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  paidAt: string | null;
  insights: Insights | null;
  isOperator: boolean;
  artistUserId: string | null;
};

export type PublicEmail = {
  id: number;
  campaignId: number;
  toEmail: string;
  subject: string;
  preview: string;
  bodyHtml: string;
  kind: string;
  createdAt: string;
};

export type BoostSession = {
  userId: string;
  userEmail: string | null;
  userName: string | null;
  isOperator: boolean;
  canClaimStudio: boolean;
  operatorConnected: boolean;
  operatorName: string | null;
  adAccountName: string | null;
  pageName: string | null;
  payoutNote: string | null;
  commissionBps: number;
  previewPayments: boolean;
};

function parseInsights(raw: string | null): Insights | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Insights>;
    return {
      impressions: Number(parsed.impressions || 0),
      spend: Number(parsed.spend || 0),
      clicks: Number(parsed.clicks || 0),
      cpc: Number(parsed.cpc || 0),
      ctr: Number(parsed.ctr || 0),
      reach: Number(parsed.reach || 0),
      status: typeof parsed.status === "string" ? parsed.status : "",
    };
  } catch {
    return null;
  }
}

function publicCampaign(
  row: CampaignRow,
  extra?: { isOperator?: boolean; userId?: string | null; insights?: Insights | null },
): PublicCampaign {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    contentType: row.content_type,
    mediaUrl: row.media_url,
    thumbnail: row.thumbnail,
    dailyBudgetCents: row.daily_budget_cents,
    days: row.days,
    adCents: extra?.isOperator ? row.ad_cents : row.total_cents,
    feeCents: extra?.isOperator ? row.fee_cents : 0,
    totalCents: row.total_cents,
    currency: row.currency,
    status: row.status,
    adsManagerUrl: row.ads_manager_url,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    insights: extra && "insights" in extra ? extra.insights ?? null : parseInsights(row.insights_json),
    isOperator: extra?.isOperator ?? false,
    artistUserId: extra?.userId ?? null,
  };
}

function publicEmail(row: EmailRow): PublicEmail {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    toEmail: row.to_email,
    subject: row.subject,
    preview: row.preview,
    bodyHtml: row.body_html,
    kind: row.kind,
    createdAt: row.created_at,
  };
}

async function getOperator(): Promise<OperatorRow | null> {
  const sql = await getSql();
  const rows = await sql<OperatorRow>`select owner_user_id, meta_token, meta_user_name, ad_account_id, ad_account_name, page_id, page_name, payout_note, commission_bps from operator_settings where id = 1`;
  return rows[0] ?? null;
}

async function userProfile(userId: string): Promise<{ email: string; name: string }> {
  const sql = await getSql();
  try {
    const rows = await sql<{ email: string; name: string }>`
      select "email" as email, "name" as name from "user" where "id" = ${userId}
    `;
    if (rows[0]?.email) return { email: rows[0].email, name: rows[0].name || "אמן" };
  } catch {
    /* preview without a user row */
  }
  return { email: "artist@musicboost.app", name: "אמן" };
}

async function storeEmail(opts: {
  userId: string;
  campaignId: number;
  toEmail: string;
  kind: string;
  mail: MailPayload;
}) {
  const sql = await getSql();
  await sql`insert into campaign_emails (user_id, campaign_id, to_email, subject, preview, body_html, kind)
    values (${opts.userId}, ${opts.campaignId}, ${opts.toEmail}, ${opts.mail.subject}, ${opts.mail.preview}, ${opts.mail.html}, ${opts.kind})`;
}

async function requireOperator(userId: string) {
  const op = await getOperator();
  if (!op?.owner_user_id) throw new Error("עדיין אין מפעיל. חבר קודם את חשבון המטא בסטודיו.");
  if (op.owner_user_id !== userId) throw new Error("אין הרשאת מפעיל");
  return op;
}

async function launchIfPaid(campaignId: number): Promise<PublicCampaign> {
  const sql = await getSql();
  const op = await getOperator();
  if (!op?.meta_token || !op.ad_account_id || !op.page_id) {
    throw new Error("חשבון המטא של הלייבל לא מחובר");
  }
  const rows = await sql<CampaignRow>`select * from campaigns where id = ${campaignId}`;
  const campaign = rows[0];
  if (!campaign) throw new Error("קמפיין לא נמצא");
  if (campaign.status !== "paid" && campaign.status !== "failed") {
    return publicCampaign(campaign);
  }
  const spec = JSON.parse(campaign.spec_json) as CampaignSpec;
  try {
    const published = await publishCampaignCore({
      token: op.meta_token,
      adAccountId: op.ad_account_id,
      pageId: op.page_id,
      status: "ACTIVE",
      spec,
    });
    await sql`update campaigns set status = ${"live"}, meta_campaign_id = ${published.campaignId}, meta_adset_id = ${published.adsetId}, meta_ad_id = ${published.adId}, ads_manager_url = ${published.adsManagerUrl}, error_message = null where id = ${campaignId}`;
    const profile = await userProfile(campaign.user_id);
    const last = await sql<EmailRow>`select * from campaign_emails where campaign_id = ${campaignId} order by id desc limit 1`;
    const toEmail = last[0]?.to_email || profile.email;
    await storeEmail({
      userId: campaign.user_id,
      campaignId,
      toEmail,
      kind: "live",
      mail: buildLiveEmail({
        toEmail,
        artistName: profile.name,
        title: campaign.title,
        campaignId,
      }),
    });
    return publicCampaign({
      ...campaign,
      status: "live",
      meta_campaign_id: published.campaignId,
      ads_manager_url: published.adsManagerUrl,
      error_message: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "פרסום במטא נכשל";
    await sql`update campaigns set status = ${"failed"}, error_message = ${message} where id = ${campaignId}`;
    throw new Error(message);
  }
}

export const getBoostSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BoostSession> => {
    const op = await getOperator();
    const profile = await userProfile(context.userId);
    const isOperator = !!op?.owner_user_id && op.owner_user_id === context.userId;
    const canClaimStudio = !op?.owner_user_id;
    return {
      userId: context.userId,
      userEmail: profile.email,
      userName: profile.name,
      isOperator,
      canClaimStudio,
      operatorConnected: !!(op?.meta_token && op.ad_account_id && op.page_id),
      operatorName: op?.meta_user_name ?? null,
      adAccountName: op?.ad_account_name ?? null,
      pageName: op?.page_name ?? null,
      payoutNote: op?.payout_note ?? null,
      commissionBps: isOperator ? op?.commission_bps ?? COMMISSION_BPS : 0,
      previewPayments: !process.env.DATABASE_URL,
    };
  });

const SaveOperatorInput = z.object({
  token: z.string().min(10),
  adAccountId: z.string().min(1),
  adAccountName: z.string().min(1),
  pageId: z.string().min(1),
  pageName: z.string().min(1),
  payoutNote: z.string().optional(),
});

export const saveOperatorMeta = createServerFn({ method: "POST" })
  .validator(SaveOperatorInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const op = await getOperator();
    if (op?.owner_user_id && op.owner_user_id !== context.userId) {
      throw new Error("הסטודיו כבר מחובר למפעיל אחר");
    }
    const probe = await connectMetaCore(data.token);
    const sql = await getSql();
    await sql`update operator_settings set
      owner_user_id = ${context.userId},
      meta_token = ${data.token.trim()},
      meta_user_name = ${probe.userName},
      ad_account_id = ${data.adAccountId},
      ad_account_name = ${data.adAccountName},
      page_id = ${data.pageId},
      page_name = ${data.pageName},
      payout_note = ${data.payoutNote?.trim() || op?.payout_note || null},
      updated_at = now()
      where id = 1`;
    return {
      connected: true,
      operatorName: probe.userName,
      adAccountName: data.adAccountName,
      pageName: data.pageName,
    };
  });

const ProbeInput = z.object({ token: z.string().min(10) });

export const probeOperatorMeta = createServerFn({ method: "POST" })
  .validator(ProbeInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const op = await getOperator();
    if (op?.owner_user_id && op.owner_user_id !== context.userId) {
      throw new Error("הסטודיו כבר מחובר למפעיל אחר");
    }
    const probe = await connectMetaCore(data.token);
    return {
      userName: probe.userName,
      accounts: probe.accounts,
      pages: probe.pages,
    };
  });

const PayoutInput = z.object({ payoutNote: z.string().min(2) });

export const savePayoutNote = createServerFn({ method: "POST" })
  .validator(PayoutInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireOperator(context.userId);
    const sql = await getSql();
    await sql`update operator_settings set payout_note = ${data.payoutNote.trim()}, updated_at = now() where id = 1`;
    return { ok: true as const };
  });

const SubmitInput = z.object({
  title: z.string().min(1),
  platform: z.enum(["youtube", "spotify"]),
  contentType: z.enum(["track", "playlist"]),
  mediaUrl: z.string().url(),
  thumbnail: z.string().optional(),
  spec: z.object({
    facebook: z.object({
      objective: z.string(),
      campaign_name: z.string(),
      daily_budget_cents: z.number(),
      targeting: z.object({
        geo_locations: z.object({ countries: z.array(z.string()).min(1) }),
        age_min: z.number(),
        age_max: z.number(),
        genders: z.array(z.number()).optional(),
      }),
      creative: z.object({
        title: z.string(),
        body: z.string(),
        call_to_action: z.string(),
        link: z.string(),
      }),
    }),
  }),
  dailyBudgetMajor: z
    .number()
    .min(MIN_DAILY_BUDGET)
    .max(MAX_DAILY_BUDGET)
    .refine((n) => n % 10 === 0),
  days: z.number().int().min(1).max(30),
  currency: z.enum(["ILS", "USD", "EUR"]),
  receiptEmail: z.string().email(),
  audienceLabel: z.string().min(1),
});

export const submitCampaign = createServerFn({ method: "POST" })
  .validator(SubmitInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const op = await getOperator();
    const bps = op?.commission_bps || COMMISSION_BPS;
    const dailyBudgetCents = Math.round(data.dailyBudgetMajor * 100);
    const totalCents = dailyBudgetCents * data.days;
    const feeCents = Math.round((totalCents * bps) / 10000);
    const adCents = totalCents - feeCents;
    const adDailyCents = Math.max(100, Math.round(adCents / data.days));
    const specJson = JSON.stringify({
      facebook: {
        ...data.spec.facebook,
        daily_budget_cents: adDailyCents,
      },
      media: {
        url: data.mediaUrl,
        thumbnail: data.thumbnail || null,
      },
    });
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into campaigns (
        user_id, title, platform, content_type, media_url, thumbnail, spec_json,
        daily_budget_cents, days, ad_cents, fee_cents, total_cents, currency, status
      ) values (
        ${context.userId}, ${data.title}, ${data.platform}, ${data.contentType},
        ${data.mediaUrl}, ${data.thumbnail || null}, ${specJson},
        ${dailyBudgetCents}, ${data.days}, ${adCents}, ${feeCents}, ${totalCents},
        ${data.currency}, ${"awaiting_payment"}
      ) returning id`;
    const campaignId = rows[0]!.id;
    await sql`insert into payments (user_id, campaign_id, ad_cents, fee_cents, total_cents, currency, status, method)
      values (${context.userId}, ${campaignId}, ${adCents}, ${feeCents}, ${totalCents}, ${data.currency}, ${"pending"}, ${"bit"})`;
    const profile = await userProfile(context.userId);
    const toEmail = data.receiptEmail.trim() || profile.email;
    const targeting = data.spec.facebook.targeting;
    try {
      await storeEmail({
        userId: context.userId,
        campaignId,
        toEmail,
        kind: "order",
        mail: buildOrderEmail({
          toEmail,
          artistName: profile.name,
          title: data.title,
          platform: data.platform,
          mediaUrl: data.mediaUrl,
          countries: data.audienceLabel,
          ages: `${targeting.age_min} עד ${targeting.age_max}`,
          days: data.days,
          dailyBudgetMajor: data.dailyBudgetMajor,
          adCents,
          feeCents,
          totalCents,
          currency: data.currency as Currency,
          campaignId,
        }),
      });
    } catch (err) {
      console.error("order email failed", err);
    }
    return {
      id: campaignId,
      totalCents,
      days: data.days,
      currency: data.currency,
      receiptEmail: toEmail,
    };
  });

export const listMyCampaigns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PublicCampaign[]> => {
    const sql = await getSql();
    const rows = await sql<CampaignRow>`select * from campaigns where user_id = ${context.userId} order by id desc`;
    return rows.map((row) => publicCampaign(row));
  });

const IdInput = z.object({ id: z.number().int().positive() });

export const getCampaign = createServerFn({ method: "GET" })
  .validator(IdInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PublicCampaign> => {
    const sql = await getSql();
    const op = await getOperator();
    const isOperator = op?.owner_user_id === context.userId;
    const rows = await sql<CampaignRow>`select * from campaigns where id = ${data.id}`;
    const campaign = rows[0];
    if (!campaign) throw new Error("קמפיין לא נמצא");
    if (campaign.user_id !== context.userId && !isOperator) throw new Error("אין גישה לקמפיין");

    let insights = parseInsights(campaign.insights_json);
    if (campaign.meta_campaign_id && op?.meta_token) {
      insights = await fetchCampaignInsights(op.meta_token, campaign.meta_campaign_id);
      await sql`update campaigns set insights_json = ${JSON.stringify(insights)}, insights_at = now() where id = ${campaign.id}`;
    }
    return publicCampaign(campaign, {
      insights,
      isOperator,
      userId: isOperator ? campaign.user_id : null,
    });
  });

export const getCampaignEmails = createServerFn({ method: "GET" })
  .validator(IdInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PublicEmail[]> => {
    const sql = await getSql();
    const op = await getOperator();
    const isOperator = op?.owner_user_id === context.userId;
    const campaigns = await sql<{ user_id: string }>`select user_id from campaigns where id = ${data.id}`;
    const campaign = campaigns[0];
    if (!campaign) throw new Error("קמפיין לא נמצא");
    if (campaign.user_id !== context.userId && !isOperator) throw new Error("אין גישה לקמפיין");
    const rows = await sql<EmailRow>`select * from campaign_emails where campaign_id = ${data.id} order by id desc`;
    return rows.map(publicEmail);
  });

export const listMyEmails = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PublicEmail[]> => {
    const sql = await getSql();
    const rows = await sql<EmailRow>`select * from campaign_emails where user_id = ${context.userId} order by id desc`;
    return rows.map(publicEmail);
  });

export const markArtistPaid = createServerFn({ method: "POST" })
  .validator(IdInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PublicCampaign> => {
    const sql = await getSql();
    const rows = await sql<CampaignRow>`select * from campaigns where id = ${data.id} and user_id = ${context.userId}`;
    const campaign = rows[0];
    if (!campaign) throw new Error("קמפיין לא נמצא");
    if (campaign.status !== "awaiting_payment" && campaign.status !== "awaiting_confirmation") {
      return publicCampaign(campaign);
    }
    await sql`update campaigns set status = ${"awaiting_confirmation"} where id = ${campaign.id}`;
    await sql`update payments set status = ${"awaiting_confirmation"} where campaign_id = ${campaign.id}`;
    return publicCampaign({ ...campaign, status: "awaiting_confirmation" });
  });

export const simulatePayment = createServerFn({ method: "POST" })
  .validator(IdInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PublicCampaign> => {
    if (process.env.DATABASE_URL) {
      throw new Error("סימולציית תשלום זמינה רק בתצוגה המקדימה");
    }
    const sql = await getSql();
    const rows = await sql<CampaignRow>`select * from campaigns where id = ${data.id} and user_id = ${context.userId}`;
    const campaign = rows[0];
    if (!campaign) throw new Error("קמפיין לא נמצא");
    await sql`update campaigns set status = ${"paid"}, paid_at = now() where id = ${campaign.id}`;
    await sql`update payments set status = ${"paid"}, method = ${"preview"}, confirmed_at = now() where campaign_id = ${campaign.id}`;
    return launchIfPaid(campaign.id);
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .validator(IdInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PublicCampaign> => {
    await requireOperator(context.userId);
    const sql = await getSql();
    const rows = await sql<CampaignRow>`select * from campaigns where id = ${data.id}`;
    const campaign = rows[0];
    if (!campaign) throw new Error("קמפיין לא נמצא");
    await sql`update campaigns set status = ${"paid"}, paid_at = now() where id = ${campaign.id}`;
    await sql`update payments set status = ${"paid"}, confirmed_at = now() where campaign_id = ${campaign.id}`;
    return launchIfPaid(campaign.id);
  });

export const retryLaunch = createServerFn({ method: "POST" })
  .validator(IdInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<PublicCampaign> => {
    await requireOperator(context.userId);
    const sql = await getSql();
    await sql`update campaigns set status = ${"paid"} where id = ${data.id} and status = ${"failed"}`;
    return launchIfPaid(data.id);
  });

export const listStudioCampaigns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PublicCampaign[]> => {
    await requireOperator(context.userId);
    const sql = await getSql();
    const rows = await sql<CampaignRow>`select * from campaigns order by id desc`;
    return rows.map((row) => publicCampaign(row, { userId: row.user_id, isOperator: true }));
  });

const OauthInput = z.object({
  appId: z.string().min(4),
  appSecret: z.string().min(4),
  code: z.string().min(4),
  redirectUri: z.string().url(),
});

export const completeOperatorOAuth = createServerFn({ method: "POST" })
  .validator(OauthInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const op = await getOperator();
    if (op?.owner_user_id && op.owner_user_id !== context.userId) {
      throw new Error("הסטודיו כבר מחובר למפעיל אחר");
    }
    const token = await exchangeCodeCore(data);
    const probe = await connectMetaCore(token);
    if (!probe.accounts.length) throw new Error("לא נמצא חשבון מודעות פעיל.");
    if (!probe.pages.length) throw new Error("לא נמצא דף פייסבוק.");
    const acc = probe.accounts.find((a) => /ignite/i.test(a.name)) || probe.accounts[0]!;
    const page = probe.pages.find((p) => /ignite/i.test(p.name)) || probe.pages[0]!;
    const sql = await getSql();
    await sql`update operator_settings set
      owner_user_id = ${context.userId},
      meta_token = ${token},
      meta_user_name = ${probe.userName},
      ad_account_id = ${acc.id},
      ad_account_name = ${acc.name},
      page_id = ${page.id},
      page_name = ${page.name},
      updated_at = now()
      where id = 1`;
    return {
      connected: true as const,
      operatorName: probe.userName,
      adAccountName: acc.name,
      pageName: page.name,
    };
  });
