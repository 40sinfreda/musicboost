import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { MediaCard } from "@/components/boost-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoostDraft } from "@/lib/boost-draft";
import { fetchMediaMeta } from "@/lib/oembed";
import { parseMediaLink, platformLabel, type MediaMeta } from "@/lib/parser";

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

  async function detect() {
    setError("");
    const parsed = parseMediaLink(url);
    if (!parsed.ok) {
      patch({ media: null });
      setError(parsed.error);
      return;
    }
    setDetecting(true);
    try {
      const metaInfo = await Promise.race([
        fetchMediaMeta({
          data: {
            platform: parsed.data.platform,
            contentType: parsed.data.contentType,
            url: parsed.data.watchUrl || parsed.data.canonicalUrl,
            id: parsed.data.id,
            videoId: parsed.data.videoId,
            playlistId: parsed.data.playlistId,
          },
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("הזיהוי לקח יותר מדי. נסו שוב.")), 10000);
        }),
      ]);
      const fallbackTitle = parsed.data.contentType === "playlist" ? "פלייליסט" : "שיר";
      const title = metaInfo.title || fallbackTitle;
      const author = metaInfo.author || "";
      const next: MediaMeta = {
        ...parsed.data,
        title,
        author,
        thumbnail: metaInfo.thumbnail || parsed.data.thumbnail,
        plays: metaInfo.plays,
        trackCount: metaInfo.trackCount,
        blurb: metaInfo.blurb,
      };
      const suggested = title !== "שיר" && title !== "פלייליסט" ? title.slice(0, 40) : "";
      const now = new Date();
      const d = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
      patch({
        media: next,
        adTitle: suggested || adTitle,
        adBody: metaInfo.blurb,
        campaignName:
          campaignName ||
          `MusicBoost ${platformLabel(next.platform)} ${suggested || next.id} ${d}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "הזיהוי נכשל. נסו שוב.");
      patch({
        media: {
          ...parsed.data,
          title: parsed.data.contentType === "playlist" ? "פלייליסט" : "שיר",
          author: "",
        },
      });
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
        יוטיוב או ספוטיפיי, שיר או פלייליסט. נזהה קטגוריה, מקור והשמעות.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => patch({ url: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") void detect();
          }}
          placeholder="https://open.spotify.com/track/... או https://youtu.be/..."
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