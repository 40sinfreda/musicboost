import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const API = "https://graph.facebook.com/v26.0";

type GraphError = {
  error?: { message?: string; type?: string; code?: number; error_user_msg?: string };
};

export async function graph<T>(
  path: string,
  token: string,
  init?: { method?: string; body?: Record<string, unknown> },
): Promise<T> {
  const method = init?.method ?? "GET";
  const url = new URL(`${API}${path}`);
  if (method === "GET") url.searchParams.set("access_token", token);

  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (method !== "GET") {
    const params = new URLSearchParams();
    params.set("access_token", token);
    for (const [k, v] of Object.entries(init?.body ?? {})) {
      params.set(k, typeof v === "string" ? v : JSON.stringify(v));
    }
    body = params.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const res = await fetch(url, { method, headers, body });
  const json = (await res.json()) as T & GraphError;
  if (!res.ok || json.error) {
    const msg =
      json.error?.error_user_msg ||
      json.error?.message ||
      `שגיאת מטא (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

const ConnectInput = z.object({ token: z.string().min(10) });

export async function connectMetaCore(tokenRaw: string) {
  const token = tokenRaw.trim();
  const me = await graph<{ id: string; name: string }>("/me?fields=id,name", token);

  const accountsRaw = await graph<{
    data?: Array<{
      id: string;
      name: string;
      account_id: string;
      currency?: string;
      account_status?: number;
    }>;
  }>("/me/adaccounts?fields=id,name,account_id,currency,account_status&limit=50", token);

  const pagesRaw = await graph<{
    data?: Array<{ id: string; name: string }>;
  }>("/me/accounts?fields=id,name&limit=50", token);

  const accounts = (accountsRaw.data ?? [])
    .filter((a) => a.account_status === 1 || a.account_status == null)
    .map((a) => ({
      id: a.id,
      name: a.name,
      accountId: a.account_id,
      currency: a.currency ?? "",
    }));

  const pages = (pagesRaw.data ?? []).map((p) => ({ id: p.id, name: p.name }));

  return {
    userId: me.id,
    userName: me.name,
    accounts,
    pages,
  };
}

export const connectMeta = createServerFn({ method: "POST" })
  .validator(ConnectInput)
  .middleware([authMiddleware])
  .handler(async ({ data }) => connectMetaCore(data.token));

const ExchangeInput = z.object({
  appId: z.string().min(4),
  appSecret: z.string().min(4),
  code: z.string().min(4),
  redirectUri: z.string().url(),
});

export async function exchangeCodeCore(data: {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri: string;
}) {
  const url = new URL(`${API}/oauth/access_token`);
  url.searchParams.set("client_id", data.appId.trim());
  url.searchParams.set("client_secret", data.appSecret.trim());
  url.searchParams.set("redirect_uri", data.redirectUri);
  url.searchParams.set("code", data.code.trim());
  const res = await fetch(url);
  const json = (await res.json()) as { access_token?: string } & GraphError;
  if (!json.access_token) {
    throw new Error(json.error?.message || "החלפת קוד החיבור נכשלה");
  }
  return json.access_token;
}

export const exchangeMetaCode = createServerFn({ method: "POST" })
  .validator(ExchangeInput)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    await exchangeCodeCore(data);
    return { ok: true as const };
  });

export type CampaignSpec = {
  facebook: {
    objective: string;
    campaign_name: string;
    daily_budget_cents: number;
    targeting: {
      geo_locations: { countries: string[] };
      age_min: number;
      age_max: number;
      genders?: number[];
    };
    creative: {
      title: string;
      body: string;
      call_to_action: string;
      link: string;
    };
  };
  media: {
    url: string;
    thumbnail?: string | null;
  };
};

export async function publishCampaignCore(input: {
  token: string;
  adAccountId: string;
  pageId: string;
  status?: "PAUSED" | "ACTIVE";
  spec: CampaignSpec;
}) {
  const act = input.adAccountId.replace(/^act_/, "");
  const fb = input.spec.facebook;
  const status = input.status ?? "PAUSED";

  const campaign = await graph<{ id: string }>(`/act_${act}/campaigns`, input.token, {
    method: "POST",
    body: {
      name: fb.campaign_name,
      objective: fb.objective,
      status,
      special_ad_categories: [],
    },
  });

  const adset = await graph<{ id: string }>(`/act_${act}/adsets`, input.token, {
    method: "POST",
    body: {
      name: `${fb.campaign_name} AdSet`,
      campaign_id: campaign.id,
      daily_budget: fb.daily_budget_cents,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: fb.targeting,
      destination_type: "WEBSITE",
      status,
    },
  });

  const linkData: Record<string, unknown> = {
    link: input.spec.media.url,
    message: fb.creative.body,
    name: fb.creative.title,
    call_to_action: { type: fb.creative.call_to_action },
  };
  if (input.spec.media.thumbnail) {
    linkData.picture = input.spec.media.thumbnail;
  }

  const creative = await graph<{ id: string }>(`/act_${act}/adcreatives`, input.token, {
    method: "POST",
    body: {
      name: `${fb.campaign_name} Creative`,
      object_story_spec: {
        page_id: input.pageId,
        link_data: linkData,
      },
    },
  });

  const ad = await graph<{ id: string }>(`/act_${act}/ads`, input.token, {
    method: "POST",
    body: {
      name: `${fb.campaign_name} Ad`,
      adset_id: adset.id,
      creative: { creative_id: creative.id },
      status,
    },
  });

  return {
    campaignId: campaign.id,
    adsetId: adset.id,
    creativeId: creative.id,
    adId: ad.id,
    adsManagerUrl: `https://www.facebook.com/adsmanager/manage/campaigns?act=${act}&selected_campaign_ids=${campaign.id}`,
  };
}

export async function fetchCampaignInsights(token: string, campaignId: string) {
  try {
    const [status, insights] = await Promise.all([
      graph<{ status?: string; effective_status?: string }>(
        `/${campaignId}?fields=status,effective_status`,
        token,
      ),
      graph<{
        data?: Array<{
          impressions?: string;
          spend?: string;
          clicks?: string;
          cpc?: string;
          ctr?: string;
          reach?: string;
        }>;
      }>(
        `/${campaignId}/insights?fields=impressions,spend,clicks,cpc,ctr,reach&date_preset=maximum`,
        token,
      ),
    ]);
    const row = insights.data?.[0] ?? {};
    return {
      status: status.effective_status || status.status || "",
      impressions: Number(row.impressions || 0),
      spend: Number(row.spend || 0),
      clicks: Number(row.clicks || 0),
      cpc: Number(row.cpc || 0),
      ctr: Number(row.ctr || 0),
      reach: Number(row.reach || 0),
    };
  } catch {
    return {
      status: "",
      impressions: 0,
      spend: 0,
      clicks: 0,
      cpc: 0,
      ctr: 0,
      reach: 0,
    };
  }
}

const PublishInput = z.object({
  token: z.string().min(10),
  adAccountId: z.string().min(1),
  pageId: z.string().min(1),
  spec: z.object({
    facebook: z.object({
      objective: z.string(),
      campaign_name: z.string().min(1),
      daily_budget_cents: z.number().int().positive(),
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
    media: z.object({
      url: z.string(),
      thumbnail: z.string().nullable().optional(),
    }),
  }),
});

export const publishMetaCampaign = createServerFn({ method: "POST" })
  .validator(PublishInput)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    return publishCampaignCore({
      token: data.token,
      adAccountId: data.adAccountId,
      pageId: data.pageId,
      status: "PAUSED",
      spec: data.spec,
    });
  });
