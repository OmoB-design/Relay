"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

type Attachment = { id: string; url: string; loaded: boolean };

/* The reference video's growth law (frame-measured): the box rises from the
   frame's 130 one line-pitch at a time, bottom edge pinned, until ONE cap —
   the same cap with or without attachments; the chip row eats viewport, the
   box never exceeds it. Chrome the text can't use: top inset 4, block gap 16,
   icon row 30, bottom pad 20 — and a chip row spends 48 + 8 + 16 more. */
const GROW_CHROME = 4 + 16 + 30 + 20;
const CHIP_ZONE = 48 + 8 + 16;
/** One-line textarea height (14 top + 18 line + 12 bottom) — the floor. */
const AREA_MIN = 44;

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
  /** The measured textarea height (grows with content, capped). */
  const [areaH, setAreaH] = useState(AREA_MIN);
  /** Which edges have content scrolled past them — the ghost fades. */
  const [clipTop, setClipTop] = useState(false);
  const [clipBottom, setClipBottom] = useState(false);
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
      .map((f) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(f),
        loaded: false,
      }));
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
      grow: {
        // The box's ceiling and how fast it rises to meet the text.
        maxHeight: [240, 160, 420, 2],
        ms: [150, 60, 500, 10],
      },
      clip: {
        // The scrolled text's ghost zones (video: ~18 over, ~14 under).
        topH: [18, 8, 40, 1],
        bottomH: [14, 6, 40, 1],
        fadeMs: [150, 60, 500, 10],
      },
      chip: {
        // The attachment's landing pop.
        pop: { type: "spring", visualDuration: 0.28, bounce: 0.25 },
      },
    },
    { id: "desk-chatbox", persist: true },
  );

  /* Content drives the height: measure the textarea's natural size on every
     change, cap it at what the box ceiling leaves after chrome (and the chip
     row when one is up), and let CSS ease the difference. */
  const maxText = Math.max(
    AREA_MIN,
    dial.grow.maxHeight - GROW_CHROME - (images.length ? CHIP_ZONE : 0),
  );

  function updateClips() {
    const area = areaRef.current;
    if (!area) return;
    setClipTop(area.scrollTop > 2);
    setClipBottom(area.scrollHeight - area.scrollTop - area.clientHeight > 2);
  }

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    /* The height transition would ease the probe too — scrollHeight floors
       at the still-animating clientHeight and the box could never shrink.
       Suspend it for the measurement; nothing paints in between. */
    const held = area.style.height;
    area.style.transitionProperty = "none";
    area.style.height = "0px";
    const natural = area.scrollHeight;
    area.style.height = held;
    area.style.transitionProperty = "";
    setAreaH(Math.max(AREA_MIN, Math.min(natural, maxText)));
    // Clips read post-layout — the height above lands next frame.
    requestAnimationFrame(updateClips);
  }, [value, maxText]);

  const hasText = value.trim().length > 0;
  /* Selected and Typing share one chrome, so text left in a blurred box keeps
     the halo — the box stays "warm" while a question is sitting in it. */
  const active = focused || value.length > 0;
  const tipped = tip !== undefined;

  function submit() {
    if (!hasText) return;
    // An image still decoding can't ride a send — the video holds too.
    if (images.some((i) => !i.loaded)) return;
    if (listening) stopListening();
    if (onSubmit(value.trim(), images.map((i) => i.url)) === true) {
      setValue("");
      setImages([]);
      onDraftChange?.("");
    }
  }

  const anyLoading = images.some((i) => !i.loaded);

  const box = (
    <form
      className={cn(
        /* Content raises the box from the frame's 130 to the dialed cap;
           past it, the text scrolls inside (the video's law). */
        "flex min-h-chatbox w-full flex-col gap-4 overflow-clip rounded-20 border-fig bg-surface-dashboard pb-5 pt-1 transition-[border-color,box-shadow] duration-200 ease-out",
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
      {/* Attachments settle ABOVE the text (the video's row): each arrives on
          a pop, holds a spinner until its image decodes, and removes via a
          full-chip overlay under the pointer. */}
      <AnimatePresence initial={false}>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex w-full flex-wrap gap-1.5 overflow-clip px-4 pt-2"
          >
            <AnimatePresence initial={false}>
              {images.map((img) => (
                <motion.span
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={toMotion(dial.chip.pop as DialTransition)}
                  className="group/chip relative size-12 shrink-0 overflow-clip rounded-10"
                >
                  {!img.loaded && (
                    <span className="absolute inset-0 flex items-center justify-center bg-surface-foreground-02">
                      <span
                        aria-label="Uploading"
                        className="size-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
                      />
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element --
                      object URLs can't go through next/image */}
                  <img
                    src={img.url}
                    alt="Attachment preview"
                    onLoad={() =>
                      setImages((was) =>
                        was.map((i) =>
                          i.id === img.id ? { ...i, loaded: true } : i,
                        ),
                      )
                    }
                    className={cn(
                      "size-12 object-cover transition-opacity duration-150 ease-out",
                      !img.loaded && "opacity-0",
                    )}
                  />
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() =>
                      setImages((was) => was.filter((i) => i.id !== img.id))
                    }
                    className="absolute inset-0 flex items-center justify-center bg-base-black/50 text-white opacity-0 transition-opacity duration-150 ease-out focus-visible:opacity-100 group-hover/chip:opacity-100"
                  >
                    <TipDismissGlyph className="size-4" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className="relative min-h-0 w-full flex-1 cursor-text"
        onClick={() => areaRef.current?.focus()}
      >
        <textarea
          ref={areaRef}
          value={value}
          autoFocus={autoFocus}
          style={{
            height: areaH,
            transitionDuration: `${dial.grow.ms}ms`,
          }}
          onChange={(e) => {
            setValue(e.target.value);
            onDraftChange?.(e.target.value);
          }}
          onScroll={updateClips}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label="Question"
          className="block w-full resize-none overflow-y-auto scrollbar-none bg-transparent px-4 pb-3 pt-3.5 font-geist text-fig-body-lg text-heading-01 caret-grey-400 outline-none transition-[height] ease-out placeholder:text-heading-06"
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
        {/* The ghost zones — present only while text actually overflows that
            edge, exactly as the video behaves at scroll start and end. */}
        <AnimatePresence>
          {clipTop && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dial.clip.fadeMs / 1000 }}
              style={{ height: dial.clip.topH }}
              className="pointer-events-none absolute inset-x-0 top-0 composer-clip-top"
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {clipBottom && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dial.clip.fadeMs / 1000 }}
              style={{ height: dial.clip.bottomH }}
              className="pointer-events-none absolute inset-x-0 bottom-0 composer-clip-bottom"
            />
          )}
        </AnimatePresence>
      </div>
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
                disabled={anyLoading}
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
                className={cn(
                  "flex size-7.5 items-center justify-center rounded-8 border-fig border-border bg-blue-500 bg-clip-padding text-white shadow-chat-control",
                  /* The video's in-flight send: pale, not gone. */
                  "transition-opacity duration-200 ease-out disabled:opacity-45",
                )}
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
