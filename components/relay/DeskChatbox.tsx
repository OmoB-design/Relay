"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useDialKit } from "dialkit";
import { cn } from "@/lib/utils";
import {
  MicGlyph,
  PlusGlyph,
  SendArrowGlyph,
  TipDismissGlyph,
} from "@/components/relay/NavIcons";
// (TipDismissGlyph doubles as the attachment chip's remove mark.)

/* The Answer Desk chatbox — Figma component set 615:12436, all six variants.

   THE STATES ARE CHROME, NOT STRUCTURE. Default rests on a Grey/150 hairline
   with three near-white drop layers; Selected (focus) and Typing (text) both
   step the stroke to Grey/300 and add two zero-offset halos on top of the
   same three layers — attention as glow, never as an outline swap, and the
   border WIDTH never moves so the box never breathes. Typing alone surfaces
   the blue send button beside the mic.

   The set's Tips variants change the rule: inside the washed 620 housing the
   inner box keeps the QUIET chrome in all three states — the housing itself
   is the emphasis, so the halo never fires under a tip. The housing is 2px
   proud on each side (620 over 616), which the -mx-0.5 pays for so the inner
   box stays register-aligned with the bare one.

   The caret is real, not the mock's literal "|": caret-grey-400 is the same
   #959595 the frame paints it.

   THE SEND ENTRY IS THE REFERENCE VIDEO'S, NOT A BOUNCE. Frame-by-frame the
   reference (Claude, 60fps) crossfades in place: the resting glyph fades out
   ~90ms, a beat of empty air, then send fades in ~110ms from ~92% scale —
   opacity-led, no overshoot. Ours keeps the set's mic and lets it glide left
   on a soft spring while send fades in beside it. All of it on dials. */

/* A dialkit spring dial hands back either a spring or an easing curve; Motion
   wants "tween", never "easing". Same adapter the workspace carries. */
type DialTransition =
  | { type: "spring"; [k: string]: unknown }
  | { type: "easing"; duration: number; ease: [number, number, number, number] };

function toMotion(t: DialTransition) {
  return t.type === "easing"
    ? { type: "tween" as const, duration: t.duration, ease: t.ease }
    : t;
}

/* Voice input rides the Web Speech API where the browser has it — dictation
   streams interim words into the box, a second press (or submit) stops it.
   Browsers without it get a truthful title and a quiet button. */
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: {
        resultIndex: number;
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Attachment = { id: string; url: string };

export function DeskChatbox({
  placeholder,
  tip,
  onDismissTip,
  onSubmit,
  onAttach,
  onVoice,
  float = false,
  seed,
  autoFocus = false,
  onDraftChange,
}: {
  placeholder: string;
  /** The tip banner's label — renders the Tips housing when present. What
   *  feeds it is still the client's call; the surface is ready either way. */
  tip?: string;
  onDismissTip?: () => void;
  /** Return true when the question was consumed — that clears the box.
   *  Attached images ride along as client-side object URLs. */
  onSubmit: (question: string, images: string[]) => boolean | void;
  /** Overrides the built-in file picker (the landing nudges instead). */
  onAttach?: () => void;
  /** Overrides the built-in dictation (the landing nudges instead). */
  onVoice?: () => void;
  /** The conversation composer's elevation (I619:14705): one deep soft layer
   *  under each state's stack, because the box floats over the transcript. */
  float?: boolean;
  /** Hand a question back to the composer (the transcript's edit action).
   *  The nonce forces a re-seed even for the same text. */
  seed?: { text: string; nonce: number };
  /** Focus the box the moment it mounts (the conversation composer). */
  autoFocus?: boolean;
  /** Every keystroke, so the page can carry a draft across a handoff. */
  onDraftChange?: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [images, setImages] = useState<Attachment[]>([]);
  const [listening, setListening] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  /** What the box held when dictation started — interim words replace only
   *  their own tail, never the typed base. */
  const dictationBaseRef = useRef("");
  const speechCtor = speechRecognitionCtor();

  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  function stopListening() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    if (!speechCtor) return;
    const rec = new speechCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    dictationBaseRef.current = value ? `${value.trimEnd()} ` : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i]![0]!.transcript;
      }
      const next = dictationBaseRef.current + transcript;
      setValue(next);
      onDraftChange?.(next);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f) }));
    if (next.length) setImages((was) => [...was, ...next]);
  }

  /* A seed is an invitation to keep typing: focus follows it, caret at the
     end, so edit/undo/failure never strand a keyboard user. */
  useEffect(() => {
    if (!seed) return;
    setValue(seed.text);
    const area = areaRef.current;
    if (area) {
      area.focus();
      area.setSelectionRange(seed.text.length, seed.text.length);
    }
  }, [seed]);

  /* The send entry's tuning (dialkit). Defaults are the reference video's
     measured profile; production ships these numbers. */
  const dial = useDialKit(
    "Desk chatbox",
    {
      send: {
        inMs: [110, 40, 400, 5],
        outMs: [90, 40, 400, 5],
        scaleFrom: [0.92, 0.5, 1, 0.01],
        micGlide: { type: "spring", visualDuration: 0.35, bounce: 0.15 },
      },
    },
    { id: "desk-chatbox", persist: true },
  );

  const hasText = value.trim().length > 0;
  /* Selected and Typing share one chrome, so text left in a blurred box keeps
     the halo — the box stays "warm" while a question is sitting in it. */
  const active = focused || value.length > 0;
  const tipped = tip !== undefined;

  function submit() {
    if (!hasText) return;
    if (listening) stopListening();
    if (onSubmit(value.trim(), images.map((i) => i.url)) === true) {
      setValue("");
      setImages([]);
      onDraftChange?.("");
    }
  }

  const box = (
    <form
      className={cn(
        /* Attachments grow the box; empty, it holds the frame's 130. */
        images.length > 0 ? "min-h-chatbox" : "h-chatbox",
        "flex w-full flex-col gap-4 overflow-clip rounded-20 border-fig bg-surface-dashboard pb-5 pt-1 transition-[border-color,box-shadow] duration-200 ease-out",
        tipped
          ? "shadow-chatbox"
          : active
            ? float
              ? "shadow-chatbox-float-active"
              : "shadow-chatbox-active"
            : float
              ? "shadow-chatbox-float"
              : "shadow-chatbox",
        tipped
          ? "border-border"
          : active
            ? "border-grey-300"
            : "border-grey-150",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex min-h-0 w-full flex-1 px-4 pb-3 pt-3.5">
        <textarea
          ref={areaRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value);
            onDraftChange?.(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label="Question"
          className="size-full resize-none bg-transparent font-geist text-fig-body-lg text-heading-01 caret-grey-400 outline-none placeholder:text-heading-06"
          onKeyDown={(e) => {
            // isComposing: an IME confirming a candidate is not a send.
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
      {/* Attached screenshots wait here until send — each removable. */}
      <AnimatePresence initial={false}>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex w-full flex-wrap gap-1.5 px-4"
          >
            {images.map((img) => (
              <span key={img.id} className="group/chip relative">
                {/* eslint-disable-next-line @next/next/no-img-element --
                    object URLs can't go through next/image */}
                <img
                  src={img.url}
                  alt="Attachment preview"
                  className="size-12 rounded-8 border-fig border-border object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() =>
                    setImages((was) => was.filter((i) => i.id !== img.id))
                  }
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-8 border-fig border-border bg-surface-primary text-icon-explainer opacity-0 transition-opacity duration-150 ease-out hover:text-heading-01 group-hover/chip:opacity-100"
                >
                  <TipDismissGlyph className="size-2.5" />
                </button>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex w-full items-center justify-between px-4">
        {/* Hover fills are the set's own (615:11881 / 615:11236): the wash is
            foreground-02, and only the MIC's ink darkens on hover. */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="Attach images"
          title="Attach images"
          onClick={onAttach ?? (() => fileRef.current?.click())}
          className="flex size-7.5 items-center justify-center rounded-8 text-icon-system transition-colors duration-200 ease-out hover:bg-surface-foreground-02"
        >
          <PlusGlyph className="size-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <motion.button
            layout
            transition={toMotion(dial.send.micGlide as DialTransition)}
            type="button"
            aria-label={listening ? "Stop voice input" : "Voice input"}
            aria-pressed={listening}
            title={
              onVoice || speechCtor
                ? listening
                  ? "Stop voice input"
                  : "Voice input"
                : "Voice input isn't supported in this browser"
            }
            onClick={onVoice ?? (speechCtor ? toggleListening : undefined)}
            className={cn(
              "flex size-7.5 items-center justify-center rounded-8 transition-colors duration-200 ease-out",
              listening
                ? "bg-red-50 text-red-500"
                : "text-icon-system hover:bg-surface-foreground-02 hover:text-icon-system-hover",
            )}
          >
            {listening ? (
              <motion.span
                animate={{ opacity: [1, 0.45, 1] }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                <MicGlyph className="size-4" />
              </motion.span>
            ) : (
              <MicGlyph className="size-4" />
            )}
          </motion.button>
          <AnimatePresence initial={false}>
            {hasText && (
              <motion.button
                type="submit"
                aria-label="Send"
                initial={{ opacity: 0, scale: dial.send.scaleFrom }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: dial.send.scaleFrom,
                  transition: {
                    type: "tween",
                    duration: dial.send.outMs / 1000,
                    ease: "easeIn",
                  },
                }}
                transition={{
                  type: "tween",
                  duration: dial.send.inMs / 1000,
                  ease: "easeOut",
                }}
                className="flex size-7.5 items-center justify-center rounded-8 border-fig border-border bg-blue-500 bg-clip-padding text-white shadow-chat-control"
              >
                <SendArrowGlyph className="size-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );

  if (!tipped) return <MotionConfig reducedMotion="user">{box}</MotionConfig>;

  return (
    <MotionConfig reducedMotion="user">
      {/* p-px, not the frame's p-2: Figma's inside stroke doesn't consume the
          2px padding, a CSS border does — 1px pad + the hairline = the same
          2px inset, and the inner box keeps its full 616. */}
      <div className="-mx-0.5 flex flex-col rounded-20 border-fig border-border bg-surface-foreground-01 bg-clip-padding p-px">
        <div className="flex w-full items-center gap-1.5 px-3.5 py-1.5">
          <span className="flex min-w-0 flex-1 items-center rounded-8 py-0.5 shadow-chat-control">
            <span className="truncate font-geist text-fig-caption-1 text-heading-06">
              {tip}
            </span>
          </span>
          <button
            type="button"
            aria-label="Dismiss tip"
            onClick={onDismissTip}
            className="shrink-0 text-icon-explainer transition-colors duration-200 ease-out hover:text-heading-01"
          >
            <TipDismissGlyph className="size-3.5" />
          </button>
        </div>
        {box}
      </div>
    </MotionConfig>
  );
}
