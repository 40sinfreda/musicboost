export type Platform = "youtube" | "spotify";
export type ContentType = "track" | "playlist";

export type ParsedMedia = {
  platform: Platform;
  contentType: ContentType;
  id: string;
  canonicalUrl: string;
  thumbnail: string;
  videoId?: string;
  watchUrl?: string;
  playlistId?: string;
};

type UnsupportedSpotify = {
  platform: "spotify";
  contentType: string;
  unsupported: true;
  id: string;
  canonicalUrl: string;
  thumbnail: string;
};

export type ParseResult =
  | { ok: true; data: ParsedMedia }
  | { ok: false; error: string };

export type MediaMeta = ParsedMedia & {
  title: string;
  author: string;
  plays?: number | null;
  trackCount?: number | null;
  blurb?: string;
};

const YT_HOSTS =
  /(?:^|\.)youtube\.com$|(?:^|\.)youtube-nocookie\.com$|(?:^|\.)youtu\.be$|(?:^|\.)music\.youtube\.com$/i;

function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (!/^https?:$/.test(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

function firstParam(searchParams: URLSearchParams, key: string): string | null {
  const v = searchParams.get(key);
  return v && v.trim() ? v.trim() : null;
}

function parseYouTube(u: URL): ParsedMedia | null {
  const host = u.hostname.replace(/^www\./, "");
  if (!YT_HOSTS.test(host)) return null;

  const path = u.pathname.replace(/\/+$/, "");
  const parts = path.split("/").filter(Boolean);
  const videoId = firstParam(u.searchParams, "v");
  const listId = firstParam(u.searchParams, "list");

  if (host === "youtu.be" && parts[0]) {
    const id = parts[0];
    if (listId) {
      return {
        platform: "youtube",
        contentType: "playlist",
        id: listId,
        videoId: id,
        canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
        watchUrl: `https://www.youtube.com/watch?v=${id}&list=${listId}`,
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      };
    }
    return {
      platform: "youtube",
      contentType: "track",
      id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (parts[0] === "playlist" && listId) {
    return {
      platform: "youtube",
      contentType: "playlist",
      id: listId,
      canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
      thumbnail: "",
    };
  }

  if (parts[0] === "watch" && videoId) {
    if (listId && !/^RD/.test(listId)) {
      return {
        platform: "youtube",
        contentType: "playlist",
        id: listId,
        videoId,
        canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}&list=${listId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
    return {
      platform: "youtube",
      contentType: "track",
      id: videoId,
      playlistId: listId || undefined,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  if (
    (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live" || parts[0] === "v") &&
    parts[1]
  ) {
    const id = parts[1];
    return {
      platform: "youtube",
      contentType: "track",
      id,
      canonicalUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (listId) {
    return {
      platform: "youtube",
      contentType: "playlist",
      id: listId,
      canonicalUrl: `https://www.youtube.com/playlist?list=${listId}`,
      thumbnail: "",
    };
  }
  return null;
}

function parseSpotify(raw: string, u: URL | null): ParsedMedia | UnsupportedSpotify | null {
  const host = u ? u.hostname.replace(/^www\./, "") : "";
  const uri = raw.trim();

  let type: string | null = null;
  let id: string | null = null;

  const uriMatch = uri.match(/^spotify:(track|playlist|album|artist):([A-Za-z0-9]+)/i);
  if (uriMatch) {
    type = uriMatch[1].toLowerCase();
    id = uriMatch[2];
  } else if (u && (/spotify\.com$/i.test(host) || host.endsWith(".spotify.com"))) {
    const parts = u.pathname.split("/").filter(Boolean);
    const filtered = parts.filter((p) => !/^intl-/i.test(p) && p !== "embed" && p !== "user");
    const typeIdx = filtered.findIndex((p) =>
      /^(track|playlist|album|artist|episode|show)$/i.test(p),
    );
    if (typeIdx !== -1 && filtered[typeIdx + 1]) {
      type = filtered[typeIdx].toLowerCase();
      id = filtered[typeIdx + 1].split("?")[0];
    }
  }

  if (!type || !id) return null;
  if (type !== "track" && type !== "playlist") {
    return {
      platform: "spotify",
      contentType: type,
      unsupported: true,
      id,
      canonicalUrl: `https://open.spotify.com/${type}/${id}`,
      thumbnail: "",
    };
  }

  return {
    platform: "spotify",
    contentType: type,
    id,
    canonicalUrl: `https://open.spotify.com/${type}/${id}`,
    thumbnail: "",
  };
}

function isUnsupported(value: ParsedMedia | UnsupportedSpotify): value is UnsupportedSpotify {
  return "unsupported" in value && value.unsupported === true;
}

export function parseMediaLink(raw: string): ParseResult {
  if (!raw || typeof raw !== "string") return { ok: false, error: "חסר קישור" };
  const trimmed = raw.trim();

  if (/^spotify:/i.test(trimmed)) {
    const parsed = parseSpotify(trimmed, null);
    if (!parsed) return { ok: false, error: "לא הצלחתי לקרוא את כתובת הספוטיפיי" };
    if (isUnsupported(parsed)) {
      return {
        ok: false,
        error: `ספוטיפיי ${parsed.contentType} עדיין לא נתמך. הדבק שיר או פלייליסט.`,
      };
    }
    return { ok: true, data: parsed };
  }

  const u = safeUrl(trimmed);
  if (!u) return { ok: false, error: "זה לא קישור תקין. הדבק כתובת מלאה שמתחילה ב https://" };

  const yt = parseYouTube(u);
  if (yt) return { ok: true, data: yt };

  const sp = parseSpotify(trimmed, u);
  if (sp) {
    if (isUnsupported(sp)) {
      return {
        ok: false,
        error: `ספוטיפיי ${sp.contentType} עדיין לא נתמך. הדבק שיר או פלייליסט.`,
      };
    }
    return { ok: true, data: sp };
  }

  return {
    ok: false,
    error: "הקישור לא זוהה כיוטיוב או ספוטיפיי. בדוק שזה שיר / וידאו / פלייליסט.",
  };
}

export function platformLabel(p: Platform) {
  return p === "youtube" ? "YouTube" : "Spotify";
}

export function sourceLabel(p: Platform) {
  return p === "youtube" ? "יוטיוב" : "ספוטיפיי";
}

export function categoryLabel(type: ContentType) {
  return type === "playlist" ? "פלייליסט" : "שיר";
}

export function typeLabel(media: Pick<ParsedMedia, "platform" | "contentType">) {
  return `${categoryLabel(media.contentType)} ${sourceLabel(media.platform)}`;
}

export function formatPlays(n: number) {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n >= 1_000_000_000) return `${compact(n / 1_000_000_000)} מיליארד`;
  if (n >= 1_000_000) return `${compact(n / 1_000_000)} מיליון`;
  if (n >= 1_000) return `${compact(n / 1_000)} אלף`;
  return String(Math.round(n));
}

function compact(value: number) {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return String(rounded).replace(/\.0$/, "");
}
