"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { config } from "@/lib/config";
import {
  clearLogoAction,
  refetchLogoAction,
  setDomainAction,
  uploadLogoAction,
} from "@/app/(app)/admin/clients/logo-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { ProfileFooter, ProfileWell } from "@/components/relay/ProfileCard";
import { SpinnerGlyph, TrashGlyph } from "@/components/relay/NavIcons";

/* The per-client logo control — Figma component set 447:2572, all seven
   states. They map onto app state rather than being modes of their own:

     Default          no domain, input untouched
     Input selected   input focused, still placeholder
     Input filled     typed text differs from the saved domain
     Save clicked     the save/lookup is in flight — Save goes to the working
                      grey, the footer's lookup button spins and says Looking
     lookup failed    logoError present — the reason in Yellow/600
     from-website /   a logo exists — the source named as the title, and a red
     Uploaded         trash Remove beside the input

   The blue Save exists only while there is something unsaved to commit
   (focused or edited), exactly as the set draws it; Enter still commits.

   WHY THERE IS NO "PICK A SOURCE" DROPDOWN. At the moment of choosing the
   admin cannot know the answer — whether the site has a decent
   apple-touch-icon, whether the brand runs Performance Max. So the chain runs
   automatically and the result is shown WITH ITS SOURCE NAMED. */

const t = config.copy.logo;

/* The frame caps the field at 250. Focus wears the input's own active state
   (node 305:12049): 1px Blue/500 with the SPREAD halo — shadow-input-active,
   not the selector's drop. Height pinned so the 0.7 -> 1px border change
   cannot resize the box (the inside-stroke rule). */
const FIELD =
  "h-field w-full max-w-60 rounded-8 border-fig border-border bg-surface-primary px-2 font-geist text-fig-caption-1 text-heading-03 md:text-fig-caption-1 shadow-field outline-none placeholder:text-caption-1 focus-visible:border focus-visible:border-blue-500 focus-visible:shadow-input-active focus-visible:ring-0";

export function LogoControl({
  clientId,
  clientName,
  logoUrl,
  logoSource,
  logoError,
  domain,
}: {
  clientId: string;
  clientName: string;
  logoUrl?: string;
  logoSource?: "upload" | "google-ads" | "website";
  logoError?: string;
  domain?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [site, setSite] = useState(domain ?? "");
  const [inputFocused, setInputFocused] = useState(false);
  /* Which action is in flight, so only ITS control changes: Save goes grey
     while saving, the lookup button spins while looking. */
  const [busy, setBusy] = useState<"save" | "lookup" | "upload" | null>(null);
  const hasDomain = Boolean(domain);
  const dirty = site.trim() !== (domain ?? "");
  // The frame's Input selected / Input filled states: Save exists only while
  // there is something to commit.
  const showSave = inputFocused || dirty;

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    done: string,
    kind: "save" | "lookup" | "upload" = "lookup",
  ) {
    setError(null);
    setBusy(kind);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          setError(result.error ?? "That didn't work.");
          return;
        }
        toast(done);
        router.refresh();
      } finally {
        setBusy(null);
      }
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // so picking the same file twice still fires
    if (!picked) return;
    if (picked.size > 2 * 1024 * 1024) {
      setError(t.tooBig);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      run(
        () =>
          uploadLogoAction({ clientId, dataUrl: String(reader.result) }),
        t.uploaded,
      );
    reader.onerror = () => setError(t.unreadable);
    reader.readAsDataURL(picked);
  }

  function commitDomain() {
    if (!dirty) return;
    run(() => setDomainAction({ clientId, domain: site }), t.domainSaved, "save");
  }

  return (
    <>
      <ProfileWell className="flex flex-col gap-2 px-2 py-3">
      <div className="flex items-center gap-2">
        <ClientAvatar name={clientName} logo={logoUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-geist text-fig-caption-1 text-heading-01">
            {logoUrl ? t.source[logoSource ?? "website"] : t.none}
          </span>
          {/* Why the automatic lookup came back empty. "No logo" on its own
              leaves the admin guessing whether it is broken or just absent. */}
          {!logoUrl && logoError && (
            <span className="font-geist text-fig-caption-1 text-yellow-600">
              {logoError}
            </span>
          )}
          {!logoUrl && !logoError && !hasDomain && (
            <span className="font-geist text-fig-caption-1 text-heading-06">
              {t.noDomain}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="font-geist text-fig-caption-2 text-destructive">
          {error}
        </p>
      )}

      {/* The website lives here because it is the only thing that uses it, and
          because without it a client added without a domain could never have a
          logo looked up at all. */}
      <div className="flex items-end gap-0.5">
        <label className="flex w-full max-w-60 flex-col gap-1">
          <span className="font-geist text-fig-caption-2 text-heading-06">
            {t.domainLabel}
          </span>
          <Input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDomain();
            }}
            placeholder="www.northbrook.com"
            className={FIELD}
          />
        </label>
        {showSave && (
          <Button
            size="fig"
            variant="secondary"
            /* onMouseDown, or the input's blur removes this button before the
               click lands on it. */
            onMouseDown={(e) => {
              e.preventDefault();
              commitDomain();
            }}
            /* Blue whenever visible — the set's Input-selected Save is blue
               even over the placeholder. Grey belongs to Save CLICKED, which
               is the pending state below; committing nothing is a no-op. */
            disabled={pending}
          >
            {busy === "save" ? config.copy.daily.working : config.copy.actions.save}
          </Button>
        )}
        {logoUrl && !showSave && (
          /* The set puts Remove HERE, beside the field, once a logo exists —
             a red ghost with the trash, not a footer action. */
          <Button
            size="fig"
            variant="ghost"
            className="gap-1 text-red-600 hover:text-red-600"
            onClick={() => run(() => clearLogoAction(clientId), t.cleared, "lookup")}
            disabled={pending}
          >
            <TrashGlyph className="shrink-0" />
            {t.clear}
          </Button>
        )}
      </div>
      </ProfileWell>

      <ProfileFooter>
        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          onChange={onPick}
          className="hidden"
        />
        <Button
          size="fig"
          variant="outline"
          className="flex-1 bg-surface-primary"
          onClick={() => file.current?.click()}
          disabled={pending}
        >
          {t.upload}
        </Button>
        <Button
          size="fig"
          variant="muted"
          className="flex-1 gap-1"
          onClick={() => run(() => refetchLogoAction(clientId), t.refetched)}
          disabled={pending || !hasDomain}
          title={hasDomain ? undefined : t.noDomain}
        >
          {busy === "lookup" ? (
            <>
              {/* The set's Save-clicked state: the spinner IS the feedback,
                  so it spins — the asset is a still arc, the motion is ours. */}
              <SpinnerGlyph className="shrink-0 animate-spin text-icon-explainer" />
              {t.working}
            </>
          ) : (
            t.refetch
          )}
        </Button>
      </ProfileFooter>
    </>
  );
}
