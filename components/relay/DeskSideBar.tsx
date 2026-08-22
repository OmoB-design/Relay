"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ChatOptionsMenu,
  CHAT_MENU_H,
  CHAT_MENU_W,
} from "@/components/relay/ChatOptionsMenu";
import {
  ChatDotGlyph,
  ChatOptionsGlyph,
  SearchChatGlyph,
  SectionCaretGlyph,
  TipDismissGlyph,
} from "@/components/relay/NavIcons";

/* The desk's chat panel — the 300px half of "Desk nav" (the other half is the
   app rail, which AppNav already is at 55).

   THE LIST IS FLAT: chats are universal, no client owns them, so the rail is
   one recency-ordered column of conversations — one row per chat, titled by
   its first question, exactly one carrying the active fill. Start new chat is
   the only thread boundary. The row styling is the Figma set's own (dot,
   right-edge wash, 420 weight); only the client grouping is gone.

   THE SLIDE-IN IS A WIDTH RIDE, NOT AN OVERLAY. The panel opens by growing
   from 0 to 300 while the rail folds 230 → 55 on the same curve — the sheet's
   left edge moves once, smoothly, instead of twice. Inside, the furniture
   cascades on a small stagger, once, on arrival; rows that join later enter
   plainly. */

export type DeskChatRow = {
  id: string;
  title: string;
  /** Set = the row lives in the Pinned section (736:11148). */
  pinnedAt?: string;
  /** True = the row's dot burns blue until the chat is opened. */
  unread?: boolean;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function DeskSideBar({
  chats,
  activeChatId,
  arrive = true,
  slideMs,
  staggerMs,
  itemMs,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onTogglePin,
  onToggleUnread,
}: {
  /** Newest first — the caller keeps recency order. */
  chats: DeskChatRow[];
  activeChatId: string | null;
  /** False when the panel is standing at page load — no width ride, no
   *  cascade; the arrival theater belongs to the first-run slide-in only. */
  arrive?: boolean;
  /** The width ride's duration — the page hands the same number to the nav
   *  rail so both edges move as one. */
  slideMs: number;
  staggerMs: number;
  itemMs: number;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onTogglePin: (chatId: string) => void;
  onToggleUnread: (chatId: string) => void;
}) {
  /* Search filters the flat list live, the way Claude's sidebar does: type,
     the rail narrows to matches; Escape (or emptying and leaving) hands the
     pill back. */
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  /* Which row's option menu stands, and where — viewport coordinates from
     the kebab's own rect, so the list's scroll clip can't cut it. */
  const [menu, setMenu] = useState<{
    chatId: string;
    at: { x: number; y: number };
  } | null>(null);
  const q = query.trim().toLowerCase();
  const shown = q
    ? chats.filter((c) => c.title.toLowerCase().includes(q))
    : chats;

  /* One pin and the rail grows its sections (736:11148's Pinned variant);
     none, and it stays the flat list it always was. Each section folds —
     the header remembers its state across visits. */
  const pinnedRows = shown.filter((c) => c.pinnedAt);
  const chatRows = shown.filter((c) => !c.pinnedAt);
  const sectioned = pinnedRows.length > 0;
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [chatsOpen, setChatsOpen] = useState(true);
  useEffect(() => {
    setPinnedOpen(localStorage.getItem("desk-rail-pinned") !== "closed");
    setChatsOpen(localStorage.getItem("desk-rail-chats") !== "closed");
  }, []);
  const fold = (
    key: string,
    open: boolean,
    set: (v: boolean) => void,
  ) => {
    set(!open);
    localStorage.setItem(key, open ? "closed" : "open");
  };

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  /* The cascade belongs to the panel's ARRIVAL. Rows that join later — a new
   * chat after an ask — enter plainly, without replaying the furnishing.
   * A panel standing at page load was never arriving at all. */
  const furnished = useRef(!arrive);
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

  return (
    <motion.div
      initial={arrive ? { width: 0 } : false}
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

        {/* The chats: a hairline, then the flat column — the whole list
            scrolls as one, a wash at the clipped edge saying "more". */}
        <ListRows count={shown.length} framed={!sectioned}>
          {(sectioned
            ? [
                { label: "Pinned", key: "desk-rail-pinned", open: pinnedOpen, set: setPinnedOpen, rows: pinnedRows, base: 0 },
                { label: "Chats", key: "desk-rail-chats", open: chatsOpen, set: setChatsOpen, rows: chatRows, base: pinnedRows.length },
              ]
            : [{ label: null, key: "", open: true, set: () => {}, rows: shown, base: 0 }]
          ).map((section) => {
            const rows = section.rows.map((chat, offset) => {
            const i = section.base + offset;
            const active = chat.id === activeChatId;
            return (
              /* The 732:10950 row set: rest is bare, hover and active BOTH
                 wear the surface-row fill (the active one holds it), the
                 label steps from heading-05 to full ink only when the chat
                 is the open one. A group wrapper, not one button — the
                 kebab is its own control and buttons don't nest. */
              <motion.div
                {...item(2 + i)}
                key={chat.id}
                className="group relative w-full shrink-0"
              >
                <button
                  type="button"
                  onClick={() => onSelectChat(chat.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex h-8 w-full items-center gap-3 rounded-10 py-1.5 pl-2 pr-1 transition-colors duration-150 ease-out",
                    active
                      ? "bg-surface-row"
                      : "group-hover:bg-surface-row",
                  )}
                >
                  {/* The dot is the unread signal: quiet outline normally,
                      a solid blue-500 burn while the chat waits. */}
                  {chat.unread ? (
                    <span className="size-1.25 shrink-0 rounded-full bg-blue-500" />
                  ) : (
                    <ChatDotGlyph className="size-1.25 shrink-0 text-grey-300" />
                  )}
                  <span className="relative min-w-0 flex-1 overflow-hidden">
                    <span
                      className={cn(
                        "block whitespace-nowrap text-left font-geist text-fig-rail fig-w420",
                        active ? "text-heading-01" : "text-heading-05",
                      )}
                    >
                      {chat.title}
                    </span>
                    {/* The right-edge wash — the text runs out under a fade
                        in the row's own colour, hover included. */}
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-y-0 right-0 w-8",
                        active
                          ? "chat-fade-active"
                          : "chat-fade group-hover:chat-fade-active",
                      )}
                    />
                  </span>
                </button>
                {/* The option kebab (732:10833): lives at the row's right
                    edge, arrives with the row's hover, wears its own wash
                    when the pointer reaches it — and opens the 736:11147
                    menu, right-aligned to itself, flipped up when the
                    viewport floor is close. */}
                <button
                  type="button"
                  aria-label="Chat options"
                  aria-haspopup="menu"
                  aria-expanded={menu?.chatId === chat.id || undefined}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const below = r.bottom + 6;
                    setMenu(
                      menu?.chatId === chat.id
                        ? null
                        : {
                            chatId: chat.id,
                            at: {
                              x: Math.max(8, r.right - CHAT_MENU_W),
                              y:
                                below + CHAT_MENU_H > window.innerHeight - 8
                                  ? r.top - CHAT_MENU_H - 6
                                  : below,
                            },
                          },
                    );
                  }}
                  style={{ borderRadius: 2.2857 }}
                  className={cn(
                    "absolute right-1 top-2 flex size-4 items-center justify-center overflow-clip bg-surface-foreground-01 text-icon-explainer opacity-0 transition-[opacity,background-color] duration-150 ease-out hover:bg-grey-250/50 focus-visible:opacity-100 group-hover:opacity-100",
                    menu?.chatId === chat.id &&
                      "bg-grey-250/50 opacity-100",
                  )}
                >
                  <ChatOptionsGlyph />
                </button>
              </motion.div>
            );
            });
            return section.label === null ? (
              rows
            ) : (
              <RailSection
                key={section.label}
                label={section.label}
                open={section.open}
                onToggle={() => fold(section.key, section.open, section.set)}
              >
                {rows}
              </RailSection>
            );
          })}
        </ListRows>

        <ChatOptionsMenu
          at={menu?.at ?? null}
          pinned={Boolean(
            menu && chats.find((c) => c.id === menu.chatId)?.pinnedAt,
          )}
          unread={Boolean(
            menu && chats.find((c) => c.id === menu.chatId)?.unread,
          )}
          onClose={() => setMenu(null)}
          onPin={() => {
            if (menu) onTogglePin(menu.chatId);
            setMenu(null);
          }}
          onUnread={() => {
            if (menu) onToggleUnread(menu.chatId);
            setMenu(null);
          }}
          onDelete={() => {
            if (menu) onDeleteChat(menu.chatId);
            setMenu(null);
          }}
        />
      </div>
    </motion.div>
  );
}

/** The flat list fills the panel and scrolls as one — while there is more
 *  below the clip, a wash at the bottom edge says so. */
/** A foldable stretch of the rail (738:11474): the quiet 12px nameplate on
 *  its own hairline. Open at rest hides the caret — hovering reveals it
 *  pointing down; a closed section keeps it out, pointing on, and darkens
 *  its label to heading-04. The fold itself rides the house curve. */
function RailSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-0.5 divider-t border-border px-2 pb-4 pt-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group/sec flex h-8 w-full shrink-0 items-center gap-1.5 rounded-8 px-1"
      >
        {/* Revised in the frame (2026-08-22): the nameplate reads at 13/390
            now — the rail's own body size at its lightest weight. */}
        <span
          className={cn(
            "font-geist text-fig-body fig-w390 transition-colors duration-150 ease-out group-hover/sec:text-heading-02",
            open ? "text-heading-05" : "text-heading-04",
          )}
        >
          {label}
        </span>
        <SectionCaretGlyph
          className={cn(
            "shrink-0 text-heading-05 transition-opacity duration-150 ease-out",
            open && "rotate-90 opacity-0 group-hover/sec:opacity-100",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2, ease: EASE }}
            className="flex w-full flex-col gap-0.5 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ListRows({
  count,
  framed = true,
  children,
}: {
  count: number;
  /** False when sections carry their own hairlines and padding. */
  framed?: boolean;
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
    <div className="relative min-h-0 w-full flex-1">
      <div
        ref={ref}
        onScroll={measure}
        className={cn(
          "flex h-full w-full flex-col gap-0.5 overflow-y-auto",
          framed && "divider-t border-border px-2 py-4",
        )}
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
