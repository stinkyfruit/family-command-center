"use client";

import { useEffect, useState } from "react";
import { AccessibleLottie } from "@/components/home/accessible-lottie";
import type { AuroraActivity, CometCloseApproach, MoonPhase, NotableSkyEvent, Weather } from "@/features/home/model";
import { auroraActivityLabel, moonPhase, notableSkyEventForDate, timeGreeting, weatherAnimation, weatherOrbClass, weatherWindLabel } from "@/features/home/model";
import { AppIcon } from "@/components/home/shared-ui";

type WeatherCardProps = {
  weather: Weather | null;
  sunTimes: { sunrise: number; sunset: number } | null;
  auroraActivity: AuroraActivity | null;
  cometCloseApproach: CometCloseApproach | null;
  onOpenForecast: () => void;
};

export function WeatherCard({ weather, sunTimes, auroraActivity, cometCloseApproach, onOpenForecast }: WeatherCardProps) {
  const currentMoonPhase = moonPhase(new Date());
  const notableSkyEvent = notableSkyEventForDate(new Date(), cometCloseApproach);
  const isNightWeather = weather?.isDay === false;
  const isStorm = /thunderstorm|lightning|tornado/i.test(weather?.summary ?? "");

  const windLabel = weather ? weatherWindLabel(weather) : null;
  return <article className={`weather-card relative w-full overflow-hidden rounded-[1.75rem] p-5 text-white shadow-lg max-md:min-h-40 max-md:p-5 md:max-lg:min-h-40 md:max-lg:p-6 md:p-6 ${isNightWeather ? "weather-card-night shadow-indigo-950/40" : "weather-card-day shadow-sky-200/50"}`}><span className={`weather-card-orb absolute -right-5 -top-9 size-28 rounded-full transition-colors duration-500 max-md:-top-6 max-md:size-20 ${weatherOrbClass(weather)}`} /><div className="weather-card-content relative min-w-0"><div className="flex h-full min-w-0 items-center justify-between gap-3 max-md:gap-2 md:gap-6 md:max-lg:gap-4"><div className="min-w-0 flex-1"><p title={`${timeGreeting()} · ${weather?.location ?? "LOCAL FORECAST"}`} className="break-words text-xs font-bold leading-tight tracking-wide md:max-lg:truncate md:max-lg:text-sm md:text-sm">{timeGreeting()} · {weather?.location ?? "LOCAL FORECAST"}</p>{isStorm && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-950/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/25"><AppIcon name="storm" className="size-3.5" />Active storm</span>}<p className="mt-2 text-4xl font-black tracking-tighter max-md:text-3xl md:max-lg:text-5xl md:text-5xl">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-semibold leading-snug text-white/90 md:max-lg:text-base md:text-base">{weather ? `${weather.summary} · ↑ ${weather.high}° ↓ ${weather.low}°` : "Allow location for today’s weather"}</p>{windLabel && <p className="mt-1 text-xs font-bold text-white/80">{windLabel}{weather?.conditionSource === "observation" ? " · Live observation" : ""}</p>}{isNightWeather && weather && <MoonPhaseBadge phase={currentMoonPhase}/>}</div><span className="block size-24 shrink-0 overflow-hidden max-md:size-28 md:size-40 md:max-lg:size-28">{weather ? <WeatherAnimation weather={weather} isNight={isNightWeather} /> : <span className="block text-6xl leading-none drop-shadow-sm md:text-8xl">{isNightWeather ? "🌙" : "☀️"}</span>}</span></div><WeatherSkyDetails sunTimes={sunTimes} notableSkyEvent={notableSkyEvent} auroraActivity={auroraActivity} /><button type="button" onClick={onOpenForecast} className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-black text-white/90 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!weather}><span>{weather ? "Forecast & outdoor conditions" : "Forecast unavailable"}</span><AppIcon name="chevronRight" className="size-3.5" /></button></div></article>;
}

function WeatherAnimation({ weather, isNight = !weather.isDay }: { weather: Weather; isNight?: boolean }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const isDay = !isNight;
  const fallback = weather.code >= 95 ? "⛈️" : weather.code >= 71 && weather.code <= 86 ? "❄️" : weather.code >= 51 && weather.code <= 67 || weather.code >= 80 ? "🌧️" : weather.code === 45 || weather.code === 48 ? "🌫️" : weather.code >= 2 ? "☁️" : isDay ? "☀️" : "🌙";
  return reduceMotion ? <span className="block text-3xl leading-none drop-shadow-sm md:text-5xl" aria-label={weather.summary}>{fallback}</span> : <AccessibleLottie src={weatherAnimation(weather.code, isDay)} label={weather.summary} wrapperClassName="size-full" className="size-full drop-shadow-sm" />;
}

function MoonPhaseBadge({ phase }: { phase: MoonPhase }) {
  return <div className="weather-moon-badge mt-3 flex items-center gap-2" role="img" aria-label={`${phase.name}, ${phase.illumination}% illuminated`}><span className={`weather-moon weather-moon--${phase.key} size-7 shrink-0`} aria-hidden="true"/><span className="min-w-0"><span className="block text-xs font-black leading-tight text-indigo-50">{phase.name}</span><span className="block text-[10px] font-semibold leading-tight text-indigo-100/75">{phase.illumination}% illuminated</span></span></div>;
}

function WeatherSkyDetails({ sunTimes, notableSkyEvent, auroraActivity }: { sunTimes: { sunrise: number; sunset: number } | null; notableSkyEvent: NotableSkyEvent | null; auroraActivity: AuroraActivity | null }) {
  const formatTime = (timestamp: number) => new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
  const notableLabel = notableSkyEvent ? `${notableSkyEvent.title} · ${notableSkyEvent.date.toLocaleDateString([], { month: "short", day: "numeric" })}` : "No major sky events today";
  const notableDetail = notableSkyEvent?.detail ?? "The sky is quiet for now";
  const auroraLabel = auroraActivity ? `Aurora: ${auroraActivityLabel(auroraActivity.probability)} · ${auroraActivity.probability}% near you` : "Aurora activity loading…";
  return <div className="weather-sky-details mt-4 grid gap-2 border-t border-white/20 pt-3 text-white/90 sm:grid-cols-2"><div className="grid grid-cols-2 gap-2"><div><p className="text-[10px] font-black uppercase tracking-wide text-white/60">Sunrise</p><p className="mt-0.5 text-sm font-black">{sunTimes ? formatTime(sunTimes.sunrise) : "—"}</p></div><div><p className="text-[10px] font-black uppercase tracking-wide text-white/60">Sunset</p><p className="mt-0.5 text-sm font-black">{sunTimes ? formatTime(sunTimes.sunset) : "—"}</p></div></div><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-white/60">Sky watch</p><p className="mt-0.5 break-words text-sm font-black leading-snug" title={notableLabel}>{notableLabel}</p><p className="break-words text-[10px] font-semibold leading-snug text-white/65" title={notableDetail}>{notableDetail}</p><p className="mt-1 break-words text-[10px] font-semibold leading-snug text-white/65" title={auroraLabel}>{auroraLabel}</p></div></div>;
}
