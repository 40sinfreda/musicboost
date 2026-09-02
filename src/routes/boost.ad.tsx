import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AdMock } from "@/components/boost-ui";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { audienceLang, hasHebrew, heuristicAdCopy, MAX_AD_BODY } from "@/lib/ad-copy";
import { CTA_LABEL, useBoostDraft, type Cta, type Objective } from "@/lib/boost-draft";

export const Route = createFileRoute("/boost/ad")({ component: BoostAd });

function BoostAd() {
  const hydrated = useBoostDraft((s) => s.hydrated);
  const media = useBoostDraft((s) => s.media);

  if (!hydrated) return <div className="h-64" />;
  if (!media) return <Navigate to="/boost/link" />;

  return <AdForm />;
}

function AdForm() {
  const navigate = useNavigate();
  const media = useBoostDraft((s) => s.media)!;
  const adTitle = useBoostDraft((s) => s.adTitle);
  const adBody = useBoostDraft((s) => s.adBody);
  const cta = useBoostDraft((s) => s.cta);
  const objective = useBoostDraft((s) => s.objective);
  const campaignName = useBoostDraft((s) => s.campaignName);
  const countries = useBoostDraft((s) => s.countries);
  const patch = useBoostDraft((s) => s.patch);
  const lang = audienceLang(countries);

  useEffect(() => {
    const bodyHe = hasHebrew(adBody);
    const mismatch = (lang === "en" && bodyHe) || (lang === "he" && adBody.length > 0 && !bodyHe);
    const generic = !adBody || adBody.length > MAX_AD_BODY || /לחץ והאזן|האזן עכשיו/.test(adBody);
    if (!mismatch && !generic) return;
    const generated = heuristicAdCopy({
      title: media.title,
      author: media.author,
      contentType: media.contentType,
      clues: `${media.title} ${media.author} ${media.blurb || ""}`,
      trackCount: media.trackCount ?? null,
      lang,
    });
    const next = lang === "he" && media.blurb && hasHebrew(media.blurb) ? media.blurb : generated;
    if (next && next !== adBody) patch({ adBody: next });
  }, [adBody, countries, lang, media.author, media.blurb, media.contentType, media.title, media.trackCount, patch]);

  return (
    <div>
      <img
        src="/images/step-ad.jpg"
        alt=""
        className="mb-6 h-48 w-full rounded-xl object-cover sm:h-56"
      />
      <h1 className="text-3xl font-semibold tracking-tight">תוכן המודעה</h1>
      <p className="mt-2 text-base leading-relaxed text-muted">
        {lang === "en"
          ? "הקהל מחוץ לישראל, אז כל הטקסט במודעה באנגלית. אפשר לתקן לפני הסגירה."
          : "הטקסט הראשי נכתב לפי הסגנון שזוהה בשיר או בפלייליסט. אפשר לתקן לפני הסגירה."}
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <Label>כותרת המודעה</Label>
          <Input
            maxLength={40}
            value={adTitle}
            onChange={(e) => patch({ adTitle: e.target.value })}
          />
          <Label className="mt-4">טקסט ראשי</Label>
          <Textarea
            maxLength={MAX_AD_BODY}
            rows={3}
            value={adBody}
            onChange={(e) => patch({ adBody: e.target.value })}
          />
          <p className="mt-1 text-xs text-subtle">
            עד {MAX_AD_BODY} תווים. {adBody.length} מתוך {MAX_AD_BODY}
          </p>
          <Label className="mt-4">קריאה לפעולה</Label>
          <select
            className="mt-2 flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg"
            value={cta}
            onChange={(e) => patch({ cta: e.target.value as Cta })}
          >
            <option value="LISTEN_NOW">Listen Now</option>
            <option value="LEARN_MORE">Learn More</option>
            <option value="WATCH_MORE">Watch More</option>
          </select>
          <Label className="mt-4">יעד</Label>
          <select
            className="mt-2 flex h-11 w-full rounded-md border border-border bg-elevated px-3 text-sm text-fg"
            value={objective}
            onChange={(e) => patch({ objective: e.target.value as Objective })}
          >
            <option value="OUTCOME_TRAFFIC">תנועה לקישור</option>
            <option value="OUTCOME_ENGAGEMENT">מעורבות</option>
            <option value="OUTCOME_AWARENESS">מודעות</option>
          </select>
          <Label className="mt-4">שם פנימי</Label>
          <Input
            value={campaignName}
            onChange={(e) => patch({ campaignName: e.target.value })}
          />
        </div>
        <AdMock
          title={adTitle || media.title}
          body={adBody}
          thumbnail={media.thumbnail}
          cta={CTA_LABEL[cta]}
          domain={media.platform === "youtube" ? "youtube.com" : "open.spotify.com"}
        />
      </div>
      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void navigate({ to: "/boost/budget" })}>
          <ArrowRight className="size-4" />
          חזרה
        </Button>
        <Button size="lg" onClick={() => void navigate({ to: "/boost/pay" })}>
          סגירת עיסקה
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
