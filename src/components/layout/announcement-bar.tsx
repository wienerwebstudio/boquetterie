"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

const ROTATE_MS = 5000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
const prefersReducedMotionOnServer = () => false;

const textCls = "truncate text-[12px] font-medium tracking-[0.04em] sm:text-[13px]";

/**
 * Rotating announcements. The rotation is purely visual: assistive tech gets all
 * messages as a static list, nothing is announced on its own. Rotation pauses on
 * hover, on keyboard focus, via the pause button and – by default – for
 * `prefers-reduced-motion: reduce`.
 */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, prefersReducedMotionOnServer);

  const count = messages.length;
  const paused = userPaused ?? reducedMotion;
  const running = count > 1 && !paused && !hovered && !focused;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setIndex((v) => (v + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [running, count]);

  if (count === 0) return null;
  if (count === 1) {
    return (
      <div className="bg-forest text-ivory">
        <div className="container-x flex h-9 items-center justify-center text-center">
          <p className={textCls}>{messages[0]}</p>
        </div>
      </div>
    );
  }

  const current = index % count;
  return (
    <div
      className="bg-forest text-ivory"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => setFocused(e.target.matches(":focus-visible"))}
      onBlur={() => setFocused(false)}
    >
      <div className="container-x flex h-9 items-center justify-center gap-2 text-center">
        <span className="size-6 shrink-0" aria-hidden />
        <p key={current} className={`animate-fade-in min-w-0 flex-1 ${textCls}`} aria-hidden>
          {messages[current]}
        </p>
        <ul className="sr-only" aria-label="Hinweise">
          {messages.map((m, n) => <li key={n}>{m}</li>)}
        </ul>
        <button
          type="button"
          onClick={() => setUserPaused(!paused)}
          aria-label={paused ? "Wechsel der Hinweise fortsetzen" : "Wechsel der Hinweise anhalten"}
          className="grid size-6 shrink-0 place-items-center rounded-full text-ivory/70 transition-colors hover:text-ivory focus-visible:text-ivory focus-visible:outline-offset-2 focus-visible:outline-ivory"
        >
          {paused ? <Play className="size-3" aria-hidden /> : <Pause className="size-3" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
