"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bar,
  DigestSkeleton,
  DueSkeleton,
  NavSkeleton,
  TodaySkeleton,
  WaitingSkeleton,
} from "@/components/relay/LoadingSkeletons";

/* ============================================================================
   TEMPORARY. Delete this page once the shimmer is dialled in.

   The `shimmer` utility in globals.css reads every one of its numbers from a CSS
   variable. This page writes those variables onto <html> at runtime, so the
   skeletons below — the real components, not copies — re-shimmer live as the
   sliders move. Pick the look, press Copy, paste the block into the :root rule
   in globals.css, and this page can go.

   Nothing here is imported by the product. The catalogue sits outside the (app)
   route group, so no app code depends on it existing.
   ========================================================================== */

type Knob = {
  key: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

const KNOBS: Knob[] = [
  {
    key: "--shimmer-duration",
    label: "Duration",
    hint: "One sweep, edge to edge. Slower reads calmer; under ~0.8s it nags.",
    min: 0.2,
    max: 4,
    step: 0.1,
    unit: "s",
  },
  {
    key: "--shimmer-band",
    label: "Band width",
    hint: "How wide the moving highlight is. In px, so bars of different widths stay in step.",
    min: 40,
    max: 480,
    step: 10,
    unit: "px",
  },
  {
    key: "--shimmer-angle",
    label: "Angle",
    hint: "90° is a straight vertical edge; higher slants it forward.",
    min: 0,
    max: 180,
    step: 1,
    unit: "deg",
  },
  {
    key: "--shimmer-opacity",
    label: "Highlight strength",
    hint: "How much of the highlight colour reaches the base at the band's centre.",
    min: 0,
    max: 1,
    step: 0.05,
    unit: "",
  },
  {
    key: "--shimmer-delay",
    label: "Delay",
    hint: "Dead time before the first sweep. Usually 0.",
    min: 0,
    max: 2,
    step: 0.1,
    unit: "s",
  },
];

const EASINGS = [
  "ease-in-out",
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "cubic-bezier(0.4, 0, 0.2, 1)",
];

/** The values shipped in globals.css. Reset returns here. */
const DEFAULTS: Record<string, string> = {
  "--shimmer-base": "#f4f4f4",
  "--shimmer-highlight": "#ffffff",
  "--shimmer-opacity": "0.9",
  "--shimmer-angle": "100",
  "--shimmer-band": "160",
  "--shimmer-duration": "1.5",
  "--shimmer-delay": "0",
  "--shimmer-easing": "ease-in-out",
};

const unitFor = (key: string) => KNOBS.find((k) => k.key === key)?.unit ?? "";

export default function SkeletonTweakPage() {
  const [values, setValues] = useState<Record<string, string>>(DEFAULTS);
  const [copied, setCopied] = useState(false);

  /* Base is the one value that starts as a reference to another token
     (--color-surface-foreground-01). Resolve it once so the colour input has a
     real hex to show rather than an empty swatch. */
  useEffect(() => {
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-surface-foreground-01")
      .trim();
    if (resolved) {
      setValues((v) => ({ ...v, "--shimmer-base": resolved }));
    }
  }, []);

  const apply = useCallback((key: string, raw: string) => {
    setValues((v) => ({ ...v, [key]: raw }));
    setCopied(false);
    document.documentElement.style.setProperty(key, `${raw}${unitFor(key)}`);
  }, []);

  function reset() {
    for (const key of Object.keys(DEFAULTS)) {
      document.documentElement.style.removeProperty(key);
    }
    setValues(DEFAULTS);
    setCopied(false);
  }

  const css = [
    ":root {",
    ...Object.entries(values).map(
      ([k, v]) => `  ${k}: ${v}${unitFor(k)};`,
    ),
    "}",
  ].join("\n");

  async function copy() {
    await navigator.clipboard.writeText(css);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="font-geist text-fig-caption-2 uppercase tracking-wide text-heading-06">
          Temporary · delete when dialled in
        </p>
        <h1 className="font-geist text-28 fig-sb text-heading-01">
          Skeleton shimmer
        </h1>
        <p className="max-w-column font-geist text-fig-caption-1 text-heading-06">
          Every specimen below is the real skeleton component, sized from the
          frame it stands in for. The sliders write CSS variables onto{" "}
          <code className="font-geist text-fig-caption-2 text-heading-05">
            &lt;html&gt;
          </code>
          , so what you see is exactly what the app will do. Copy the block and
          I&apos;ll bake it into globals.css.
        </p>
      </header>

      {/* Controls ---------------------------------------------------------- */}
      <section className="flex flex-col gap-4 rounded-18 border-fig border-border bg-surface-primary p-4 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          {KNOBS.map((knob) => (
            <label key={knob.key} className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-geist text-fig-body fig-medium text-heading-01">
                  {knob.label}
                </span>
                <span className="font-geist text-fig-caption-2 text-heading-05">
                  {values[knob.key]}
                  {knob.unit}
                </span>
              </span>
              <input
                type="range"
                min={knob.min}
                max={knob.max}
                step={knob.step}
                value={values[knob.key]}
                onChange={(e) => apply(knob.key, e.target.value)}
                className="w-full accent-blue-500"
              />
              <span className="font-geist text-fig-caption-2 text-caption-1">
                {knob.hint}
              </span>
            </label>
          ))}

          <label className="flex flex-col gap-1">
            <span className="font-geist text-fig-body fig-medium text-heading-01">
              Base
            </span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={values["--shimmer-base"]}
                onChange={(e) => apply("--shimmer-base", e.target.value)}
                className="size-avatar rounded-8 border-fig border-border"
              />
              <span className="font-geist text-fig-caption-2 text-heading-05">
                {values["--shimmer-base"]}
              </span>
            </span>
            <span className="font-geist text-fig-caption-2 text-caption-1">
              The resting fill. Currently Surface/Foreground-01.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-geist text-fig-body fig-medium text-heading-01">
              Highlight
            </span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={values["--shimmer-highlight"]}
                onChange={(e) => apply("--shimmer-highlight", e.target.value)}
                className="size-avatar rounded-8 border-fig border-border"
              />
              <span className="font-geist text-fig-caption-2 text-heading-05">
                {values["--shimmer-highlight"]}
              </span>
            </span>
            <span className="font-geist text-fig-caption-2 text-caption-1">
              What sweeps across it.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-geist text-fig-body fig-medium text-heading-01">
              Easing
            </span>
            <select
              value={values["--shimmer-easing"]}
              onChange={(e) => apply("--shimmer-easing", e.target.value)}
              className="rounded-8 border-fig border-border bg-surface-primary p-2 font-geist text-fig-caption-1 text-heading-01"
            >
              {EASINGS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <span className="font-geist text-fig-caption-2 text-caption-1">
              ease-in-out eases in and out of each edge; linear is mechanical.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 divider-t border-border pt-4">
          <button
            type="button"
            onClick={copy}
            className="rounded-8 bg-primary px-2.5 py-1.5 font-geist text-fig-button fig-medium text-primary-foreground"
          >
            {copied ? "Copied" : "Copy CSS"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-8 border-fig border-border bg-surface-primary px-2.5 py-1.5 font-geist text-fig-button fig-medium text-heading-01"
          >
            Reset
          </button>
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-8 bg-surface-foreground-01 p-2 font-geist text-fig-caption-2 text-heading-05">
            {css}
          </pre>
        </div>
      </section>

      {/* Specimens --------------------------------------------------------- */}
      <Specimen
        title="Bars"
        note="Different widths, one band. If these fall out of step with each other, the band is set in % somewhere — it must be px."
      >
        <div className="flex flex-col gap-2">
          <Bar className="h-2.5 w-24" />
          <Bar className="h-3 w-64" />
          <Bar className="h-3.5 w-full" />
          <Bar className="h-7 w-40 rounded-8" />
          <Bar className="size-avatar rounded-10" />
        </div>
      </Specimen>

      <Specimen title="Sidebar" note="Both widths — 230 expanded, 55 collapsed.">
        <div className="flex h-96 gap-6">
          <NavSkeleton />
          <NavSkeleton collapsed />
        </div>
      </Specimen>

      <Specimen title="Digest band" note="Four clients, 34px marks.">
        <DigestSkeleton />
      </Specimen>

      <Specimen title="Waiting on you" note="Mirrors WaitingList row for row.">
        <WaitingSkeleton />
      </Specimen>

      <Specimen title="Due this week" note="Row ends in a button, not an age.">
        <DueSkeleton />
      </Specimen>

      <Specimen
        title="Today, whole page"
        note="What /today actually renders while it loads."
      >
        <TodaySkeleton />
      </Specimen>
    </div>
  );
}

function Specimen({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-geist text-fig-body fig-medium text-heading-01">
          {title}
        </h2>
        <p className="font-geist text-fig-caption-2 text-heading-06">{note}</p>
      </div>
      <div
        className={cn(
          "rounded-18 border-fig border-border bg-surface-foreground-01 p-6",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}
