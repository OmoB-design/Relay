"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ChatDotGlyph,
  GroupChevronGlyph,
  SearchChatGlyph,
  TipDismissGlyph,
} from "@/components/relay/NavIcons";

/* The desk's chat panel — Figma set 639:17444, both variants: the 300px half
   of "Desk nav" (the other half is the app rail, which AppNav already is at
   55).

   EVERY CLIENT WITH HISTORY GETS ITS OWN GROUP, per the two-client variant:
   a collapsible header and that client's questions under it, newest first,
   the question text as the row's preview. A group shows EIGHT rows before its
   own frame scrolls — the cap is the group's, not the panel's, so one
   talkative client never buries another.

   THE SLIDE-IN IS A WIDTH RIDE, NOT AN OVERLAY. The panel opens by growing
   from 0 to 300 while the rail folds 230 → 55 on the same curve — the sheet's
   left edge moves once, smoothly, instead of twice. Inside, the furniture
   cascades on a small stagger, once, on arrival; rows that join later enter
   plainly.

   Rows fade out at their right edge the way the frame does — a gradient wash
   over the text instead of an ellipsis, in each row's own background. */

export type DeskChat = {
  id: string;
  title: string;
};

export type DeskChatGroup = {
  clientId: string;
  clientName: string;
  chats: DeskChat[];
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function DeskSideBar({
  groups,
  activeClientId,
  activeChatId,
  slideMs,
  staggerMs,
  itemMs,
  onSelectChat,
  onNewChat,
}: {
  groups: DeskChatGroup[];
  activeClientId: string | null;
  activeChatId: string | null;
  /** The width ride's duration — the page hands the same number to the nav
   *  rail so both edges move as one. */
  slideMs: number;
  staggerMs: number;
  itemMs: number;
  onSelectChat: (clientId: string, chatId: string | null) => void;
  onNewChat: () => void;
}) {
  /* The active client's group opens; the others rest folded until asked. */
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    activeClientId ? { [activeClientId]: true } : {},
  );
  useEffect(() => {
    if (activeClientId)
      setOpen((was) => ({ ...was, [activeClientId]: true }));
  }, [activeClientId]);

  /* Search filters every client's questions live, the way Claude's sidebar
     does: type, the rail narrows to matches, matched groups hold open;
     Escape (or emptying and leaving) hands the pill back. */
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? groups
        .map((g) => ({
          ...g,
          chats: g.chats.filter((c) => c.title.toLowerCase().includes(q)),
        }))
        .filter((g) => g.chats.length > 0)
    : groups;

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  /* The cascade belongs to the panel's ARRIVAL. Rows that join later — a new
   * chat after an ask — enter plainly, without replaying the furnishing. */
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
        : (slideMs * 0.4 + Math.min(i, 10) * staggerMs) / 1000,
    },
  });

  let cascade = 2;

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
          {searching ? (
            <div className="flex h-8.5 w-full items-center gap-1.5 overflow-clip rounded-10 bg-surface-foreground-02 px-2 py-2.5 shadow-side-control">
              <SearchChatGlyph className="size-3.5 shrink-0 text-icon-explainer" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeSearch();
                }}
                onBlur={() => {
                  if (!query.trim()) closeSearch();
                }}
                placeholder="Search Chat"
                aria-label="Search chats"
                className="min-w-0 flex-1 bg-transparent font-geist text-fig-caption-1-md fig-medium text-heading-03 outline-none placeholder:text-heading-05"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={closeSearch}
                  className="shrink-0 text-icon-explainer transition-colors duration-150 ease-out hover:text-heading-01"
                >
                  <TipDismissGlyph className="size-3" />
                </button>
              )}
            </div>
          ) : (
            <motion.button
              {...item(0)}
              type="button"
              onClick={() => setSearching(true)}
              className="flex h-8.5 w-full items-center gap-1.5 overflow-clip rounded-10 bg-surface-foreground-02 px-2 py-2.5 shadow-side-control"
            >
              <SearchChatGlyph className="size-3.5 text-icon-explainer" />
              <span className="font-geist text-fig-caption-1-md fig-medium text-heading-05">
                Search Chat
              </span>
            </motion.button>
          )}
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

        {/* The chats (639:17204): a hairline over px-8 py-16, one collapsible
            group per client with history — hairlines between neighbours. */}
        <div className="flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto divider-t border-border px-2 py-4">
          {shown.map((group, gi) => {
            /* While a search is live, every matched group holds open. */
            const groupOpen = q ? true : (open[group.clientId] ?? false);
            const headerIndex = cascade++;
            return (
              <div
                key={group.clientId}
                className={cn(
                  "flex w-full shrink-0 flex-col gap-0.5",
                  gi > 0 && "mt-1.5 divider-t border-border pt-1.5",
                )}
              >
                <motion.button
                  {...item(headerIndex)}
                  type="button"
                  onClick={() =>
                    setOpen((was) => ({
                      ...was,
                      [group.clientId]: !groupOpen,
                    }))
                  }
                  aria-expanded={groupOpen}
                  className="flex h-desk-pill w-full shrink-0 items-center gap-1.5 rounded-8 px-2 shadow-chat-group"
                >
                  <span className="font-geist text-fig-caption-1 text-heading-06">
                    {group.clientName}
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
                      transition={{
                        type: "tween",
                        duration: 0.24,
                        ease: EASE,
                      }}
                      className="w-full overflow-hidden"
                    >
                      <GroupRows count={group.chats.length}>
                        {group.chats.map((chat) => {
                          const active =
                            chat.id === activeChatId &&
                            group.clientId === activeClientId;
                          const rowIndex = cascade++;
                          return (
                            <motion.button
                              {...item(rowIndex)}
                              key={chat.id}
                              type="button"
                              onClick={() =>
                                onSelectChat(
                                  group.clientId,
                                  active ? null : chat.id,
                                )
                              }
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
                                    active
                                      ? "text-heading-03"
                                      : "text-heading-05",
                                  )}
                                >
                                  {chat.title}
                                </span>
                                {/* The frame's right-edge wash (639:17216) —
                                    the text runs out under a fade in the
                                    row's own colour. */}
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
                      </GroupRows>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/** Eight rows, then the group's own frame scrolls — and while there is more
 *  below the clip, a wash at the bottom edge says so. */
function GroupRows({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  };

  useEffect(measure, [count]);

  return (
    <div className="relative w-full">
      <div
        ref={ref}
        onScroll={measure}
        className="flex max-h-chat-cap w-full flex-col gap-0.5 overflow-y-auto"
      >
        {children}
      </div>
      <AnimatePresence>
        {more && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7 chat-scroll-fade"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
