"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import { useDialKit } from "dialkit";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type {
  ClientProfile,
  DeskChat,
  DeskChatMessage,
  Profile,
} from "@/lib/types";
import { AppNav } from "@/components/relay/AppNav";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { DeskChatbox } from "@/components/relay/DeskChatbox";
import { DeskDials } from "@/components/relay/DeskDials";
import { DeskSideBar } from "@/components/relay/DeskSideBar";
import {
  AgentReply,
  UserMessage,
  type AgentChunk,
} from "@/components/relay/DeskMessages";
import { RelayMark } from "@/components/relay/NavIcons";
import {
  askUniversalAction,
  getDeskChatMessagesAction,
} from "@/app/(desk)/answer-desk/actions";

/* The Answer Desk — both of its states and the ride between them.

   THE LANDING (612:7139) greets and asks for a client. Picking one IS the
   first message: the greeting lifts away, the chatbox rides from the centre
   to the bottom rail as ONE shared element, the "Let's talk about" pill lands
   top-right, the agent thinks and greets — and only once that first reply has
   fully arrived does the chrome move: the nav rail folds 230 → 55 while the
   chat panel (639:17444) unfurls 0 → 300 on the same curve, its furniture
   cascading in behind it. The reference video hard-cuts this moment; the desk
   actually rides it.

   THE CONVERSATION (619:14680) is a 620 transcript over a floating composer.
   Real questions go through the same engine as ever (askDeskQuestionAction);
   the reply follows the reference video's three acts — the dotmatrix shimmer
   alone at the reply slot, then text streaming above it while it stays
   alive, then the same glyph frozen still one line under the finished
   reply. No header, no label, no sparkles. Every move is on the dials.

   Scope stays mandatory: the landing chatbox nudges toward the picker, and
   the transcript is always one client's data. */

const ad = config.copy.answerDesk;

type DeskClient = Pick<
  ClientProfile,
  "id" | "name" | "descriptor" | "logoUrl"
>;

type DeskMessage =
  | {
      kind: "user";
      id: string;
      text: string;
      at: number;
      /** Attached screenshots — client-side object URLs for this session. */
      images?: string[];
      /** The scope pill and its greeting are theater, not engine output —
       *  they carry no retry/edit controls. */
      synthetic?: boolean;
    }
  | {
      kind: "agent";
      id: string;
      chunks: AgentChunk[];
      thinking: boolean;
      /** The stream has finished — the shimmer freezes in place. */
      done: boolean;
      at: number;
      synthetic?: boolean;
    };

type DialTransition =
  | { type: "spring"; [k: string]: unknown }
  | { type: "easing"; duration: number; ease: [number, number, number, number] };

function toMotion(t: DialTransition) {
  return t.type === "easing"
    ? { type: "tween" as const, duration: t.duration, ease: t.ease }
    : t;
}

let msgSeq = 0;
const nextId = () => `m${++msgSeq}`;

export function AnswerDesk({
  profile,
  isAdmin,
  newTeamJoins,
  greetName,
  clients,
  initialClientId,
  initialChats,
  initialOpenChatId,
  initialOpenMessages,
}: {
  profile: Profile;
  isAdmin: boolean;
  newTeamJoins: number;
  /** The buyer's first name — the landing greets a person, not a role. */
  greetName: string;
  clients: DeskClient[];
  initialClientId?: string;
  /** The rail's FLAT list — one row per conversation, newest first. */
  initialChats: DeskChat[];
  /** ?chat= reopens a conversation with its transcript preloaded. */
  initialOpenChatId: string | null;
  initialOpenMessages: DeskChatMessage[] | null;
}) {
  /* Every ride's tuning (dialkit). Defaults are the tuned values; production
     ships them as constants. */
  const dial = useDialKit(
    "Desk interactions",
    {
      exit: {
        // The greeting and picker leaving as the conversation takes the room.
        fadeMs: [220, 80, 600, 10],
        liftY: [12, 0, 40, 1],
      },
      cards: {
        // The unpicked clients bow out first — a staggered blur-fade
        // (transitions.dev's swap recipe) rippling out from the picked card.
        fadeMs: [200, 60, 600, 10],
        blur: [2, 0, 8, 0.5],
        staggerMs: [30, 0, 120, 5],
      },
      composer: {
        // The chatbox's ride from the centre to the bottom rail.
        // Default is the user's tuned value (2026-08-20): a fast drop.
        drop: { type: "spring", visualDuration: 0.2, bounce: 0.16 },
      },
      pill: {
        // The user message's landing.
        delayMs: [140, 0, 800, 10],
        ms: [180, 60, 500, 5],
        rise: [8, 0, 32, 1],
      },
      thinking: {
        fadeMs: [180, 60, 500, 5],
        // How long the desk "weighs" the opening move before greeting.
        greetDelayMs: [1100, 0, 3000, 50],
      },
      loader: {
        // The thinking shimmer — dotm-circular-5, the user's pick. It runs
        // alone at the reply's first-line slot, rides below the streaming
        // text, and freezes still under the finished reply (claude 2.mov).
        speed: [1.7, 0.2, 5, 0.05],
        size: [28, 12, 48, 1],
        dotSize: [4, 1, 8, 0.5],
        color: { type: "color", default: "#0091ff" },
        halo: [0, 0, 1, 0.05],
        bloom: false,
      },
      stream: {
        chunkWords: [3, 1, 8, 1],
        intervalMs: [90, 20, 400, 5],
        chunkFadeMs: [260, 60, 800, 10],
        fromOpacity: [0.3, 0, 1, 0.02],
      },
      sidebar: {
        // After the first reply lands: the rail folds and the panel unfurls
        // on ONE shared curve, then the furniture cascades.
        delayMs: [260, 0, 1500, 10],
        slideMs: [460, 120, 1200, 10],
        staggerMs: [45, 0, 150, 5],
        itemMs: [240, 60, 600, 5],
      },
      type: {
        // Message line-heights — the Figma 1.2 reads tight once replies run
        // several lines; these open the leading without touching sizes.
        userLine: [1.4, 1.1, 2.2, 0.05],
        agentLine: [1.5, 1.1, 2.2, 0.05],
      },
      veil: {
        // The wash under the composer: the transcript fades at its top edge
        // and is unseen below. Height in px; solid share in percent.
        height: [216, 120, 400, 4],
        solidPct: [72, 30, 100, 1],
      },
    },
    { id: "desk-interactions", persist: true },
  );

  /* The chat is UNIVERSAL: a conversation may be seeded with a client scope
     (the landing card), but it never belongs to one — the server resolves
     each question's subject. One rail entry per conversation; Start new chat
     is the only boundary. */
  const [scopeClient, setScopeClient] = useState<DeskClient | null>(
    () => clients.find((c) => c.id === initialClientId) ?? null,
  );
  const [conversation, setConversation] = useState(
    () => initialClientId !== undefined || initialOpenChatId !== null,
  );
  /* The rail shows on the LANDING too whenever there is history to browse —
     resume is the returning user's first intent. Only the true first run
     (zero chats) keeps the full-width welcome and the cinematic slide-in
     after the first reply. */
  const [sidebarIn, setSidebarIn] = useState(
    () => conversation || initialChats.length > 0,
  );
  /** True when the rail was already standing at mount — it must not replay
   *  its arrival ride on an ordinary page load. */
  const railAtMount = useRef(conversation || initialChats.length > 0);
  const [messages, setMessages] = useState<DeskMessage[]>(() => {
    if (initialOpenMessages) return transcriptFromRows(initialOpenMessages);
    const c = clients.find((x) => x.id === initialClientId);
    return c ? greetingTranscript(greetName, c.name) : [];
  });
  const [chats, setChats] = useState<DeskChat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    initialOpenChatId,
  );
  /** The persisted conversation this window is in — null until the first
   *  real exchange lands. */
  const chatIdRef = useRef<string | null>(initialOpenChatId);
  const [seed, setSeed] = useState<{ text: string; nonce: number }>();
  const [pending, setPending] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const draftRef = useRef("");
  /** The last fully-streamed reply, announced once to screen readers. */
  const [announced, setAnnounced] = useState("");

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  /* The transcript follows its newest line. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const later = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  /** Streams `text` into the agent message `id` in pale chunks. */
  const streamReply = useCallback(
    (id: string, text: string, onDone?: () => void) => {
      const words = text.split(/(?<=\s)/);
      const per = Math.max(1, Math.round(dial.stream.chunkWords));
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += per) {
        chunks.push(words.slice(i, i + per).join(""));
      }
      chunks.forEach((chunk, i) => {
        later(i * dial.stream.intervalMs, () => {
          setMessages((was) =>
            was.map((m) =>
              m.kind === "agent" && m.id === id
                ? {
                    ...m,
                    thinking: false,
                    done: i === chunks.length - 1,
                    chunks: [...m.chunks, { id: i, text: chunk }],
                  }
                : m,
            ),
          );
          if (i === chunks.length - 1) {
            setAnnounced(text);
            onDone?.();
          }
        });
      });
    },
    [dial.stream.chunkWords, dial.stream.intervalMs, later],
  );

  /** The first move: picking a client opens their desk. The unpicked cards
   *  ripple out FIRST; only then does the room change hands. */
  function openDesk(picked: DeskClient) {
    if (conversation || pickedId) return;
    setPickedId(picked.id);
    window.history.replaceState(null, "", `/answer-desk?client=${picked.id}`);

    const rippleMs =
      dial.cards.fadeMs + (clients.length - 1) * dial.cards.staggerMs;
    later(rippleMs, () => {
      setScopeClient(picked);
      setConversation(true);
      /* Anything typed on the landing survives the handoff. */
      if (draftRef.current.trim())
        setSeed({ text: draftRef.current, nonce: Date.now() });
    });

    const t0 = rippleMs + dial.pill.delayMs;
    later(t0, () => {
      setMessages([
        {
          kind: "user",
          id: nextId(),
          text: `Let’s talk about: ${picked.name}`,
          at: Date.now(),
          synthetic: true,
        },
      ]);
    });
    const agentId = nextId();
    later(t0 + dial.thinking.fadeMs, () => {
      setMessages((was) => [
        ...was,
        {
          kind: "agent",
          id: agentId,
          chunks: [],
          thinking: true,
          done: false,
          at: Date.now(),
          synthetic: true,
        },
      ]);
    });
    /* Never let the greeting outrun the thinking row it streams into. */
    const greetAt = Math.max(
      dial.thinking.greetDelayMs,
      dial.thinking.fadeMs + 60,
    );
    later(t0 + greetAt, () => {
      streamReply(
        agentId,
        `Hey ${greetName}! Ask me anything about ${picked.name}`,
        () => later(dial.sidebar.delayMs, () => setSidebarIn(true)),
      );
    });
  }

  /** A real question — the engine answers, the transcript streams it.
   *  Attached images ride the message visually; the engine reads them when
   *  Phase 8's real engine takes over this same action. */
  function ask(
    question: string,
    images: string[] = [],
    opts: { starting?: boolean } = {},
  ): boolean {
    /* `starting` lets the landing's first ask run in the same tick that
       flips `conversation` on — state commits after this frame. */
    if ((!conversation && !opts.starting) || pending) return false;
    setPending(true);
    const userId = nextId();
    const agentId = nextId();
    setMessages((was) => [
      ...was,
      {
        kind: "user",
        id: userId,
        text: question,
        at: Date.now(),
        images: images.length ? images : undefined,
      },
      {
        kind: "agent",
        id: agentId,
        chunks: [],
        thinking: true,
        done: false,
        at: Date.now(),
      },
    ]);
    askUniversalAction({
      chatId: chatIdRef.current,
      scopeClientId: scopeClient?.id ?? null,
      question,
    })
      .then(({ chatId, title, reply }) => {
        const fresh = chatIdRef.current === null;
        chatIdRef.current = chatId;
        setActiveChatId(chatId);
        window.history.replaceState(null, "", `/answer-desk?chat=${chatId}`);
        const at = new Date().toISOString();
        setChats((was) =>
          fresh
            ? [
                {
                  id: chatId,
                  title,
                  scopeClientId: scopeClient?.id ?? null,
                  lastClientId: null,
                  at,
                },
                ...was,
              ]
            : /* An existing chat rises to the top with its recency. */
              [
                ...was.filter((c) => c.id === chatId).map((c) => ({ ...c, at })),
                ...was.filter((c) => c.id !== chatId),
              ],
        );
        streamReply(agentId, reply, () => setPending(false));
      })
      .catch(() => {
        setPending(false);
        /* The whole failed exchange comes out of the transcript and the
           question returns to the composer — transitions.dev's error shake
           marks the moment, and nothing typed is ever lost to a request. */
        setMessages((was) =>
          was.filter((m) => m.id !== agentId && m.id !== userId),
        );
        setSeed({ text: question, nonce: Date.now() });
        setShakeNonce((n) => n + 1);
        toast("That one didn’t go through — ask again.");
      });
    return true;
  }

  /** The landing composer is LIVE: typing there starts a universal chat —
   *  the landing hands the room to the conversation, then the same ask runs.
   *  No pill, no greeting: the first exchange is the question itself. */
  function startUniversalChat(question: string, images: string[]): boolean {
    if (conversation || pending || pickedId) return false;
    setConversation(true);
    const accepted = ask(question, images, { starting: true });
    /* The sidebar arrives once the room has changed hands — the same beat
       as the seeded ride's first reply. */
    if (accepted && !sidebarIn)
      later(dial.thinking.greetDelayMs + dial.sidebar.delayMs, () =>
        setSidebarIn(true),
      );
    return accepted;
  }

  /** A chat row recalls its exchange — across clients: picking another
   *  client's question swaps the desk's scope with it, no theater. */
  function selectChat(id: string) {
    if (id === chatIdRef.current && conversation) return;
    chatIdRef.current = id;
    setActiveChatId(id);
    setConversation(true);
    setScopeClient(null);
    setPickedId(null);
    setPending(false);
    window.history.replaceState(null, "", `/answer-desk?chat=${id}`);
    /* The transcript comes whole from its rows — no theater on reopen. */
    getDeskChatMessagesAction(id)
      .then((rows) => {
        /* Only if this chat is still the one on stage. */
        if (chatIdRef.current === id) setMessages(transcriptFromRows(rows));
      })
      .catch(() => {
        toast("That chat couldn’t load — try again.");
      });
  }

  /** "Start new chat" keeps the desk chrome exactly where it is — the rail
   *  stays folded, the panel stays — and only the CONTENT returns to the
   *  centre: the chatbox and the client picker, ready for the next scope. */
  function newChat() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    chatIdRef.current = null;
    setConversation(false);
    setScopeClient(null);
    setPickedId(null);
    setActiveChatId(null);
    setMessages([]);
    setPending(false);
    window.history.replaceState(null, "", "/answer-desk");
  }


  const composer = (position: "landing" | "conversation") => (
    <motion.div
      layoutId="desk-composer"
      /* position, not size: the ride to the bottom is a translation. Left
         to animate size too, the wrapper's spring re-fires on every content
         growth step and warps the box while it types. */
      layout="position"
      transition={toMotion(dial.composer.drop as DialTransition)}
      className={cn(
        /* 43px, not the frame's 44: the sheet's own hairline is inside this
           box's coordinate space, and Figma's inside stroke is not. */
        position === "conversation" &&
          "absolute inset-x-0 bottom-10.75 z-10 mx-auto w-full max-w-desk-composer",
        /* The landing box matches the conversation's 652: negative margins
           push it 18 past the 616 column each side, and the drop morph
           carries one width the whole ride. */
        position === "landing" && "-mx-4.5",
      )}
    >
      <motion.div
        animate={
          shakeNonce > 0 ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }
        }
        key={`shake-${shakeNonce}`}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <DeskChatbox
          placeholder={ad.inputPlaceholder}
          float={position === "conversation"}
          seed={seed}
          autoFocus={position === "conversation"}
          onDraftChange={(t) => {
            draftRef.current = t;
          }}
          onSubmit={
            position === "conversation" ? ask : startUniversalChat
          }
          mentionables={clients}
        />
      </motion.div>
    </motion.div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <AppNav
          profile={profile}
          isAdmin={isAdmin}
          newTeamJoins={newTeamJoins}
          collapsed={sidebarIn}
          collapseMs={dial.sidebar.slideMs}
        />
        <AnimatePresence>
          {sidebarIn && (
            <DeskSideBar
              key="desk-panel"
              arrive={!railAtMount.current}
              chats={chats.map((c) => ({ id: c.id, title: c.title }))}
              activeChatId={activeChatId}
              slideMs={dial.sidebar.slideMs}
              staggerMs={dial.sidebar.staggerMs}
              itemMs={dial.sidebar.itemMs}
              onSelectChat={selectChat}
              onNewChat={newChat}
            />
          )}
        </AnimatePresence>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-primary pt-15 md:rounded-l-24 md:border-fig md:border-border md:pt-0 md:shadow-sheet">
          {conversation && (
            <>
              <div
                ref={scrollerRef}
                className="min-h-0 w-full flex-1 overflow-y-auto"
              >
                <div className="mx-auto flex w-full max-w-desk flex-col gap-8 px-5 pb-56 pt-27.5 md:px-0.5">
                  {messages.map((m) =>
                    m.kind === "user" ? (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: dial.pill.rise }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "tween",
                          duration: dial.pill.ms / 1000,
                          ease: "easeOut",
                        }}
                      >
                        <UserMessage
                          text={m.text}
                          at={m.at}
                          lineHeight={dial.type.userLine}
                          images={m.images}
                          meta={!m.synthetic}
                          onRetry={() => ask(m.text)}
                          onEdit={() =>
                            setSeed({ text: m.text, nonce: Date.now() })
                          }
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          type: "tween",
                          duration: dial.thinking.fadeMs / 1000,
                          ease: "easeOut",
                        }}
                      >
                        <AgentReply
                          chunks={m.chunks}
                          lineHeight={dial.type.agentLine}
                          phase={
                            m.thinking
                              ? "thinking"
                              : m.done
                                ? "done"
                                : "streaming"
                          }
                          at={m.at}
                          meta={!m.synthetic}
                          tail={
                            m.id ===
                            messages.filter((x) => x.kind === "agent").at(-1)
                              ?.id
                          }
                          chunkFadeMs={dial.stream.chunkFadeMs}
                          chunkFromOpacity={dial.stream.fromOpacity}
                          loader={dial.loader}
                          onUndo={() => {
                            const paired = pairedQuestion(messages, m.id);
                            if (paired)
                              setSeed({ text: paired, nonce: Date.now() });
                          }}
                          onRetry={() => {
                            const paired = pairedQuestion(messages, m.id);
                            if (paired) ask(paired);
                          }}
                        />
                      </motion.div>
                    ),
                  )}
                </div>
              </div>
              {/* The transcript fades at the composer's top edge and is
                  unseen below it — the veil sits between them. */}
              {/* DOM order stacks it: above the scroller, under the composer. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 composer-veil"
                style={
                  {
                    height: dial.veil.height,
                    "--veil-solid": `${dial.veil.solidPct}%`,
                  } as React.CSSProperties
                }
              />
              {composer("conversation")}
            </>
          )}
          {/* The landing rides ABOVE the conversation while it leaves, so the
              transcript can take the room underneath without a reflow. */}
          <AnimatePresence>
            {!conversation && (
              <motion.div
                key="landing"
                className="absolute inset-0 flex flex-col items-center justify-center px-5 py-8 md:px-6"
              >
                <div className="flex w-full max-w-desk flex-col gap-12 px-0.5">
                <motion.header
                  className="flex w-full flex-col items-center gap-2"
                  exit={{ opacity: 0, y: -dial.exit.liftY }}
                  transition={{
                    type: "tween",
                    duration: dial.exit.fadeMs / 1000,
                    ease: "easeIn",
                  }}
                >
                  <RelayMark size={30} className="size-mark-lg" />
                  <h1 className="text-center font-greeting text-fig-greeting fig-medium tracking-greeting text-heading-01">
                    <span className="sr-only">{ad.title} — </span>
                    {ad.greetingPrefix} {greetName}
                  </h1>
                </motion.header>

                {composer("landing")}

                <motion.section
                  className="flex w-full flex-col gap-6 p-1"
                  exit={{ opacity: 0, y: dial.exit.liftY / 2 }}
                  transition={{
                    type: "tween",
                    duration: dial.exit.fadeMs / 1000,
                    ease: "easeIn",
                  }}
                >
                  <h2 className="w-full font-geist text-fig-body fig-w450 text-heading-06">
                    {ad.pickClient}
                  </h2>
                  {clients.length === 0 ? (
                    <p className="w-full font-geist text-fig-caption-1 text-heading-06">
                      {ad.pickClientBody}
                    </p>
                  ) : (
                    <div className="grid w-full grid-cols-1 gap-2.5 md:grid-cols-2">
                      {clients.map((c, i) => {
                        const pickedIndex = clients.findIndex(
                          (x) => x.id === pickedId,
                        );
                        const dim = pickedId !== null && c.id !== pickedId;
                        return (
                          <motion.div
                            key={c.id}
                            animate={
                              dim
                                ? {
                                    opacity: 0,
                                    filter: `blur(${dial.cards.blur}px)`,
                                  }
                                : { opacity: 1, filter: "blur(0px)" }
                            }
                            transition={{
                              type: "tween",
                              duration: dial.cards.fadeMs / 1000,
                              ease: "easeOut",
                              delay: dim
                                ? (Math.abs(i - pickedIndex) *
                                    dial.cards.staggerMs) /
                                  1000
                                : 0,
                            }}
                          >
                            <DeskClientCard
                              client={c}
                              onPick={() => openDesk(c)}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Streamed replies reach screen readers once, whole, on landing. */}
          <div aria-live="polite" className="sr-only">
            {announced}
          </div>
          <DeskDials />
        </main>
      </LayoutGroup>
    </MotionConfig>
  );
}

/** The opening exchange, as it reads once the theater has already played —
 *  a reload shows the same conversation the ride arrived at. */
/** A reopened chat's transcript, straight from its rows — no theater. */
function transcriptFromRows(rows: DeskChatMessage[]): DeskMessage[] {
  return rows.map((r) =>
    r.role === "user"
      ? {
          kind: "user" as const,
          id: nextId(),
          text: r.body,
          at: Date.parse(r.at),
        }
      : {
          kind: "agent" as const,
          id: nextId(),
          chunks: [{ id: 0, text: r.body }],
          thinking: false,
          done: true,
          at: Date.parse(r.at),
        },
  );
}

function greetingTranscript(
  greetName: string,
  clientName: string,
): DeskMessage[] {
  return [
    {
      kind: "user",
      id: nextId(),
      text: `Let’s talk about: ${clientName}`,
      at: Date.now(),
      synthetic: true,
    },
    {
      kind: "agent",
      id: nextId(),
      chunks: [
        { id: 0, text: `Hey ${greetName}! Ask me anything about ${clientName}` },
      ],
      thinking: false,
      done: true,
      at: Date.now(),
      synthetic: true,
    },
  ];
}

/** The user question an agent reply answered — the message right above it. */
function pairedQuestion(
  messages: DeskMessage[],
  agentId: string,
): string | null {
  const i = messages.findIndex((m) => m.id === agentId);
  for (let j = i - 1; j >= 0; j--) {
    const m = messages[j]!;
    if (m.kind === "user") return m.text;
  }
  return null;
}

/** One picker row (component 612:9952) — see the landing frame. */
function DeskClientCard({
  client,
  onPick,
}: {
  client: DeskClient;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      /* w-full: a button shrinks to its content where the old link filled
         the grid cell — the hover pill must span the 299 column (612:9846). */
      className="flex w-full items-center gap-2.5 rounded-10 p-2 text-left transition-colors duration-200 ease-out hover:bg-surface-foreground-01"
    >
      <span className="flex size-desk-tile shrink-0 items-center justify-center rounded-8 border-fig border-border bg-surface-dashboard bg-clip-padding">
        <ClientAvatar name={client.name} logo={client.logoUrl} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-geist text-fig-body fig-w450 text-heading-01">
          {client.name}
        </span>
        {client.descriptor ? (
          <span className="truncate font-geist text-fig-caption-1 text-heading-06">
            {client.descriptor}
          </span>
        ) : null}
      </span>
    </button>
  );
}
