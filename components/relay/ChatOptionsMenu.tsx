"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

/* The rail row's option menu — Figma 736:11147, all three variants.

   A 171px popover in the house language (shadow-popover IS this node's
   shadow, byte for byte): Pin, Mark as unread, then Delete below the only
   hairline, each row carrying its shortcut letter at the far edge — and
   the letters are real: P, U and D fire while the menu is open. Rows wash
   in foreground-01 under the pointer; Delete goes FULL red-500 with white
   ink (the Delete variant) — destruction should look like nothing else.

   Fixed-positioned from the kebab's rect, so the rail's scroll clip never
   cuts it; flipped above the kebab when the viewport floor is close. */

export const CHAT_MENU_W = 171;
export const CHAT_MENU_H = 86; // the node's own height, for the flip test

type Item = {
  key: string;
  label: string;
  hint: string;
  glyph: React.ReactNode;
  onPick: () => void;
};

function PinGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.05413 9.94635L4.2728 7.72768" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6.91408 10.3686C7.20208 9.99725 7.59408 9.38858 7.81275 8.55658C7.92542 8.12858 7.96608 7.74058 7.97475 7.42258L9.97808 5.41925C10.4988 4.89858 10.4988 4.05458 9.97808 3.53392L8.46608 2.02192C7.94542 1.50125 7.10142 1.50125 6.58075 2.02192L4.57742 4.02525C4.25875 4.03392 3.87142 4.07458 3.44342 4.18725C2.61142 4.40592 2.00275 4.79792 1.63142 5.08592L6.91475 10.3693L6.91408 10.3686Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UnreadGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1.16685 6.00037C1.16685 6.00037 2.34752 2.33371 6.00019 2.33371C9.65285 2.33371 10.8335 6.00037 10.8335 6.00037" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.33343 10.6668L10.6668 1.33343" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.29667 4.7039C6.58057 3.98784 5.41997 3.98784 4.7039 4.7039C3.98784 5.41997 3.98784 6.58057 4.7039 7.29663C5.41997 8.0127 6.58057 8.0127 7.29667 7.29663" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M1.83315 3.16657H10.1665" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 3.16685V1.83352C4.5 1.46685 4.79867 1.16685 5.16667 1.16685H6.83333C7.20133 1.16685 7.5 1.46685 7.5 1.83352V3.16685" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.91685 5.83343L5.06165 8.83343" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.08314 5.83343L6.93834 8.83343" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.13191 5.16629L8.90011 9.56629C8.86277 10.2797 8.27744 10.833 7.56877 10.833H4.43213C3.7228 10.833 3.13813 10.2796 3.10079 9.56629L2.869 5.16629" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChatOptionsMenu({
  at,
  pinned = false,
  unread = false,
  onClose,
  onPin,
  onUnread,
  onDelete,
}: {
  /** Where to stand, viewport coordinates — null keeps the menu closed. */
  at: { x: number; y: number } | null;
  /** The node draws "Pin"; a pinned chat's row must offer the way back. */
  pinned?: boolean;
  /** Same law for the unread mark: the label always names the way out. */
  unread?: boolean;
  onClose: () => void;
  onPin: () => void;
  onUnread: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* Escape closes; the drawn shortcut letters fire their rows. Click-away
     closes without swallowing the click (the AccountCard's manners). */
  useEffect(() => {
    if (!at) return;
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "Escape") return onClose();
      const pick =
        k === "p" ? onPin : k === "u" ? onUnread : k === "d" ? onDelete : null;
      if (pick) {
        e.preventDefault();
        pick();
      }
    };
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", keys);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", keys);
      document.removeEventListener("pointerdown", away);
    };
  }, [at, onClose, onPin, onUnread, onDelete]);

  const items: Item[] = [
    {
      key: "P",
      label: pinned ? "Unpin" : "Pin",
      hint: "P",
      glyph: <PinGlyph />,
      onPick: onPin,
    },
    {
      key: "U",
      label: unread ? "Mark as read" : "Mark as unread",
      hint: "U",
      glyph: <UnreadGlyph />,
      onPick: onUnread,
    },
  ];

  return (
    <AnimatePresence>
      {at && (
        <motion.div
          ref={ref}
          role="menu"
          initial={{ opacity: 0, scale: 0.98, y: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ type: "tween", duration: 0.14, ease: "easeOut" }}
          style={{ left: at.x, top: at.y, width: CHAT_MENU_W }}
          className="fixed z-50 flex flex-col rounded-12 border-fig border-border bg-surface-primary p-1 shadow-popover"
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={it.onPick}
              className="flex w-full items-center gap-1.5 rounded-8 px-1.5 py-1 text-heading-05 transition-colors duration-150 ease-out hover:bg-surface-foreground-01"
            >
              {it.glyph}
              <span className="min-w-0 flex-1 text-left font-geist text-fig-caption-1 text-heading-02">
                {it.label}
              </span>
              <span className="font-geist text-fig-caption-2 text-heading-06">
                {it.hint}
              </span>
            </button>
          ))}
          {/* Destruction below the only hairline, and it looks like nothing
              else: the row floods red-500, every glyph goes white. */}
          <div className="mt-0 w-full divider-t border-border pt-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={onDelete}
              className="group/del flex w-full items-center gap-1.5 rounded-8 px-1.5 py-1 text-red-600 transition-colors duration-150 ease-out hover:bg-red-500 hover:text-white"
            >
              <TrashGlyph />
              <span className="min-w-0 flex-1 text-left font-geist text-fig-caption-1">
                Delete
              </span>
              <span className="font-geist text-fig-caption-2 text-heading-06 group-hover/del:text-white">
                D
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
