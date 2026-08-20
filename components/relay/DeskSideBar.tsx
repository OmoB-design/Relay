"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ChatDotGlyph,
  GroupChevronGlyph,
  SearchChatGlyph,
} from "@/components/relay/NavIcons";

/* The desk's chat panel — Figma set 639:17444, the 300px half of "Desk nav"
   (the other half is the app rail, which AppNav already is at 55).

   THE SLIDE-IN IS A WIDTH RIDE, NOT AN OVERLAY. The panel opens by growing
   from 0 to 300 while the rail folds 230 → 55 on the same curve — the sheet's
   left edge moves once, smoothly, instead of twice. Inside, the furniture
   cascades: search, the new-chat button, the client group and each chat row
   arrive on a small stagger so the panel reads as furnishing itself rather
   than sliding in as a poster.

   Rows fade out at their right edge the way the frame does — a gradient wash
   over the text instead of an ellipsis, in each row's own background. */

export type DeskChat = {
  id: string;
  title: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function DeskSideBar({
  clientName,
  chats,
  activeChatId,
  slideMs,
  staggerMs,
  itemMs,
  onSelectChat,
  onNewChat,
}: {
  clientName: string;
  chats: DeskChat[];
  activeChatId: string | null;
  /** The width ride's duration — the page hands the same number to the nav
   *  rail so both edges move as one. */
  slideMs: number;
  staggerMs: number;
  itemMs: number;
  onSelectChat: (id: string | null) => void;
  onNewChat: () => void;
}) {
  const [groupOpen, setGroupOpen] = useState(true);

  /* The cascade belongs to the panel's ARRIVAL. Rows that join later — a new
   *  chat after an ask — enter plainly, without replaying the furnishing. */
  const furnished = useRef(false);
  useEffect(() => {
    const t = setTimeout(
      () => {
        furnished.current = true;
      },
      slideMs + 8 * staggerMs + itemMs,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = (i: number) => ({
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    transition: {
      type: "tween" as const,
      duration: itemMs / 1000,
      ease: EASE,
      delay: furnished.current
        ? 0
        : (slideMs * 0.4 + i * staggerMs) / 1000,
    },
  });

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: "var(--spacing-desk-panel)" }}
      exit={{ width: 0 }}
      transition={{ type: "tween", duration: slideMs / 1000, ease: EASE }}
      className="hidden h-full shrink-0 overflow-hidden bg-surface-dashboard md:block"
    >
      <div className="flex h-full w-desk-panel flex-col">
        {/* Search + Start new chat (639:17192): pt-20 pb-10 px-8, gap 8. */}
        <div className="flex w-full flex-col gap-2 px-2 pb-2.5 pt-5">
          {/* Search is drawn but not wired yet — it neither lies to a
              screen reader nor takes focus it can't honour. */}
          <motion.button
            {...item(0)}
            type="button"
            disabled
            aria-disabled
            title="Search — coming soon"
            className="flex h-8.5 w-full cursor-default items-center gap-1.5 overflow-clip rounded-10 bg-surface-foreground-02 px-2 py-2.5 shadow-side-control"
          >
            <SearchChatGlyph className="size-3.5 text-icon-explainer" />
            <span className="font-geist text-fig-caption-1-md fig-medium text-heading-05">
              Search Chat
            </span>
          </motion.button>
          <motion.button
            {...item(1)}
            type="button"
            onClick={onNewChat}
            className="flex h-desk-pill w-full items-center justify-center gap-1.5 overflow-clip rounded-10 border-fig border-border bg-primary bg-clip-padding p-2 shadow-side-control"
          >
            <span className="font-geist text-fig-caption-1 text-white">
              Start new chat
            </span>
          </motion.button>
        </div>

        {/* The chats (639:17204): a hairline over px-8 py-16, rows 2 apart. */}
        <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto divider-t border-border px-2 py-4">
          <motion.button
            {...item(2)}
            type="button"
            onClick={() => setGroupOpen((was) => !was)}
            aria-expanded={groupOpen}
            className="flex h-desk-pill w-full shrink-0 items-center gap-1.5 rounded-8 px-2 shadow-chat-group"
          >
            <span className="font-geist text-fig-caption-1 text-heading-06">
              {clientName}
            </span>
            <GroupChevronGlyph
              className={cn(
                "size-2 text-icon-explainer transition-transform duration-200 ease-out",
                groupOpen && "rotate-90",
              )}
            />
          </motion.button>
          <AnimatePresence initial={false}>
            {groupOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "tween", duration: 0.24, ease: EASE }}
                className="flex w-full flex-col gap-0.5 overflow-hidden"
              >
                {chats.map((chat, i) => {
                  const active = chat.id === activeChatId;
                  return (
                    <motion.button
                      {...item(3 + i)}
                      key={chat.id}
                      type="button"
                      onClick={() => onSelectChat(active ? null : chat.id)}
                      className={cn(
                        "flex h-8.5 w-full shrink-0 items-center gap-1.5 rounded-10 py-2 pl-2 pr-1",
                        active && "bg-surface-foreground-03",
                      )}
                    >
                      <ChatDotGlyph className="size-1.25 shrink-0 text-grey-300" />
                      <span className="relative min-w-0 flex-1 overflow-hidden">
                        <span
                          className={cn(
                            "block whitespace-nowrap text-left font-geist text-fig-caption-1-md fig-w420",
                            active ? "text-heading-03" : "text-heading-05",
                          )}
                        >
                          {chat.title}
                        </span>
                        {/* The frame's right-edge wash (639:17216) — the text
                            runs out under a fade in the row's own colour. */}
                        <span
                          aria-hidden
                          className={cn(
                            "pointer-events-none absolute inset-y-0 right-0 w-8",
                            active ? "chat-fade-active" : "chat-fade",
                          )}
                        />
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
