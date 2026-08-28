"use client";

import { useEffect, useState } from "react";
import { AccessibleLottie } from "@/components/home/accessible-lottie";
import { pickCelebrationAnimation } from "@/features/home/model";

export function ChoreCelebration({ animationSrc, label = "Chore complete" }: { animationSrc?: string; label?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animation] = useState(() => animationSrc ?? pickCelebrationAnimation());
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center overflow-hidden bg-violet-950/35 p-6 backdrop-blur-sm" role="status" aria-label={label}><div className="w-full max-w-xl">{reduceMotion ? <div className="grid aspect-square place-items-center text-8xl">✨</div> : <AccessibleLottie src={animation} label={label} loop={false} wrapperClassName="h-[min(70vh,38rem)] w-full drop-shadow-2xl" className="size-full" />}</div></div>;
}
