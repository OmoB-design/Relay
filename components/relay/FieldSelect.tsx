"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import {
  CheckGlyph,
  ClockGlyph,
  SelectChevronGlyph,
} from "@/components/relay/NavIcons";

/* The Cadence & Channel dropdowns — Figma nodes 432:8169 (cadence), 432:8590
   (channel), 432:8614 (send day), 432:8485 (time).

   All four frames draw ONE panel: white at radius 12 with the popover shadow,
   4px of inner padding, 2px between options; an option is rounded-10, 6px
   sides, 10px vertical, 12px Medium in Heading-02; the selected one takes the
   Foreground-01 wash and a 10px check. The panel opens 4px BELOW the field and
   at exactly the field's width — position and size both come from the field,
   which is why the panel is absolutely positioned inside the field's wrapper
   rather than portalled: the wrapper IS the measurement.

   Custom rather than native from here on — the frame draws the options, so
   the options are ours to draw. What is kept from the native control is the
   CONTRACT: real button semantics, listbox/option roles, arrow keys, Home/End,
   Enter, Escape, close-on-outside-click, focus returned to the trigger. */

const PANEL =
  "absolute inset-x-0 top-full z-20 mt-1 rounded-12 border-fig border-border bg-surface-primary p-1 shadow-popover";
const OPTION =
  "flex w-full items-center justify-between gap-1.5 rounded-10 px-1.5 py-2.5 text-left font-geist text-fig-caption-1-md fig-medium text-heading-02 outline-none hover:bg-surface-foreground-01 focus-visible:bg-surface-foreground-01";
const TRIGGER =
  "flex h-field w-full items-center justify-between gap-3 rounded-8 border-fig border-border bg-surface-primary py-1.5 pl-2 pr-2 font-geist text-fig-caption-1 text-heading-03 shadow-field outline-none focus-visible:border focus-visible:border-blue-500 focus-visible:shadow-field-active";
/* The Selectors component's Selected variant (node 429:7122): 1px Blue/500
   with the Blue/150 halo. Worn while the panel is OPEN, and by keyboard focus
   above, so the two ways of operating the field look the same. */
const TRIGGER_ACTIVE = "border border-blue-500 shadow-field-active";

/** Close on pointer-down outside `ref`, and on Escape. */
function useDismiss(
  open: boolean,
  ref: React.RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, close]);
}

/** Roving focus for a listbox: arrows move, Home/End jump, type nothing. */
function listNav(e: React.KeyboardEvent, list: HTMLElement | null) {
  if (!list) return;
  const options = Array.from(
    list.querySelectorAll<HTMLButtonElement>('[role="option"]'),
  );
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  const go = (i: number) => {
    e.preventDefault();
    options[Math.max(0, Math.min(options.length - 1, i))]?.focus();
  };
  if (e.key === "ArrowDown") go(index + 1);
  else if (e.key === "ArrowUp") go(index - 1);
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(options.length - 1);
}

export function FieldSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "field",
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
  /** "field" is the cadence card's 30px selector; "field-lg" the modal's 38px
   *  one (node 433:9405 draws the same control at px-8 py-10). The panel's
   *  options step down with it: 10px rows on the card, 8px in the modal. */
  size?: "field" | "field-lg";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);
  useDismiss(open, root, close);

  // Focus the selected option when the panel opens.
  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={root} className="relative w-full">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(TRIGGER, size === "field-lg" && "h-field-lg", open && TRIGGER_ACTIVE)}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <SelectChevronGlyph className="shrink-0 text-icon-explainer" />
      </button>

      {open && (
        <div
          ref={panel}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={PANEL}
          onKeyDown={(e) => listNav(e, panel.current)}
        >
          <div className="flex flex-col gap-0.5">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={cn(
                    OPTION,
                    size === "field-lg" && "py-2",
                    selected && "bg-surface-foreground-01",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {selected && (
                    <CheckGlyph className="shrink-0 text-heading-05" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Send time (node 432:8485) -------------------------------------------
   The same panel with a second column: times on the left, AM/PM on the right.
   The clock is HALF-HOURLY, the full 24 hours — 12:00 through 11:30 per
   meridiem — displayed 12-hour because that is how the frame writes it, and
   stored 24-hour ("HH:mm") because that is what anchorTime already is. The
   frame's option list carries some placeholder rows (month names); the
   half-hour clock is the design's intent and the product's rule. */

const MERIDIEMS = ["AM", "PM"] as const;
type Meridiem = (typeof MERIDIEMS)[number];

/** "12:00", "12:30", "01:00" … "11:30" — one meridiem's 24 half-hours. */
const HALF_HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const display = hour === 0 ? 12 : hour;
  return `${String(display).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
});

function to24h(display: string, meridiem: Meridiem): string {
  const [h, m] = display.split(":").map(Number);
  const base = h! % 12;
  return `${String(meridiem === "PM" ? base + 12 : base).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function from24h(value: string): { display: string; meridiem: Meridiem } {
  const [h, m] = value.split(":").map(Number);
  const hour = Number.isFinite(h) ? h! : 9;
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return {
    display: `${String(display).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`,
    meridiem: hour < 12 ? "AM" : "PM",
  };
}

export function FieldTimeSelect({
  value,
  onChange,
  ariaLabel,
}: {
  /** 24-hour "HH:mm" — the shape anchorTime is stored in. */
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);
  useDismiss(open, root, close);

  const { display, meridiem } = from24h(value);

  // The selected half-hour scrolls into view when the panel opens.
  useEffect(() => {
    if (!open) return;
    const selected = panel.current?.querySelector<HTMLButtonElement>(
      '[aria-selected="true"]',
    );
    selected?.scrollIntoView({ block: "nearest" });
    selected?.focus();
  }, [open]);

  return (
    <div ref={root} className="relative w-full">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(TRIGGER, open && TRIGGER_ACTIVE)}
      >
        <span className="truncate">
          {display} {meridiem}
        </span>
        <ClockGlyph className="shrink-0 text-icon-explainer" />
      </button>

      {open && (
        <div
          ref={panel}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(PANEL, "flex gap-2.5")}
          onKeyDown={(e) => listNav(e, panel.current)}
        >
          <div className="flex max-h-56 min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto">
            {HALF_HOURS.map((slot) => {
              const selected = slot === display;
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(to24h(slot, meridiem));
                    close();
                  }}
                  className={cn(OPTION, selected && "bg-surface-foreground-01")}
                >
                  <span>{slot}</span>
                  {selected && (
                    <CheckGlyph className="shrink-0 text-heading-05" />
                  )}
                </button>
              );
            })}
          </div>
          {/* AM/PM. Switching re-stamps the stored value immediately — the
              hour the reader picked stays, twelve hours away. */}
          <div className="flex shrink-0 flex-col gap-0.5">
            {MERIDIEMS.map((m) => {
              const active = m === meridiem;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${m === "AM" ? "Morning" : "Afternoon"} (${m})`}
                  onClick={() => onChange(to24h(display, m))}
                  className={cn(
                    "rounded-8 p-1.5 font-geist text-fig-caption-2 fig-medium",
                    active
                      ? "bg-blue-400 text-primary-foreground"
                      : "border-fig border-border bg-surface-primary text-heading-02",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
