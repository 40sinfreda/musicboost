import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Chip } from "@/components/boost-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoostDraft } from "@/lib/boost-draft";
import { CONTINENT_ORDER, GEO, type ContinentKey } from "@/lib/geo";

export const Route = createFileRoute("/boost/audience")({ component: BoostAudience });

function BoostAudience() {
  const navigate = useNavigate();
  const hydrated = useBoostDraft((s) => s.hydrated);
  const media = useBoostDraft((s) => s.media);
  const continent = useBoostDraft((s) => s.continent);
  const countries = useBoostDraft((s) => s.countries);
  const countryQuery = useBoostDraft((s) => s.countryQuery);
  const ageMin = useBoostDraft((s) => s.ageMin);
  const ageMax = useBoostDraft((s) => s.ageMax);
  const gender = useBoostDraft((s) => s.gender);
  const patch = useBoostDraft((s) => s.patch);

  if (!hydrated) return <div className="h-64" />;
  if (!media) return <Navigate to="/boost/link" />;

  const filtered = GEO[continent].countries.filter(
    (c) =>
      !countryQuery.trim() ||
      c.name.includes(countryQuery) ||
      c.code.toLowerCase().includes(countryQuery.toLowerCase()),
  );

  function selectContinent(key: ContinentKey) {
    patch({ continent: key, countries: GEO[key].countries.map((c) => c.code), countryQuery: "" });
  }

  function toggleCountry(code: string) {
    patch({
      countries: countries.includes(code)
        ? countries.filter((c) => c !== code)
        : [...countries, code],
    });
  }

  return (
    <div>
      <img
        src="/images/step-audience.jpg"
        alt=""
        className="mb-6 h-48 w-full rounded-xl object-cover sm:h-56"
      />
      <h1 className="text-3xl font-semibold tracking-tight">מי ישמע את השיר</h1>
      <p className="mt-2 text-base leading-relaxed text-muted">
        יבשת, מדינות וגילאים. זה הקהל של המודעה.
      </p>

      <Label className="mt-6">יבשת</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONTINENT_ORDER.map((key) => (
          <Chip key={key} on={continent === key} onClick={() => selectContinent(key)}>
            {GEO[key].label}
          </Chip>
        ))}
      </div>
      <Label className="mt-6">מדינות</Label>
      <Input
        className="mt-2"
        value={countryQuery}
        onChange={(e) => patch({ countryQuery: e.target.value })}
        placeholder="חיפוש מדינה..."
      />
      <div className="mt-3 flex max-h-52 flex-wrap gap-2 overflow-auto">
        {filtered.map((c) => (
          <Chip key={c.code} on={countries.includes(c.code)} onClick={() => toggleCountry(c.code)}>
            {c.name}
          </Chip>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>גיל מינימום</Label>
          <Input
            type="number"
            min={13}
            max={65}
            value={ageMin}
            onChange={(e) => patch({ ageMin: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>גיל מקסימום</Label>
          <Input
            type="number"
            min={13}
            max={65}
            value={ageMax}
            onChange={(e) => patch({ ageMax: Number(e.target.value) })}
          />
        </div>
      </div>
      <Label className="mt-6">מגדר</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip on={gender === "all"} onClick={() => patch({ gender: "all" })}>
          הכל
        </Chip>
        <Chip on={gender === "1"} onClick={() => patch({ gender: "1" })}>
          גברים
        </Chip>
        <Chip on={gender === "2"} onClick={() => patch({ gender: "2" })}>
          נשים
        </Chip>
      </div>
      <div className="mt-8 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => void navigate({ to: "/boost/link" })}>
          <ArrowRight className="size-4" />
          חזרה
        </Button>
        <Button
          size="lg"
          disabled={!countries.length}
          onClick={() => void navigate({ to: "/boost/budget" })}
        >
          המשך
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
