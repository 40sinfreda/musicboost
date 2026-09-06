import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MediaCard } from "@/components/boost-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoostDraft } from "@/lib/boost-draft";
import { fetchMediaMeta } from "@/lib/oembed";
import { extractMediaUrl, parseMediaLink, platformLabel, type MediaMeta } from "@/lib/parser";

export const Route = createFileRoute("/boost/link")({ component: BoostLink });

function BoostLink() {
  const navigate = useNavigate();
  const url = useBoostDraft((s) => s.url);
  const media = useBoostDraft((s) => s.media);
  const adTitle = useBoostDraft((s) => s.adTitle);
  const campaignName = useBoostDraft((s) => s.campaignName);
  const patch = useBoostDraft((s) => s.patch);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const lastTried = useRef("");

  function applyParsed(raw: string) {
    const parsed = parseMediaLink(raw);
    if (!parsed.ok) {
      patch({ media: null });
      setError(parsed.error);
      return null;
    }
    const fallbackTitle = parsed.data.contentType === "playlist" ? "פלייליסט" : "שיר";
    const next: MediaMeta = {
      ...parsed.data,
      title: fallbackTitle,
      author: "",
    };
    patch({ media: next, url: parsed.data.canonicalUrl });
    setError("");
    return parsed.data;
  }

  async function detect(raw = url) {
    const cleaned = extractMediaUrl(raw);
    if (!cleaned) {
      setError("חסר קישור");
      return;
    }
    if (cleaned === lastTried.current && media) return;
    lastTried.current = cleaned;
    const parsed = applyParsed(cleaned);
    if (!parsed) return;
    setDetecting(true);
    try {
      const metaInfo = await Promise.race([
        fetchMediaMeta({
          data: {
            platform: parsed.platform,
            contentType: parsed.contentType,
            url: parsed.watchUrl || parsed.canonicalUrl,
            id: parsed.id,
            videoId: parsed.videoId,
            playlistId: parsed.playlistId,
          },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("timeout")), 6000);
        }),
      ]);
      const fallbackTitle = parsed.contentType === "playlist" ? "פלייליסט" : "שיר";
      const title = metaInfo.title || fallbackTitle;
      const suggested = title !== "שיר" && title !== "פלייליסט" ? title.slice(0, 40) : "";
      const now = new Date();
      const d = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
      patch({
        media: {
          ...parsed,
          title,
          author: metaInfo.author || "",
          thumbnail: metaInfo.thumbnail || parsed.thumbnail,
          plays: metaInfo.plays,
          trackCount: metaInfo.trackCount,
          blurb: metaInfo.blurb,
        },
        adTitle: suggested || adTitle,
        adBody: metaInfo.blurb,
        campaignName:
          campaignName ||
          `MusicBoost ${platformLabel(parsed.platform)} ${suggested || parsed.id} ${d}`,
      });
    } catch {
      // Keep the instant parse so the user can continue.
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div>
      <img
        src="/images/step-link.jpg"
        alt=""
        className="mb-6 h-48 w-full rounded-xl object-cover sm:h-56"
      />
      <h1 className="text-3xl font-semibold tracking-tight">הדבק קישור</h1>
      <p className="mt-2 text-base leading-relaxed text-muted">
        יוטיוב או ספוטיפיי, שיר או פלייליסט. נזהה לבד אחרי ההדבקה.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => patch({ url: e.target.value })}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            window.setTimeout(() => void detect(text || url), 0);
          }}
          onBlur={() => {
            if (url.trim()) void detect();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void detect();
          }}
          placeholder="הדבק קישור לשיר או לפלייליסט"
          aria-label="קישור לשיר או פלייליסט"
        />
        <Button onClick={() => void detect()} disabled={detecting} className="sm:w-28">
          {detecting ? <Loader2 className="size-4 animate-spin" /> : "זהה"}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 rounded-md border border-danger/30 bg-elevated px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {media ? (
        <div className="mt-5">
          <MediaCard media={media} />
          {detecting ? <p className="mt-2 text-sm text-muted">משלים פרטים...</p> : null}
        </div>
      ) : null}
      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          disabled={!media}
          onClick={() => void navigate({ to: "/boost/audience" })}
        >
          המשך לקהל
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}