"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, animate, motion } from "motion/react";
import { useDialKit } from "dialkit";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { config, formatAsOf } from "@/lib/config";
import { claimsForItem, deltaTone, formatForTone, type Tone } from "@/lib/narrative";
import type { EvidenceItem, Narrative, NarrativeStatus } from "@/lib/types";
import type { NarrativeContext } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { SensitivityChip } from "@/components/relay/SensitivityChip";
import {
  BackGlyph,
  DeltaDownGlyph,
  DeltaUpGlyph,
  EyeClosedGlyph,
  EyeOpenGlyph,
  GmailGlyph,
  SentCheckGlyph,
  SlackGlyph,
} from "@/components/relay/NavIcons";
import {
  markReviewedAction,
  saveDraftAction,
  sendNarrativeAction,
  unreviewAction,
} from "@/app/(app)/clients/[clientId]/narratives/[narrativeId]/actions";

/* ============================================================================
   The narrative workspace (Figma 506:5375) — the drafted message itself.
   Left, the Message input set (545:4483): the draft on a wash shell, every
   sentence selectable, a blue rail marking the selected one. Right, the
   Evidence set (545:4486): this week's numbers, the selected sentence's card
   lifted on a blue stroke. Under it all, the floating Narrative Nav (557:6049)
   — channel toggle, preview, copy, and the drafted → reviewed → sent pipeline.
   ========================================================================== */

const STATUS_LABEL: Record<NarrativeStatus, string> = {
  drafted: "Draft",
  reviewed: "Reviewed",
  sent: "Sent",
};

/* A dialkit spring dial hands back either a spring or an easing curve; Motion
   spells the latter "tween". */
type DialTransition =
  | { type: "spring"; [k: string]: unknown }
  | { type: "easing"; duration: number; ease: [number, number, number, number] };

function toMotion(t: DialTransition) {
  return t.type === "easing"
    ? { type: "tween" as const, duration: t.duration, ease: t.ease }
    : t;
}

/* The highlighter (component 552:4668): a 4px Foreground-01 track that is
   ALWAYS beside the card, spanning the known facts in totality — first fact's
   top to last fact's bottom — so the blue thumb TRAVELS smoothly inside a
   still track. The thumb is sized to the selected sentence: the set draws 26
   over a one-liner, the line plus 4 when it wraps. */
const RAIL_THUMB_MIN_PX = 26;

/** "Drafted, Jul 26, 5:30" (node 520:7956) — the stamp for the narrative's
 *  current station in the pipeline. The stamp writes the past participle
 *  ("Drafted"), unlike the pills' "Draft". */
const STAMP_LABEL: Record<NarrativeStatus, string> = {
  drafted: "Drafted",
  reviewed: "Reviewed",
  sent: "Sent",
};

function statusStamp(narrative: Narrative): string | null {
  const at =
    narrative.status === "sent"
      ? narrative.sentAt
      : narrative.status === "reviewed"
        ? narrative.reviewedAt
        : narrative.draftedAt;
  if (!at) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${STAMP_LABEL[narrative.status]}, ${get("month")} ${get("day")}, ${get("hour")}:${get("minute")}`;
}

function Dot({ size = "md" }: { size?: "md" | "sm" | "xs" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-full bg-grey-200",
        size === "md" && "size-dot-md",
        size === "sm" && "size-dot-sm",
        size === "xs" && "size-dot-xs",
      )}
    />
  );
}

export function NarrativeWorkspace({ context }: { context: NarrativeContext }) {
  const { narrative, snapshot, profile } = context;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // --- Stitch state ---
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const draftRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const claimRefs = useRef<Record<string, HTMLElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [rail, setRail] = useState<{ top: number; height: number } | null>(
    null,
  );
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(
    null,
  );

  /* Every interaction's tuning, on dials (dialkit). The defaults ARE the
     shipped motion; the panel exists so they can be played until they feel
     right, then written back here. */
  const dial = useDialKit(
    "Narrative interactions",
    {
      highlighter: {
        // The jelly: the thumb enters from the track's top and springs to the
        // selected fact; the same spring carries fact-to-fact travel.
        // Defaults are the user's tuned values (2026-08-16).
        travel: { type: "spring", visualDuration: 0.65, bounce: 0.35 },
        thumbPad: [6, 0, 16, 1],
      },
      evidenceScroll: {
        // The ride to an off-screen evidence card, either direction.
        spring: { type: "spring", visualDuration: 0.8, bounce: 0.12 },
        margin: [32, 0, 160, 4],
      },
      dim: {
        opacity: [0.5, 0.2, 1, 0.05],
        fadeMs: [200, 0, 800, 10],
      },
      preview: {
        // The scrim under the open preview — subtle but visible.
        overlayOpacity: [0.1, 0, 0.6, 0.01],
        fadeMs: [200, 0, 800, 10],
      },
    },
    { id: "narrative-interactions", persist: true },
  );

  // --- Edit state ---
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // --- Tone / preview ---
  const [tone, setTone] = useState<Tone>(
    narrative.channel === "slack" ? "slack" : "email",
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  // The preview dismisses like any popover: a click anywhere off the bar
  // closes it (Esc already does).
  useEffect(() => {
    if (!previewOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setPreviewOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [previewOpen]);

  const claims = useMemo(
    () => [...narrative.claims].sort((a, b) => a.order - b.order),
    [narrative.claims],
  );

  const selectedClaim = claims.find((c) => c.id === selectedClaimId);
  const activeItemIds = selectedClaim
    ? selectedClaim.evidenceRefs.map((r) => r.itemId)
    : [];
  const highlightedClaimIds = selectedItemId
    ? claimsForItem(claims, selectedItemId).map((c) => c.id)
    : [];
  const hasSelection = Boolean(selectedClaimId || selectedItemId);

  const clearSelection = useCallback(() => {
    setSelectedClaimId(null);
    setSelectedItemId(null);
  }, []);

  // Esc clears the stitch and the preview, as the rail header promises.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearSelection]);

  // The highlighter: the track spans the facts region; a selected fact — OR a
  // selected evidence card, through the claims it supports — raises the thumb
  // at that sentence's position and height, travelling inside the still
  // track. Clearing drops the thumb; editing hides both.
  const thumbClaimId = selectedClaimId ?? highlightedClaimIds[0] ?? null;
  const thumbPad = dial.highlighter.thumbPad;
  useEffect(() => {
    function measure() {
      const host = draftRef.current;
      if (!host || editing) {
        setRail(null);
        setThumb(null);
        return;
      }
      const hostBox = host.getBoundingClientRect();
      const factBoxes = claims
        .filter((c) => c.kind === "fact")
        .map((c) => claimRefs.current[c.id])
        .filter((el): el is HTMLElement => Boolean(el))
        .map((el) => el.getBoundingClientRect());
      if (factBoxes.length === 0) {
        setRail(null);
        setThumb(null);
        return;
      }
      const top = Math.min(...factBoxes.map((b) => b.top)) - hostBox.top;
      const bottom = Math.max(...factBoxes.map((b) => b.bottom)) - hostBox.top;
      const trackH = bottom - top;
      setRail({ top, height: trackH });

      const el = thumbClaimId ? claimRefs.current[thumbClaimId] : null;
      if (!el) {
        setThumb(null);
        return;
      }
      const box = el.getBoundingClientRect();
      const h = Math.min(
        Math.max(RAIL_THUMB_MIN_PX, Math.round(box.height) + thumbPad),
        trackH,
      );
      const center = box.top - hostBox.top + box.height / 2 - top;
      setThumb({
        top: Math.max(0, Math.min(trackH - h, center - h / 2)),
        height: h,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [thumbClaimId, editing, claims, thumbPad]);

  // The ride: whichever way a selection lands — a fact whose evidence sits
  // below the fold, or an evidence card picked while scrolled deep — the
  // sheet springs to bring that card comfortably into view, and no further
  // than it needs to. Picking an early card from the bottom is what carries
  // the view back up to its resting frame.
  const scrollItemId =
    selectedItemId ?? selectedClaim?.evidenceRefs[0]?.itemId ?? null;
  useEffect(() => {
    if (!scrollItemId) return;
    const scroller = scrollRef.current;
    const card = cardRefs.current[scrollItemId];
    if (!scroller || !card) return;
    const margin = dial.evidenceScroll.margin;
    const box = card.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    let delta = 0;
    if (box.bottom > view.bottom - margin) {
      delta = box.bottom - (view.bottom - margin);
    } else if (box.top < view.top + margin) {
      delta = box.top - (view.top + margin);
    }
    if (delta === 0) return;
    const controls = animate(
      scroller.scrollTop,
      scroller.scrollTop + delta,
      {
        ...toMotion(dial.evidenceScroll.spring),
        onUpdate: (v: number) => {
          scroller.scrollTop = v;
        },
      },
    );
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollItemId]);

  function selectClaim(id: string) {
    setSelectedItemId(null);
    setSelectedClaimId((cur) => (cur === id ? null : id));
  }

  function selectItem(id: string) {
    setSelectedClaimId(null);
    setSelectedItemId((cur) => (cur === id ? null : id));
  }

  // --- Actions ---

  const canEdit = narrative.status === "drafted";

  function startEditing() {
    setDraftText(claims.map((c) => c.text).join("\n\n"));
    setEditError(null);
    setEditing(true);
    clearSelection();
  }

  function saveDraft() {
    const paragraphs = draftText
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter((p) => p.length > 0);
    startTransition(async () => {
      const result = await saveDraftAction({
        clientId: profile.id,
        narrativeId: narrative.id,
        paragraphs,
      });
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      setEditing(false);
      setEditError(null);
      toast(config.copy.actions.saved);
      router.refresh();
    });
  }

  function onMarkReviewed() {
    startTransition(async () => {
      await markReviewedAction(profile.id, narrative.id);
      toast("Marked reviewed");
      router.refresh();
    });
  }

  function onUnreview() {
    startTransition(async () => {
      await unreviewAction(profile.id, narrative.id);
      toast(config.copy.splitView.backToDraft);
      router.refresh();
    });
  }

  function onSend() {
    startTransition(async () => {
      await sendNarrativeAction(profile.id, narrative.id);
      toast(`${config.copy.splitView.sentToastPrefix} ${profile.name}'s timeline`);
      router.refresh();
    });
  }

  async function copyDraft() {
    const text = formatForTone(tone, narrative, profile.name);
    const toneLabel =
      config.copy.channelLabel[tone === "email" ? "email" : "slack"];
    try {
      await navigator.clipboard.writeText(text);
      toast(`${config.copy.splitView.copiedToastPrefix} ${toneLabel}`);
    } catch {
      setPreviewOpen(true);
      toast("Copy blocked — select the preview text instead");
    }
  }

  const itemSelected = (item: EvidenceItem) =>
    activeItemIds.includes(item.id) || selectedItemId === item.id;

  const stamp = statusStamp(narrative);

  return (
    <>
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overscroll-contain scrollbar-stable"
      >
        <div className="flex flex-col items-center px-6 pt-8">
          <div className="flex w-full max-w-workspace flex-col pb-32 pt-16">
            {/* ── Masthead (506:5384) ── */}
            <Link
              href={`/clients/${profile.id}?tab=narratives`}
              className="flex items-center gap-0.5 font-geist text-fig-caption-1 text-heading-06 hover:text-heading-01"
            >
              <BackGlyph className="text-icon-explainer" />
              Back to narratives
            </Link>
            <div className="mt-2.5 flex w-full items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="font-greeting text-fig-h4 fig-sb text-heading-01">
                  {profile.name}
                </h1>
                <p className="flex items-center gap-2.5 font-geist text-fig-body fig-w450 text-heading-06">
                  <span>Weekly commentary</span>
                  <span className="flex items-center gap-1.5">
                    <Dot />
                    {narrative.week.label ?? narrative.week.start}
                  </span>
                </p>
              </div>
              {stamp && (
                <span className="shrink-0 font-geist text-fig-caption-1 text-heading-06">
                  {stamp}
                </span>
              )}
            </div>

            {/* Sensitivities ride the header (527:7960) — always in view
                while phrasing is being judged. */}
            {profile.sensitivities.length > 0 && (
              <div className="mt-3 flex w-full flex-wrap gap-3.5">
                {profile.sensitivities.map((s) => (
                  <SensitivityChip key={s.id} sensitivity={s} outlined />
                ))}
              </div>
            )}

            <div className="mt-8 w-full divider-b" />

            {/* ── Draft + evidence (510:6124) ── */}
            <div className="mt-12 flex w-full items-start justify-between gap-6">
              {/* Message input (545:4483) */}
              {/* Sticky against the sheet's scroll: when the evidence rail
                  runs longer, the draft pins and rides until the row's end —
                  the bottom of the evidence — releases it. */}
              <section
                ref={draftRef}
                aria-label="Draft"
                className="sticky top-8 min-w-0 max-w-draft flex-1 self-start"
              >
                {rail && !editing && (
                  <div
                    aria-hidden="true"
                    className="absolute -left-3.5 w-1 overflow-hidden rounded-4 bg-surface-foreground-01"
                    style={{ top: rail.top, height: rail.height }}
                  >
                    {thumb && (
                      /* Enters at the track's TOP and springs down to the
                         fact — the jelly — then the same spring carries
                         travel between facts. */
                      <motion.span
                        className="absolute left-0 w-1 rounded-4 bg-blue-500"
                        initial={{ top: 0, height: thumb.height }}
                        animate={{ top: thumb.top, height: thumb.height }}
                        transition={toMotion(dial.highlighter.travel)}
                      />
                    )}
                  </div>
                )}
                <div className="w-full rounded-18 border-fig border-border bg-surface-foreground-01 shadow-card">
                  <div className="flex w-full flex-col p-1">
                    {/* The header chip: the status at rest; "Editing draft" on
                        Foreground-02 while the card is open (545:4326). */}
                    <div className="flex items-center gap-1.5 px-2.5 py-2">
                      <span
                        className={cn(
                          "flex items-center rounded-full border-fig border-border px-1.5 py-0.5 font-geist text-fig-caption-1 text-heading-05",
                          editing
                            ? "bg-surface-foreground-02"
                            : "bg-surface-dashboard",
                        )}
                      >
                        {editing ? "Editing draft" : STATUS_LABEL[narrative.status]}
                      </span>
                      <Dot size="sm" />
                      <span className="font-geist text-fig-caption-1 text-heading-06">
                        {editing
                          ? "One paragraph per claim, separated by blank lines."
                          : "Select any sentence to see its evidence"}
                      </span>
                    </div>

                    {editing ? (
                      /* The Edit variant (545:4482): the SAME card, lifted onto
                         the blue active stroke, its prose editable in place —
                         not a separate grey editor. */
                      <>
                        <div className="w-full rounded-14 border border-blue-500 bg-surface-primary shadow-evidence-selected">
                          <textarea
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            aria-label="Draft text — one paragraph per claim"
                            className="min-h-96 w-full resize-y bg-transparent px-3 pb-16 pt-6 font-geist text-fig-prose fig-w450 text-heading-01 outline-none"
                          />
                        </div>
                        {editError && (
                          <p className="px-2 pt-2 font-geist text-fig-caption-1 text-red-700">
                            {editError}
                          </p>
                        )}
                        <div className="flex w-full items-center justify-end gap-1.5 px-2 py-1.5">
                          <Button
                            size="fig"
                            variant="ghost"
                            className="fig-sb"
                            onClick={() => {
                              setEditing(false);
                              setEditError(null);
                            }}
                          >
                            {config.copy.actions.cancel}
                          </Button>
                          <Button size="fig" className="fig-sb" onClick={saveDraft} disabled={pending}>
                            {config.copy.splitView.saveDraft}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-full rounded-14 border-fig border-border bg-surface-primary shadow-card-quiet"
                          onClick={(e) => {
                            if (e.target === e.currentTarget) clearSelection();
                          }}
                        >
                          {/* The set nests a 64 spacer around a pt-24 pb-10
                              text block (545:4379/4380) — 74 under the prose
                              in total, not 64. */}
                          <div className="px-3 pb-18.5 pt-6">
                            {narrative.emailGreeting && (
                              <p className="py-1.5 font-geist text-fig-body fig-w450 text-heading-05">
                                {narrative.emailGreeting}
                              </p>
                            )}
                            <div className="mt-4 flex flex-col gap-4">
                              {claims.map((claim) => {
                                const active =
                                  selectedClaimId === claim.id ||
                                  highlightedClaimIds.includes(claim.id);
                                if (claim.kind === "plan") {
                                  return (
                                    <p
                                      key={claim.id}
                                      className="font-geist text-fig-prose fig-w450 text-heading-01 whitespace-pre-wrap"
                                      title="Plan — forward-looking, no evidence needed"
                                    >
                                      {claim.text}
                                    </p>
                                  );
                                }
                                return (
                                  <p key={claim.id}>
                                    <span
                                      ref={(el) => {
                                        claimRefs.current[claim.id] = el;
                                      }}
                                      role="button"
                                      tabIndex={0}
                                      aria-pressed={selectedClaimId === claim.id}
                                      onClick={() => selectClaim(claim.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          selectClaim(claim.id);
                                        }
                                      }}
                                      className={cn(
                                        "cursor-pointer font-geist text-fig-prose fig-w450 text-heading-01 outline-none",
                                        active
                                          ? "sentence-underline"
                                          : "hover:sentence-underline focus-visible:sentence-underline",
                                      )}
                                    >
                                      {claim.text}
                                    </span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex w-full items-center justify-end px-2 py-1.5">
                            <Button size="fig" className="fig-sb" onClick={startEditing}>
                              {config.copy.splitView.editDraft}
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Evidence rail (545:4486) */}
              <aside aria-label="Evidence" className="w-evidence-rail shrink-0">
                <div className="w-full rounded-18 border-fig border-border bg-surface-dashboard shadow-card">
                  <div className="flex w-full flex-col p-1">
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="flex items-center gap-1.5 font-geist text-fig-caption-1 text-heading-06">
                        Evidence
                        <Dot />
                        This week
                      </span>
                      {hasSelection && (
                        <span className="flex items-center gap-1.5 font-geist text-fig-caption-1 text-heading-02">
                          <button
                            type="button"
                            onClick={clearSelection}
                            className="cursor-pointer"
                          >
                            Clear
                          </button>
                          <Dot />
                          Esc
                        </span>
                      )}
                    </div>

                    <div className="flex w-full flex-col gap-1">
                      {snapshot.items.map((item) => (
                        <EvidenceRailCard
                          key={item.id}
                          cardRef={(el) => {
                            cardRefs.current[item.id] = el;
                          }}
                          item={item}
                          selected={itemSelected(item)}
                          dimmed={hasSelection && !itemSelected(item)}
                          dimOpacity={dial.dim.opacity}
                          dimMs={dial.dim.fadeMs}
                          onSelect={() => selectItem(item.id)}
                        />
                      ))}
                    </div>

                    <div className="flex items-center px-2.5 py-1.5">
                      <span className="font-geist text-fig-caption-2 text-heading-06">
                        as of {formatAsOf(snapshot.asOf)} · Google Ads + Tracker
                      </span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* The scrim under the open preview: a base-black wash over the WHOLE
          viewport — nav, panel and sheet — its opacity on a dial. Fixed, so it
          escapes the sheet's overflow clip; clicking it lands outside the
          bar, so the same pointer that dims the page dismisses the popover. */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            aria-hidden="true"
            className="fixed inset-0 z-20 bg-base-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: dial.preview.overlayOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: dial.preview.fadeMs / 1000 }}
          />
        )}
      </AnimatePresence>

      {/* ── Narrative Nav (557:6049) — floats over the sheet, centred.
             Height pinned to the frame's 42; the row inside fills it. ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-6">
        <div
          ref={barRef}
          className="pointer-events-auto relative h-nav-bar w-narrative-bar rounded-12 border-fig border-border bg-surface-primary p-1 shadow-float-bar"
        >
          {previewOpen && (
            <div className="absolute bottom-full left-0 mb-1.5 w-preview-pop overflow-hidden rounded-14 border-fig border-border bg-surface-primary shadow-preview-pop">
              {/* The cap is on the SCROLLING layer, so the clipped tail can be
                  reached; the fade only signals there is more below. */}
              <div className="max-h-preview-pop-cap overflow-y-auto overscroll-contain">
                <div className="flex items-start gap-2 px-3 pb-6 pt-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-geist text-fig-caption-1 text-heading-06">
                      {tone === "email"
                        ? `${config.copy.channelLabel.email} — full`
                        : `${config.copy.channelLabel.slack} — condensed`}
                    </p>
                    <pre className="mt-4 whitespace-pre-wrap font-geist text-fig-caption-1 text-base-black">
                      {formatForTone(tone, narrative, profile.name)}
                    </pre>
                  </div>
                  {tone === "email" ? (
                    <GmailGlyph className="shrink-0" />
                  ) : (
                    <SlackGlyph className="shrink-0" />
                  )}
                </div>
              </div>
              <div
                aria-hidden="true"
                className="preview-fade pointer-events-none absolute inset-x-0 bottom-0 h-6"
              />
            </div>
          )}

          <div className="flex h-full w-full items-center gap-bar-gap">
            <div className="flex h-full shrink-0 items-center gap-1.5">
              {/* The channel pill (545:4593 / 545:4545): two SELF-CONTAINED
                  halves — Email rounded on the left, the capsule on the right
                  — because any structure that puts the black fill BEHIND the
                  white capsule leaks a black rim at the capsule's edges (the
                  fill paints under the transparent border, and the nested
                  radii never quite cover its corners). Side by side, no black
                  surface exists behind the white half at all. The black half
                  clips its fill to the padding box so the transparent hairline
                  that keeps the toggle size-stable stays unpainted. */}
              <div role="group" aria-label="Channel" className="flex h-full items-stretch">
                <button
                  type="button"
                  aria-pressed={tone === "email"}
                  onClick={() => {
                    setTone("email");
                    setPreviewOpen(true);
                  }}
                  className={cn(
                    "flex h-full items-center rounded-l-8 border-fig bg-clip-padding pl-2.5 pr-2 font-geist text-fig-button fig-sb whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-150",
                    tone === "email"
                      ? "border-transparent bg-base-black text-white"
                      : "border-border bg-surface-primary text-heading-02",
                  )}
                >
                  {config.copy.channelLabel.email}
                </button>
                <button
                  type="button"
                  aria-pressed={tone === "slack"}
                  onClick={() => {
                    setTone("slack");
                    setPreviewOpen(true);
                  }}
                  className={cn(
                    "flex h-full items-center rounded-r-8 border-fig bg-clip-padding px-2.5 font-geist text-fig-button fig-sb whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-150",
                    tone === "slack"
                      ? "border-border bg-base-black text-white"
                      : "border-border bg-surface-primary text-heading-03",
                  )}
                >
                  {config.copy.channelLabel.slack}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                aria-label={
                  previewOpen
                    ? config.copy.splitView.previewHide
                    : config.copy.splitView.previewShow
                }
                title={
                  previewOpen
                    ? config.copy.splitView.previewHide
                    : config.copy.splitView.previewShow
                }
                className="flex items-center rounded-4 text-grey-400 outline-none hover:text-heading-01 focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                {previewOpen ? (
                  <EyeClosedGlyph className="shrink-0" />
                ) : (
                  <EyeOpenGlyph className="shrink-0" />
                )}
              </button>
            </div>

            {/* The Sent variant (557:6144) clears the pipeline: Copy darkens
                to heading-02 and a quiet outline pill with the circled check
                takes the actions' place, right-aligned. */}
            <div
              className={cn(
                "flex h-full min-w-0 flex-1 items-center gap-1",
                narrative.status === "sent" && "justify-end",
              )}
            >
              <button
                type="button"
                onClick={copyDraft}
                className={cn(
                  "flex h-full items-center rounded-8 border-fig border-border bg-surface-primary px-3.5 font-geist text-fig-button fig-sb outline-none hover:bg-surface-foreground-01 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500",
                  narrative.status === "sent"
                    ? "text-heading-02"
                    : "text-heading-06",
                )}
              >
                {config.copy.splitView.copy}
              </button>
              {narrative.status === "sent" ? (
                <span className="flex h-full items-center gap-1.5 rounded-8 border-fig border-border px-3.5 font-geist text-fig-button fig-sb text-grey-400">
                  {STATUS_LABEL.sent}
                  <SentCheckGlyph className="shrink-0 text-grey-300" />
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={
                      narrative.status === "reviewed"
                        ? onUnreview
                        : onMarkReviewed
                    }
                    disabled={pending || editing}
                    className="flex h-full min-w-0 flex-1 items-center justify-center rounded-8 border-fig border-border bg-base-black px-3.5 font-geist text-fig-button fig-sb text-white whitespace-nowrap outline-none disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-150"
                  >
                    {narrative.status === "reviewed"
                      ? config.copy.splitView.backToDraft
                      : "Mark as reviewed"}
                  </button>
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={narrative.status !== "reviewed" || pending}
                    className="flex h-full items-center rounded-8 border-fig border-border bg-blue-500 px-3.5 font-geist text-fig-button fig-sb text-white outline-none hover:bg-blue-400 disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-150"
                  >
                    {config.copy.splitView.send}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* One evidence card (545:3549 selected / 545:3593 at rest): source chip,
   metric, the 19px figure with its delta badge, and the sentence of
   interpretation under a hairline. Selected lifts onto a 1px Blue/500 stroke
   with the blue halo pair — the same emphasis language as the selectors. */
function EvidenceRailCard({
  cardRef,
  item,
  selected,
  dimmed,
  dimOpacity,
  dimMs,
  onSelect,
}: {
  cardRef?: (el: HTMLElement | null) => void;
  item: EvidenceItem;
  selected: boolean;
  dimmed: boolean;
  /** The unlinked cards' fade while a selection is active — on dials. */
  dimOpacity: number;
  dimMs: number;
  onSelect: () => void;
}) {
  const tone = deltaTone(item);
  const direction =
    item.deltaPct == null || item.deltaPct === 0
      ? "flat"
      : item.deltaPct > 0
        ? "up"
        : "down";
  const DeltaGlyph = direction === "down" ? DeltaDownGlyph : DeltaUpGlyph;
  const [deltaHead, ...deltaRest] = item.deltaLabel.split(" vs ");
  const deltaTail = deltaRest.join(" vs ");
  const sourceLabel =
    item.source === "Tracker" && item.sourceOfTruth
      ? `Tracker · ${item.sourceOfTruth}`
      : item.source;

  return (
    <article
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Evidence: ${item.metricLabel}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        opacity: dimmed ? dimOpacity : 1,
        transitionDuration: `${dimMs}ms`,
      }}
      className={cn(
        /* The set's two variants (545:4485 / 545:4486): at REST every card is
           white with the figure in black; a selection turns the others onto
           the dashboard fill (the dials own the fade) with the figure
           receding to heading-06.

           The hairline is the SAME 0.7 in every state — swapping it for the
           selected 1px resized the card by the difference and staggered the
           whole rail. The blue stroke rides as an inset ring instead (painted,
           not laid out), the selector recipe. */
        "w-full cursor-pointer rounded-14 border-fig border-border text-left outline-none transition-opacity",
        selected
          ? "bg-surface-primary ring-1 ring-blue-500 ring-inset shadow-evidence-selected"
          : dimmed
            ? "bg-surface-dashboard shadow-card-quiet"
            : "bg-surface-primary shadow-card-quiet",
      )}
    >
      <div className="divider-b flex flex-col px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          {/* The hairline stays in BOTH states (transparent when the wash goes
              blue) so the chip — and with it the whole header row — never
              changes height on selection. */}
          <span
            className={cn(
              "flex items-center rounded-full border-fig px-1.5 py-0.5 font-geist text-fig-caption-2",
              selected
                ? "border-transparent bg-blue-10 text-blue-500"
                : "border-border bg-surface-foreground-01 text-heading-06",
            )}
          >
            {sourceLabel}
          </span>
          {selected && (
            <span className="flex items-center rounded-full border-fig border-border bg-surface-foreground-01 px-1.5 py-0.5 font-geist text-fig-caption-2 text-heading-06">
              Selected
            </span>
          )}
        </div>
        <p className="mt-2 font-geist text-fig-caption-1 text-heading-05">
          {item.metricLabel}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "font-greeting text-fig-h6 fig-regular",
              dimmed ? "text-heading-06" : "text-heading-01",
            )}
          >
            {item.valueDisplay}
          </span>
          {item.deltaPct != null && (
            <span
              className={cn(
                "flex min-w-0 items-center gap-1 font-geist text-fig-caption-2",
                tone === "good" && "text-green-600",
                tone === "bad" && "text-red-600",
                tone === "neutral" && "text-heading-06",
              )}
            >
              {direction !== "flat" && (
                <DeltaGlyph
                  className="shrink-0"
                  discClassName={
                    tone === "bad"
                      ? "fill-red-50"
                      : tone === "good"
                        ? "fill-green-100"
                        : "fill-surface-foreground-02"
                  }
                />
              )}
              <span className="whitespace-nowrap">{deltaHead}</span>
              {deltaTail && (
                <>
                  <span
                    aria-hidden="true"
                    className="size-dot-xs shrink-0 rounded-full bg-current"
                  />
                  <span className="truncate">{deltaTail}</span>
                </>
              )}
            </span>
          )}
        </div>
      </div>
      {(item.note ?? item.unavailableReason) && (
        <p className="px-3 pb-3 pt-2.5 font-geist text-fig-caption-1 text-heading-06">
          {item.note ?? item.unavailableReason}
        </p>
      )}
    </article>
  );
}
