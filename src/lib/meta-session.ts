export type MetaAccount = {
  id: string;
  name: string;
  accountId: string;
  currency: string;
};

export type MetaPage = {
  id: string;
  name: string;
};

export type MetaSession = {
  token: string;
  userId: string;
  userName: string;
  accounts: MetaAccount[];
  pages: MetaPage[];
  adAccountId: string;
  pageId: string;
};

const KEY = "musicboost:meta";
const APP_KEY = "musicboost:meta-app";

export type MetaAppCreds = {
  appId: string;
  appSecret: string;
};

export function loadMetaSession(): MetaSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MetaSession;
    if (!parsed?.token || !parsed.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMetaSession(session: MetaSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("musicboost:meta"));
}

export function clearMetaSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("musicboost:meta"));
}

export function loadMetaAppCreds(): MetaAppCreds {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (!raw) return { appId: "", appSecret: "" };
    return JSON.parse(raw) as MetaAppCreds;
  } catch {
    return { appId: "", appSecret: "" };
  }
}

export function saveMetaAppCreds(creds: MetaAppCreds) {
  localStorage.setItem(APP_KEY, JSON.stringify(creds));
}

export function metaCallbackUrl() {
  return `${window.location.origin}/meta/callback`;
}

export const META_SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
].join(",");
