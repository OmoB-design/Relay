"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  clearLogoAction,
  refetchLogoAction,
  setDomainAction,
  uploadLogoAction,
} from "@/app/(app)/admin/clients/logo-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientAvatar } from "@/components/relay/ClientAvatar";

/* The per-client logo control.
   PROVISIONAL DESIGN — no Figma for the admin side.

   WHY THERE IS NO "PICK A SOURCE" DROPDOWN. The obvious design is to make the
   admin choose where the logo comes from. But at the moment of choosing they
   cannot know the answer: whether this brand runs Performance Max, whether
   their site has a decent apple-touch-icon or a 16px favicon from 2014. So the
   chain runs automatically, the result is shown WITH ITS SOURCE NAMED, and the
   controls appear here — after there is something to judge. Control where it is
   useful, rather than as a question nobody can answer yet. */

const t = config.copy.logo;

const FIELD =
  "h-auto w-56 rounded-8 border-fig border-border bg-surface-primary px-2 py-1.5 font-geist text-fig-caption-1 text-heading-01 md:text-fig-caption-1 shadow-field";

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
  const hasDomain = Boolean(domain);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error ?? "That didn't work.");
        return;
      }
      toast(done);
      router.refresh();
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

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <ClientAvatar name={clientName} logo={logoUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-geist text-fig-caption-1 text-heading-01">
            {logoUrl ? t.source[logoSource ?? "website"] : t.none}
          </span>
          {/* Why the automatic lookup came back empty. "No logo" on its own
              leaves the admin guessing whether it is broken or just absent. */}
          {!logoUrl && logoError && (
            <span className="font-geist text-fig-caption-2 text-yellow-700">
              {logoError}
            </span>
          )}
          {!logoUrl && !logoError && !hasDomain && (
            <span className="font-geist text-fig-caption-2 text-caption-1">
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
      <label className="flex flex-col gap-1.5">
        <span className="font-geist text-fig-caption-2 text-caption-1">
          {t.domainLabel}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="northbrook.com"
            className={FIELD}
          />
          {site.trim() !== (domain ?? "") && (
            <Button
              size="fig"
              variant="secondary"
              onClick={() =>
                run(
                  () => setDomainAction({ clientId, domain: site }),
                  t.domainSaved,
                )
              }
              disabled={pending}
            >
              {config.copy.actions.save}
            </Button>
          )}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
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
          onClick={() => file.current?.click()}
          disabled={pending}
        >
          {t.upload}
        </Button>
        <Button
          size="fig"
          variant="ghost"
          onClick={() => run(() => refetchLogoAction(clientId), t.refetched)}
          disabled={pending || !hasDomain}
          title={hasDomain ? undefined : t.noDomain}
        >
          {pending ? t.working : t.refetch}
        </Button>
        {logoUrl && (
          <Button
            size="fig"
            variant="ghost"
            onClick={() => run(() => clearLogoAction(clientId), t.cleared)}
            disabled={pending}
          >
            {t.clear}
          </Button>
        )}
      </div>

      <p className={cn("font-geist text-fig-caption-2 text-caption-1")}>
        {t.explainer}
      </p>
    </div>
  );
}
