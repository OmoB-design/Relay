"use client";

import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useDialKit } from "dialkit";
import { cn } from "@/lib/utils";
import {
  MicGlyph,
  PlusGlyph,
  SendArrowGlyph,
  TipDismissGlyph,
} from "@/components/relay/NavIcons";

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

export function DeskChatbox({
  placeholder,
  tip,
  onDismissTip,
  onSubmit,
  onAttach,
  onVoice,
}: {
  placeholder: string;
  /** The tip banner's label — renders the Tips housing when present. What
   *  feeds it is still the client's call; the surface is ready either way. */
  tip?: string;
  onDismissTip?: () => void;
  /** Return true when the question was consumed — that clears the box. */
  onSubmit: (question: string) => boolean | void;
  onAttach?: () => void;
  onVoice?: () => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

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
    if (onSubmit(value.trim()) === true) setValue("");
  }

  const box = (
    <form
      className={cn(
        "flex h-chatbox w-full flex-col gap-4 overflow-clip rounded-20 border-fig bg-surface-dashboard pb-5 pt-1 transition-[border-color,box-shadow] duration-200 ease-out",
        tipped || !active
          ? "shadow-chatbox"
          : "shadow-chatbox-active",
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label="Question"
          className="size-full resize-none bg-transparent font-geist text-fig-body-lg text-heading-01 caret-grey-400 outline-none placeholder:text-heading-06"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
      <div className="flex w-full items-center justify-between px-4">
        {/* Hover fills are the set's own (615:11881 / 615:11236): the wash is
            foreground-02, and only the MIC's ink darkens on hover. */}
        <button
          type="button"
          aria-label="Add media"
          onClick={onAttach}
          className="flex size-7.5 items-center justify-center rounded-8 text-icon-system transition-colors duration-200 ease-out hover:bg-surface-foreground-02"
        >
          <PlusGlyph className="size-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <motion.button
            layout
            transition={toMotion(dial.send.micGlide as DialTransition)}
            type="button"
            aria-label="Voice input"
            onClick={onVoice}
            className="flex size-7.5 items-center justify-center rounded-8 text-icon-system transition-colors duration-200 ease-out hover:bg-surface-foreground-02 hover:text-icon-system-hover"
          >
            <MicGlyph className="size-4" />
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
