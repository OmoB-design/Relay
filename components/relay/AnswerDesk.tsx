"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import { useDialKit } from "dialkit";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { AnswerThread, ClientProfile, Profile } from "@/lib/types";
import { AppNav } from "@/components/relay/AppNav";
import { ClientAvatar } from "@/components/relay/ClientAvatar";
import { DeskChatbox } from "@/components/relay/DeskChatbox";
import { DeskDials } from "@/components/relay/DeskDials";
import {
  DeskSideBar,
  type DeskChatGroup,
} from "@/components/relay/DeskSideBar";
import {
  AgentReply,
  UserMessage,
  type AgentChunk,
} from "@/components/relay/DeskMessages";
import { RelayMark } from "@/components/relay/NavIcons";
import {
  askDeskQuestionAction,
  getDeskThreadsAction,
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
   the reply streams in pale chunks that darken to ink, the sparkles spin for
   exactly as long as the answer takes, and the settled header keeps the real
   "Thought Ns". Every one of these moves is on the "Desk interactions" dials.

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
      /** The scope pill and its greeting are theater, not engine output —
       *  they carry no retry/edit controls. */
      synthetic?: boolean;
    }
  | {
      kind: "agent";
      id: string;
      chunks: AgentChunk[];
      thinking: boolean;
      thoughtSecs: number | null;
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
  initialThreadsByClient,
}: {
  profile: Profile;
  isAdmin: boolean;
  newTeamJoins: number;
  /** The buyer's first name — the landing greets a person, not a role. */
  greetName: string;
  clients: DeskClient[];
  initialClientId?: string;
  /** Every client's history — the rail groups by client (639:17442). */
  initialThreadsByClient: Record<string, AnswerThread[]>;
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
        // The dot-matrix thinking loader (dotm-circular-8), every knob.
        // Defaults are the user's tuned values (2026-08-20): a calmer,
        // larger loader in Relay blue.
        speed: [1.15, 0.2, 5, 0.05],
        size: [24, 10, 40, 1],
        dotSize: [2.5, 1, 6, 0.5],
        color: { type: "color", default: "#0091ff" },
        halo: [0, 0, 1, 0.05],
        bloom: false,
        opacityBase: [0.08, 0, 1, 0.02],
        opacityMid: [0.16, 0, 1, 0.02],
        opacityPeak: [0.96, 0, 1, 0.02],
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
    },
    { id: "desk-interactions", persist: true },
  );

  const [client, setClient] = useState<DeskClient | null>(
    () => clients.find((c) => c.id === initialClientId) ?? null,
  );
  const conversation = client !== null;
  const [sidebarIn, setSidebarIn] = useState(conversation);
  const [messages, setMessages] = useState<DeskMessage[]>(() =>
    client ? greetingTranscript(greetName, client.name) : [],
  );
  const [threadsByClient, setThreadsByClient] = useState<
    Record<string, AnswerThread[]>
  >(initialThreadsByClient);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  /* The rail's groups: every client with history, in the picker's order —
     the question text is the row's preview. */
  const chatGroups: DeskChatGroup[] = clients
    .filter((c) => (threadsByClient[c.id] ?? []).length > 0)
    .map((c) => ({
      clientId: c.id,
      clientName: c.name,
      chats: (threadsByClient[c.id] ?? []).map((t) => ({
        id: t.id,
        title: t.question,
      })),
    }));
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
    (id: string, text: string, startedAt: number, onDone?: () => void) => {
      const words = text.split(/(?<=\s)/);
      const per = Math.max(1, Math.round(dial.stream.chunkWords));
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += per) {
        chunks.push(words.slice(i, i + per).join(""));
      }
      const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      chunks.forEach((chunk, i) => {
        later(i * dial.stream.intervalMs, () => {
          setMessages((was) =>
            was.map((m) =>
              m.kind === "agent" && m.id === id
                ? {
                    ...m,
                    thinking: false,
                    thoughtSecs: secs,
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
      setClient(picked);
      /* Anything typed on the landing survives the handoff. */
      if (draftRef.current.trim())
        setSeed({ text: draftRef.current, nonce: Date.now() });
    });

    /* The picked client's history refreshes by action while the theater
       plays, so the chat rail is current by the time it slides in. */
    getDeskThreadsAction(picked.id)
      .then((threads) => {
        setThreadsByClient((was) => ({ ...was, [picked.id]: threads }));
      })
      .catch(() => {});

    const started = Date.now();
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
          thoughtSecs: null,
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
        started,
        () => later(dial.sidebar.delayMs, () => setSidebarIn(true)),
      );
    });
  }

  /** A real question — the engine answers, the transcript streams it. */
  function ask(question: string): boolean {
    if (!client || pending) return false;
    setPending(true);
    setActiveChatId(null);
    const started = Date.now();
    const userId = nextId();
    const agentId = nextId();
    setMessages((was) => [
      ...was,
      { kind: "user", id: userId, text: question, at: Date.now() },
      {
        kind: "agent",
        id: agentId,
        chunks: [],
        thinking: true,
        thoughtSecs: null,
        at: Date.now(),
      },
    ]);
    askDeskQuestionAction({ clientId: client.id, question })
      .then(({ threadId, answer }) => {
        const thread: AnswerThread = {
          id: threadId,
          clientId: client.id,
          question,
          createdAt: new Date().toISOString(),
          answer,
        };
        setThreadsByClient((was) => ({
          ...was,
          [client.id]: [thread, ...(was[client.id] ?? [])],
        }));
        streamReply(agentId, answer.text, started, () => setPending(false));
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

  /** A chat row recalls its exchange — across clients: picking another
   *  client's question swaps the desk's scope with it, no theater. */
  function selectChat(clientId: string, id: string | null) {
    const rowClient = clients.find((c) => c.id === clientId);
    if (!rowClient) return;
    if (client?.id !== clientId) {
      setClient(rowClient);
      window.history.replaceState(null, "", `/answer-desk?client=${clientId}`);
    }
    setActiveChatId(id);
    if (id === null) {
      setMessages(greetingTranscript(greetName, rowClient.name));
      return;
    }
    const thread = (threadsByClient[clientId] ?? []).find((t) => t.id === id);
    if (!thread) return;
    setMessages([
      {
        kind: "user",
        id: nextId(),
        text: thread.question,
        at: Date.parse(thread.createdAt),
      },
      {
        kind: "agent",
        id: nextId(),
        chunks: thread.answer ? [{ id: 0, text: thread.answer.text }] : [],
        thinking: false,
        thoughtSecs: null,
        at: Date.parse(thread.createdAt),
      },
    ]);
  }

  /** "Start new chat" keeps the desk chrome exactly where it is — the rail
   *  stays folded, the panel stays — and only the CONTENT returns to the
   *  centre: the chatbox and the client picker, ready for the next scope. */
  function newChat() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setClient(null);
    setPickedId(null);
    setActiveChatId(null);
    setMessages([]);
    setPending(false);
    window.history.replaceState(null, "", "/answer-desk");
  }

  function nudge() {
    toast(ad.pickClient);
  }

  const composer = (position: "landing" | "conversation") => (
    <motion.div
      layoutId="desk-composer"
      transition={toMotion(dial.composer.drop as DialTransition)}
      className={cn(
        /* 43px, not the frame's 44: the sheet's own hairline is inside this
           box's coordinate space, and Figma's inside stroke is not. */
        position === "conversation" &&
          "absolute inset-x-0 bottom-10.75 z-10 mx-auto w-full max-w-desk px-0.5",
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
            position === "conversation"
              ? ask
              : () => {
                  nudge();
                  return false;
                }
          }
          onAttach={position === "conversation" ? undefined : nudge}
          onVoice={position === "conversation" ? undefined : nudge}
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
              groups={chatGroups}
              activeClientId={client?.id ?? null}
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
                          thinking={m.thinking}
                          thoughtSecs={m.thoughtSecs}
                          at={m.at}
                          meta={!m.synthetic}
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
      thoughtSecs: null,
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
