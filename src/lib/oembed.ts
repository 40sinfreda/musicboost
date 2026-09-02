import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { writeAdCopy } from "@/lib/ad-copy";

const Input = z.object({
  platform: z.enum(["youtube", "spotify"]),
  contentType: z.enum(["track", "playlist"]),
  url: z.string().min(8),
  id: z.string().min(1),
  videoId: z.string().optional(),
  playlistId: z.string().optional(),
});

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const YT_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240815.00.00",
    hl: "en",
    gl: "US",
  },
};

export type RichMeta = {
  title: string;
  author: string;
  thumbnail: string;
  plays: number | null;
  trackCount: number | null;
  blurb: string;
};

export const fetchMediaMeta = createServerFn({ method: "POST" })
  .validator(Input)
  .handler(async ({ data }): Promise<RichMeta> => {
    try {
      if (data.platform === "youtube") {
        return await withBlurb(data.contentType, await fetchYouTube(data));
      }
      return await withBlurb(data.contentType, await fetchSpotify(data));
    } catch {
      return emptyMeta();
    }
  });

type DraftMeta = Omit<RichMeta, "blurb"> & { clues?: string };

async function withBlurb(
  contentType: "track" | "playlist",
  meta: DraftMeta,
): Promise<RichMeta> {
  const { clues, ...rest } = meta;
  const blurb = await writeAdCopy({
    title: rest.title,
    author: rest.author,
    contentType,
    clues: clues || `${rest.title} ${rest.author}`,
    trackCount: rest.trackCount,
  });
  return { ...rest, blurb };
}

function emptyMeta(): RichMeta {
  return { title: "", author: "", thumbnail: "", plays: null, trackCount: null, blurb: "" };
}

async function fetchYouTube(data: z.infer<typeof Input>): Promise<DraftMeta> {
  if (data.contentType === "playlist") {
    const playlistId = data.playlistId || data.id;
    const browsed = await ytPlaylist(playlistId);
    if (browsed.title || browsed.plays || browsed.trackCount) return browsed;
    if (data.videoId) {
      const video = await ytVideo(data.videoId);
      return { ...video, title: video.title };
    }
    return ytOembed(data.url);
  }
  return ytVideo(data.videoId || data.id);
}

async function ytVideo(videoId: string): Promise<DraftMeta> {
  const json = await ytPost("player", { videoId });
  const details = json?.videoDetails as
    | {
        title?: string;
        author?: string;
        viewCount?: string;
        shortDescription?: string;
        keywords?: string[];
        thumbnail?: { thumbnails?: { url: string }[] };
      }
    | undefined;
  if (!details?.title) return ytOembed(`https://www.youtube.com/watch?v=${videoId}`);
  const split = splitSongArtist(details.title, cleanArtist(details.author || ""));
  const thumbs = details.thumbnail?.thumbnails ?? [];
  const micro = json?.microformat as
    | { playerMicroformatRenderer?: { category?: string } }
    | undefined;
  const clues = [
    split.song,
    split.artist,
    micro?.playerMicroformatRenderer?.category,
    ...(details.keywords ?? []),
    (details.shortDescription || "").slice(0, 280),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: split.song,
    author: split.artist,
    thumbnail: thumbs.at(-1)?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    plays: parseCount(details.viewCount),
    trackCount: null,
    clues,
  };
}

async function ytPlaylist(playlistId: string): Promise<DraftMeta> {
  const json = await ytPost("browse", { browseId: `VL${playlistId}` });
  if (!json) return emptyMeta();
  const scoped = {
    sidebar: json.sidebar,
    header: json.header,
    metadata: json.metadata,
  };
  const primary = findNode(scoped, "playlistSidebarPrimaryInfoRenderer") as
    | {
        title?: { runs?: { text?: string }[]; simpleText?: string };
        stats?: unknown[];
      }
    | undefined;
  const secondary = findNode(scoped, "playlistSidebarSecondaryInfoRenderer") as
    | {
        videoOwner?: {
          videoOwnerRenderer?: { title?: { runs?: { text?: string }[] } };
        };
      }
    | undefined;
  const header = (json as { header?: { playlistHeaderRenderer?: Record<string, unknown> } })
    .header?.playlistHeaderRenderer;
  const meta = (json as { metadata?: { playlistMetadataRenderer?: { title?: string } } })
    .metadata?.playlistMetadataRenderer;

  const title =
    textOf(primary?.title) ||
    meta?.title ||
    textOf(header?.title) ||
    "";
  const author =
    textOf(secondary?.videoOwner?.videoOwnerRenderer?.title) ||
    textOf(header?.ownerText) ||
    "";

  let trackCount: number | null = null;
  let plays: number | null = null;
  const stats = (primary?.stats ?? header?.stats ?? []) as unknown[];
  for (const stat of stats) {
    const label = textOf(stat);
    if (/\bvideo/i.test(label) && trackCount == null) trackCount = parseCount(label);
    else if (/\bview/i.test(label) && plays == null) plays = parseCount(label);
  }

  const thumbs =
    (findNode(scoped, "heroPlaylistThumbnailRenderer") as
      | { thumbnail?: { thumbnails?: { url: string }[] } }
      | undefined)?.thumbnail?.thumbnails ?? [];

  return {
    title,
    author: cleanArtist(author),
    thumbnail: thumbs.at(-1)?.url || "",
    plays,
    trackCount,
    clues: `${title} ${author} playlist`,
  };
}

async function ytOembed(url: string): Promise<DraftMeta> {
  const j = await getJson(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  );
  if (!j) return { title: "", author: "", thumbnail: "", plays: null, trackCount: null };
  const split = splitSongArtist(String(j.title || ""), cleanArtist(String(j.author_name || "")));
  return {
    title: split.song,
    author: split.artist,
    thumbnail: String(j.thumbnail_url || ""),
    plays: null,
    trackCount: null,
    clues: `${split.song} ${split.artist}`,
  };
}

async function fetchSpotify(data: z.infer<typeof Input>): Promise<DraftMeta> {
  const kind = data.contentType === "playlist" ? "playlist" : "track";
  const [embed, oembed] = await Promise.all([
    getText(`https://open.spotify.com/embed/${kind}/${data.id}`),
    getJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(data.url)}`),
  ]);
  const entity = parseSpotifyEntity(embed);
  const artists = Array.isArray(entity?.artists)
    ? entity.artists
        .map((a) => (a && typeof a.name === "string" ? a.name : ""))
        .filter(Boolean)
    : [];
  const title =
    (typeof entity?.name === "string" && entity.name) ||
    (typeof entity?.title === "string" && entity.title) ||
    String(oembed?.title || "");
  const author =
    artists.join(", ") ||
    (typeof entity?.subtitle === "string" && entity.subtitle) ||
    String(oembed?.author_name || "");
  const cover =
    firstImage(entity) ||
    String(oembed?.thumbnail_url || "");
  const trackCount = Array.isArray(entity?.trackList) ? entity.trackList.length : null;

  const trackNames = Array.isArray(entity?.trackList)
    ? entity.trackList
        .slice(0, 8)
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const row = item as { name?: string; title?: string };
          return row.name || row.title || "";
        })
        .filter(Boolean)
        .join(" ")
    : "";
  const clues = `${title} ${author} ${kind} ${trackNames}`;

  if (kind === "track") {
    return {
      title: title || "שיר",
      author,
      thumbnail: cover,
      plays: null,
      trackCount: null,
      clues,
    };
  }
  return {
    title: title || "פלייליסט",
    author,
    thumbnail: cover,
    plays: null,
    trackCount,
    clues,
  };
}

function parseSpotifyEntity(html: string | null): Record<string, unknown> | null {
  if (!html) return null;
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match?.[1]) return null;
  try {
    const data = JSON.parse(match[1]) as {
      props?: { pageProps?: { state?: { data?: { entity?: Record<string, unknown> } } } };
    };
    return data.props?.pageProps?.state?.data?.entity ?? null;
  } catch {
    return null;
  }
}

function firstImage(entity: Record<string, unknown> | null): string {
  if (!entity) return "";
  const visual = entity.visualIdentity as { image?: { url?: string }[] } | undefined;
  const fromVisual = visual?.image?.[0]?.url;
  if (fromVisual) return fromVisual;
  const cover = entity.coverArt as { sources?: { url?: string }[] } | undefined;
  return cover?.sources?.[0]?.url || "";
}

async function ytPost(path: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/${path}?prettyPrint=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ context: YT_CONTEXT, ...body }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getJson(url: string) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getText(url: string) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html", "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function findNode(root: unknown, key: string, depth = 0): unknown {
  if (!root || typeof root !== "object" || depth > 12) return undefined;
  const obj = root as Record<string, unknown>;
  if (key in obj) return obj[key];
  for (const value of Object.values(obj)) {
    const found = findNode(value, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function textOf(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node !== "object") return "";
  const obj = node as { simpleText?: string; text?: string; runs?: { text?: string }[] };
  if (obj.simpleText) return obj.simpleText;
  if (obj.text) return obj.text;
  if (Array.isArray(obj.runs)) return obj.runs.map((r) => r.text || "").join("");
  return "";
}

function parseCount(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function cleanArtist(value: string) {
  return value
    .replace(/\s+VEVO$/i, "")
    .replace(/\s+Topic$/i, "")
    .replace(/VEVO$/i, "")
    .trim();
}

function splitSongArtist(title: string, fallbackArtist: string) {
  const cleaned = title
    .replace(
      /\s*[\[(]?\s*(official\s*(music\s*)?(video|audio)|official|lyrics?|lyric\s*video|visualizer|audio\s*only|hd|4k|mv|music\s*video)\s*[\])]?/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  const parts = cleaned.split(/\s+[-–—|:]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const song = parts.slice(1).join(" ").trim();
    if (artist && song) return { artist, song };
  }
  return { artist: fallbackArtist, song: cleaned || title };
}