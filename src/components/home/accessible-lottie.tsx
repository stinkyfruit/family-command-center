"use client";

import { useRef, useState } from "react";
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
 * Lottie animations intentionally start paused so motion is never forced on
 * the page. User-facing animations can opt into the playback control.
 */
export function AccessibleLottie({ src, label, className, wrapperClassName = "", loop = true, autoplay = false, controls = false }: AccessibleLottieProps) {
  const lottieRef = useRef<LottieHandle>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);

  function togglePlayback() {
    if (isPlaying) {
      lottieRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    lottieRef.current?.play();
    setIsPlaying(true);
  }

  return <div className={`group relative ${wrapperClassName}`}>
    <Lottie src={src} autoplay={autoplay} loop={loop} className={className} aria-label={label} lottieRef={lottieRef} subscriptions={{ complete: () => setIsPlaying(false), pause: () => setIsPlaying(false) }} />
    {controls && <button type="button" onClick={togglePlayback} aria-label={`${isPlaying ? "Pause" : "Play"} ${label.toLowerCase()}`} title={`${isPlaying ? "Pause" : "Play"} animation`} className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full bg-slate-950/55 text-white opacity-70 shadow-sm ring-1 ring-white/40 transition-opacity hover:bg-slate-950/75 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
      <AppIcon name={isPlaying ? "pause" : "play"} className="size-4" />
    </button>}
  </div>;
}
