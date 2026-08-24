"use client";

import { useEffect, useMemo, useState } from "react";
import { Lottie } from "lottie-react";
import { AppIcon } from "@/components/home/shared-ui";
import { weatherAnimation, weatherLabel, type Weather, type WeatherForecast, type WeatherForecastDay } from "@/features/home/model";

type WeatherForecastOverlayProps = {
  weather: Weather | null;
  forecast: WeatherForecast | null;
  onClose: () => void;
};

type ForecastView = "today" | "week";

export function WeatherForecastOverlay({ weather, forecast, onClose }: WeatherForecastOverlayProps) {
  const [view, setView] = useState<ForecastView>("today");
  const [currentTime] = useState(() => Date.now() / 1000);
  const today = forecast?.days[0] ?? null;
  const nextHours = useMemo(() => {
    return (forecast?.hours ?? []).filter((hour) => hour.time >= currentTime - 60 * 60).slice(0, 12);
  }, [currentTime, forecast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="weather-forecast-title" className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#242435]">
      <div className="max-h-[min(760px,calc(100dvh-1.5rem))] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">LOCAL WEATHER</p>
            <h2 id="weather-forecast-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Forecast for {weather?.location ?? "your area"}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Plan the next few hours or peek at the week ahead.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close weather forecast" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-300 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-white/10" role="tablist" aria-label="Forecast range">
          {(["today", "week"] as const).map((option) => <button key={option} type="button" role="tab" aria-selected={view === option} onClick={() => setView(option)} className={`rounded-xl px-3 py-2.5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${view === option ? "bg-white text-sky-700 shadow-sm dark:bg-white/15 dark:text-sky-200" : "text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"}`}>{option === "today" ? "Today" : "7 days"}</button>)}
        </div>

        {!forecast ? <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center dark:bg-white/5"><p className="font-black text-slate-700 dark:text-white">Forecast unavailable</p><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Allow location access and try again to load the extended forecast.</p></div> : view === "today" ? <TodayForecast weather={weather} today={today} hours={nextHours} /> : <WeekForecast days={forecast.days} />}
      </div>
    </section>
  </div>;
}

function TodayForecast({ weather, today, hours }: { weather: Weather | null; today: WeatherForecastDay | null; hours: WeatherForecast["hours"] }) {
  return <div className="mt-6">
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-sky-50 p-4 dark:bg-sky-400/10">
      <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">Today</p><p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-bold text-slate-600 dark:text-slate-200">{weather?.summary ?? "Current conditions unavailable"}</p></div>
      <div className="text-right text-sm font-bold text-slate-600 dark:text-slate-200"><p>High <span className="text-slate-900 dark:text-white">{today ? `${today.high}°` : "—"}</span></p><p className="mt-1">Low <span className="text-slate-900 dark:text-white">{today ? `${today.low}°` : "—"}</span></p><p className="mt-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{today ? `${today.precipitationProbability}% chance of rain` : "—"}</p></div>
    </div>
    <p className="mt-6 text-xs font-black uppercase tracking-wide text-slate-400">Next 12 hours</p>
    {hours.length ? <div className="mt-2 flex gap-2 overflow-x-auto pb-2">{hours.map((hour) => <div key={hour.time} className="min-w-20 rounded-2xl bg-slate-50 px-3 py-3 text-center dark:bg-white/5"><p className="text-xs font-black text-slate-500 dark:text-slate-300">{formatHour(hour.time)}</p><WeatherGlyph code={hour.code} isDay={today ? hour.time * 1000 >= today.sunrise && hour.time * 1000 < today.sunset : true} label={weatherLabel(hour.code)} className="mx-auto mt-2 size-9" /><p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{Math.round(hour.temperature)}°</p><p className="mt-1 text-[10px] font-bold text-sky-600 dark:text-sky-300">{hour.precipitationProbability}%</p></div>)}</div> : <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-white/5 dark:text-slate-300">Hourly details are not available right now.</p>}
    <p className="mt-4 text-xs font-medium text-slate-400">Rain percentages show the chance of precipitation.</p>
  </div>;
}

function WeekForecast({ days }: { days: WeatherForecast["days"] }) {
  return <div className="mt-6"><p className="text-xs font-black uppercase tracking-wide text-slate-400">7-day forecast</p><div className="mt-2 space-y-2">{days.map((day, index) => <div key={day.date} className={`grid grid-cols-[minmax(4.5rem,0.7fr)_2.5rem_minmax(5.5rem,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3 ${index === 0 ? "bg-sky-50 dark:bg-sky-400/10" : "bg-slate-50 dark:bg-white/5"}`}><div><p className="font-black text-slate-900 dark:text-white">{index === 0 ? "Today" : formatWeekday(day.date)}</p><p className="text-xs font-semibold text-slate-400">{formatShortDate(day.date)}</p></div><WeatherGlyph code={day.code} label={day.summary} className="size-9" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{day.summary}</p><p className="text-xs font-semibold text-sky-600 dark:text-sky-300">{day.precipitationProbability}% chance of rain</p></div><p className="text-right text-sm font-black text-slate-900 dark:text-white"><span>{day.high}°</span><span className="ml-2 text-slate-400">{day.low}°</span></p></div>)}</div></div>;
}

function WeatherGlyph({ code, isDay = true, label, className }: { code: number; isDay?: boolean; label: string; className: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const fallback = code >= 95 ? "⛈️" : code >= 71 && code <= 77 ? "❄️" : code >= 45 && code <= 67 ? "🌧️" : code === 3 ? "☁️" : isDay ? "☀️" : "🌙";
  return reduceMotion ? <span className={`${className} grid place-items-center text-2xl leading-none`} role="img" aria-label={label}>{fallback}</span> : <Lottie src={weatherAnimation(code, isDay)} autoplay loop className={className} aria-label={label} />;
}

function formatHour(timestamp: number) {
  return new Intl.DateTimeFormat([], { hour: "numeric" }).format(new Date(timestamp * 1000));
}

function formatWeekday(timestamp: number) {
  return new Intl.DateTimeFormat([], { weekday: "short" }).format(new Date(timestamp * 1000));
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(new Date(timestamp * 1000));
}
