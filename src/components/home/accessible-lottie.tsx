"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Lottie, type LottieHandle, type LottieProps } from "lottie-react";
import { AppIcon } from "@/components/home/shared-ui";

type AccessibleLottieProps = {
  src: LottieProps["src"];
  label: string;
  className?: string;
  wrapperClassName?: string;
  loop?: boolean | number;
  autoplay?: boolean;
  controls?: boolean;
};

/**
 * Animations start automatically unless reduced motion is requested. The
 * animation itself is the invisible play/pause affordance when controls are
 * hidden, so the UI stays clean without removing motion control.
 */
export function AccessibleLottie({ src, label, className, wrapperClassName = "", loop = true, autoplay = true, controls = false }: AccessibleLottieProps) {
  const lottieRef = useRef<LottieHandle>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function togglePlayback() {
    if (isPlaying) {
      lottieRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    lottieRef.current?.play();
    setIsPlaying(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    togglePlayback();
  }

  const subscriptions = {
    ready: () => {
      if (autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        lottieRef.current?.play();
        setIsPlaying(true);
      }
    },
    complete: () => setIsPlaying(false),
    pause: () => setIsPlaying(false),
  };

  return <div className={`group relative ${wrapperClassName} ${controls ? "" : "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"}`} role={controls ? undefined : "button"} tabIndex={controls ? undefined : 0} aria-label={controls ? undefined : `Toggle ${label.toLowerCase()} animation`} aria-pressed={controls ? undefined : isPlaying} onClick={controls ? undefined : togglePlayback} onKeyDown={controls ? undefined : handleKeyDown}>
    <Lottie src={src} autoplay={false} loop={loop} className={className} aria-label={label} lottieRef={lottieRef} subscriptions={subscriptions} />
    {controls && <button type="button" onClick={togglePlayback} aria-label={`${isPlaying ? "Pause" : "Play"} ${label.toLowerCase()}`} title={`${isPlaying ? "Pause" : "Play"} animation`} className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-slate-950/55 text-white opacity-70 shadow-sm ring-1 ring-white/40 transition-opacity hover:bg-slate-950/75 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      <AppIcon name={isPlaying ? "pause" : "play"} className="size-4" />
    </button>}
  </div>;
}
