"use client";

import { useEffect, useMemo, useState } from "react";
import { AccessibleLottie } from "@/components/home/accessible-lottie";
import { AppIcon } from "@/components/home/shared-ui";
import { weatherAnimation, weatherLabel, type Weather, type WeatherAlert, type WeatherForecast, type WeatherForecastDay, type WeatherInsights, type WeatherPollenType } from "@/features/home/model";

type WeatherForecastOverlayProps = {
  weather: Weather | null;
  forecast: WeatherForecast | null;
  insights: WeatherInsights | null;
  onClose: () => void;
};

type ForecastView = "today" | "week";

export function WeatherForecastOverlay({ weather, forecast, insights, onClose }: WeatherForecastOverlayProps) {
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

        {!forecast ? <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center dark:bg-white/5"><p className="font-black text-slate-700 dark:text-white">Forecast unavailable</p><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Allow location access and try again to load the extended forecast.</p></div> : view === "today" ? <TodayForecast weather={weather} today={today} hours={nextHours} insights={insights} /> : <WeekForecast days={forecast.days} />}
      </div>
    </section>
  </div>;
}

function TodayForecast({ weather, today, hours, insights }: { weather: Weather | null; today: WeatherForecastDay | null; hours: WeatherForecast["hours"]; insights: WeatherInsights | null }) {
  return <div className="mt-6">
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-sky-50 p-4 dark:bg-sky-400/10">
      <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">Today</p><p className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-bold text-slate-600 dark:text-slate-200">{weather?.summary ?? "Current conditions unavailable"}</p></div>
      <div className="text-right text-sm font-bold text-slate-600 dark:text-slate-200"><p>High <span className="text-slate-900 dark:text-white">{today ? `${today.high}°` : "—"}</span></p><p className="mt-1">Low <span className="text-slate-900 dark:text-white">{today ? `${today.low}°` : "—"}</span></p><p className="mt-1 text-xs font-semibold text-sky-700 dark:text-sky-200">{today ? `${today.precipitationProbability}% chance of rain` : "—"}</p></div>
    </div>
    <p className="mt-6 text-xs font-black uppercase tracking-wide text-slate-400">Next 12 hours</p>
    {hours.length ? <div className="mt-2 flex gap-2 overflow-x-auto pb-2">{hours.map((hour) => <div key={hour.time} className="min-w-20 rounded-2xl bg-slate-50 px-3 py-3 text-center dark:bg-white/5"><p className="text-xs font-black text-slate-500 dark:text-slate-300">{formatHour(hour.time)}</p><WeatherGlyph code={hour.code} isDay={today ? hour.time * 1000 >= today.sunrise && hour.time * 1000 < today.sunset : true} label={weatherLabel(hour.code)} className="mx-auto mt-2 size-9" /><p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{Math.round(hour.temperature)}°</p><p className="mt-1 text-[10px] font-bold text-sky-600 dark:text-sky-300">{hour.precipitationProbability}%</p></div>)}</div> : <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500 dark:bg-white/5 dark:text-slate-300">Hourly details are not available right now.</p>}
    <p className="mt-4 text-xs font-medium text-slate-400">Rain percentages show the chance of precipitation.</p>
    <OutdoorConditions insights={insights} />
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
  return reduceMotion ? <span className={`${className} grid place-items-center text-2xl leading-none`} role="img" aria-label={label}>{fallback}</span> : <AccessibleLottie src={weatherAnimation(code, isDay)} label={label} wrapperClassName={className} className="size-full" autoplay controls={false} />;
}

function OutdoorConditions({ insights }: { insights: WeatherInsights | null }) {
  const aqi = insights?.airQuality?.aqi;
  const uv = insights?.uvIndex;
  const pollen = pollenSummary(insights?.pollen ?? null);
  const pollenProvider = insights?.pollen;
  const alertCount = insights?.alerts.length ?? 0;
  return <section className="mt-7 border-t border-slate-100 pt-5 dark:border-white/10" aria-labelledby="outdoor-conditions-title">
    <div className="flex items-center justify-between gap-3"><div><p id="outdoor-conditions-title" className="text-xs font-black uppercase tracking-wide text-slate-400">Outdoor conditions</p><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Helpful signals for plans, play, and allergies.</p></div>{alertCount > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-black text-rose-700 dark:bg-rose-400/15 dark:text-rose-200">{alertCount} alert{alertCount === 1 ? "" : "s"}</span>}</div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <ConditionTile label="Air quality" value={aqi === null || aqi === undefined ? "—" : `${Math.round(aqi)} AQI`} detail={aqi === null || aqi === undefined ? "Unavailable" : airQualityLabel(aqi)} tone={aqi === null || aqi === undefined ? "slate" : airQualityTone(aqi)} guidance={airQualityGuidance(aqi)} note={aqi !== null && aqi !== undefined && insights?.airQuality?.pm2_5 !== null ? `PM2.5: ${insights?.airQuality?.pm2_5 ?? "—"} μg/m³ · Ozone: ${insights?.airQuality?.ozone ?? "—"} μg/m³` : undefined} />
      <ConditionTile label="UV index" value={uv === null || uv === undefined ? "—" : String(Math.round(uv))} detail={uv === null || uv === undefined ? "Unavailable" : uvLabel(uv)} tone={uv === null || uv === undefined ? "slate" : uvTone(uv)} guidance={uvGuidance(uv)} />
      <ConditionTile label="Pollen" value={pollen ? `${pollen.value}/5` : pollenProvider?.configured ? "—" : "Setup needed"} detail={pollen ? `${pollen.name} · ${pollen.category ?? "Pollen index"}` : pollenProvider?.configured ? "No local index" : "Add pollen provider key"} tone={pollen ? pollenTone(pollen.value) : "slate"} guidance={pollenGuidance(pollen, pollenProvider ?? null)} note={pollen?.indexDescription ?? pollenProvider?.message} source={pollenProvider?.available ? "Pollen data by Google" : undefined} />
      <ConditionTile label="Severe weather" value={alertCount > 0 ? `${alertCount} active` : "None active"} detail={!insights ? "Unavailable" : insights.alertsAvailable ? "NWS local alerts" : "Not available here"} tone={alertCount > 0 ? "rose" : "emerald"} guidance={alertGuidance(alertCount, insights?.alertsAvailable === true)} />
    </div>
    {alertCount > 0 ? <div className="mt-3 space-y-2">{insights!.alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)}</div> : insights && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-300">{insights.alertsAvailable ? "No active watches, warnings, or advisories for this location." : "Official severe-weather alerts are only available for supported NWS locations."}</p>}
  </section>;
}

function ConditionTile({ label, value, detail, tone, guidance, note, source }: { label: string; value: string; detail: string; tone: "slate" | "emerald" | "amber" | "orange" | "rose"; guidance: string[]; note?: string; source?: string }) {
  const toneClass = { slate: "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-200", emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200", amber: "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200", orange: "bg-orange-50 text-orange-800 dark:bg-orange-400/10 dark:text-orange-200", rose: "bg-rose-50 text-rose-800 dark:bg-rose-400/10 dark:text-rose-200" }[tone];
  return <details className={`group rounded-2xl px-3.5 py-3 ${toneClass}`}><summary className="cursor-pointer list-none"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wide opacity-65">{label}</p><p className="mt-1 text-lg font-black">{value}</p><p className="mt-0.5 text-xs font-bold opacity-75">{detail}</p></div><AppIcon name="chevronDown" className="mt-1 size-4 shrink-0 opacity-60 transition-transform group-open:rotate-180" /></div></summary><div className="mt-3 border-t border-current/10 pt-3"><p className="text-[10px] font-black uppercase tracking-wide opacity-65">What to do</p><ul className="mt-1 space-y-1 text-xs font-semibold leading-relaxed">{guidance.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">•</span><span>{item}</span></li>)}</ul>{note && <p className="mt-3 text-xs font-semibold leading-relaxed opacity-75">{note}</p>}{source && <p className="mt-3 text-[10px] font-black opacity-60">{source}</p>}</div></details>;
}

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const tone = alert.severity.toLowerCase() === "extreme" || alert.severity.toLowerCase() === "severe" ? "border-rose-200 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-400/10" : "border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/10";
  return <details className={`rounded-2xl border p-3 ${tone}`}><summary className="cursor-pointer list-none"><div className="flex items-start gap-3"><AppIcon name="warning" className="mt-0.5 size-5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wide opacity-70">{alert.event}</p><p className="mt-0.5 text-sm font-black">{alert.headline}</p><p className="mt-1 text-xs font-semibold opacity-70">{alert.severity} · {alert.urgency}</p></div><AppIcon name="chevronDown" className="mt-0.5 size-4 shrink-0 opacity-60" /></div></summary><div className="mt-3 space-y-2 border-t border-current/10 pt-3 text-xs font-medium leading-relaxed"><p className="whitespace-pre-line">{alert.description}</p>{alert.instruction && <p><span className="font-black">What to do: </span>{alert.instruction}</p>}{alert.expires && <p className="opacity-70">Expires {formatDateTime(alert.expires)}</p>}{alert.url && <a href={alert.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black underline underline-offset-2">Open official alert <AppIcon name="chevronRight" className="size-3.5" /></a>}</div></details>;
}

function pollenSummary(pollen: WeatherInsights["pollen"]) {
  const types = pollen?.days[0]?.types ?? [];
  if (!pollen?.available || !types.length) return null;
  const entries = types.filter((type): type is WeatherPollenType & { value: number } => typeof type.value === "number");
  if (!entries.length) return null;
  return entries.sort((first, second) => second.value - first.value)[0];
}

function airQualityGuidance(aqi: number | null | undefined) {
  if (aqi === null || aqi === undefined) return ["Air-quality guidance is unavailable right now."];
  if (aqi <= 50) return ["Normal outdoor activities are reasonable for most people."];
  if (aqi <= 100) return ["Most people can continue normal activities.", "If anyone is sensitive to air pollution, consider easier or shorter outdoor activity."];
  if (aqi <= 150) return ["Sensitive family members should consider reducing prolonged or strenuous outdoor activity.", "Watch for symptoms and follow any personal respiratory care plan."];
  if (aqi <= 200) return ["Choose indoor activities or reschedule strenuous outdoor plans when practical.", "Keep outdoor time shorter, especially for children and sensitive family members."];
  return ["Avoid prolonged or strenuous outdoor activity.", "Choose indoor plans and follow local air-quality guidance."];
}

function uvGuidance(uv: number | null | undefined) {
  if (uv === null || uv === undefined) return ["UV guidance is unavailable right now."];
  if (uv <= 2) return ["Normal plans are reasonable for most people.", "Use sunscreen for extended time outdoors, especially for children."];
  if (uv <= 5) return ["Use shade during the brightest part of the day.", "Wear a hat and sunglasses, and generously apply broad-spectrum sunscreen to exposed skin."];
  if (uv <= 7) return ["Plan shade breaks and avoid extended midday exposure.", "Cover up with lightweight clothing, wear a hat and sunglasses, and use sunscreen."];
  if (uv <= 10) return ["Try to move outdoor plans away from midday when possible.", "Seek shade, cover up, wear a hat and sunglasses, and generously apply sunscreen."];
  return ["Minimize midday sun exposure.", "Use shade, protective clothing, a wide-brimmed hat, sunglasses, and sunscreen."];
}

function pollenGuidance(pollen: ReturnType<typeof pollenSummary>, forecast: WeatherInsights["pollen"]) {
  if (!forecast?.configured) return ["Add GOOGLE_POLLEN_API_KEY to enable local pollen forecasts."];
  if (!forecast.available || !pollen) return ["A pollen index is not available for this location or season.", "If allergies are a concern, check a local health or allergy source before making outdoor plans."];
  if (pollen.value <= 1) return ["Pollen levels are low; normal outdoor plans are reasonable."];
  if (pollen.value <= 3) return ["If pollen bothers anyone, consider sunglasses and changing clothes after extended outdoor time.", "Keep windows closed if outdoor pollen is triggering symptoms."];
  return ["Consider shorter outdoor time and lower-exertion plans.", "Change clothes or shower after outdoor time, and keep windows closed when pollen is highest.", "Follow each person’s existing allergy plan if they have one."];
}

function alertGuidance(alertCount: number, available: boolean) {
  if (!available) return ["Official severe-weather alerts are unavailable for this location."];
  if (alertCount > 0) return ["Open the alert below for the official instructions and expiration time.", "Follow local emergency-management guidance if conditions worsen."];
  return ["No active watches, warnings, or advisories were found for this location.", "Recheck before outdoor plans if the weather is changing quickly."];
}

function airQualityLabel(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}

function airQualityTone(aqi: number): "emerald" | "amber" | "orange" | "rose" {
  if (aqi <= 50) return "emerald";
  if (aqi <= 100) return "amber";
  if (aqi <= 150) return "orange";
  return "rose";
}

function uvLabel(uv: number) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very high";
  return "Extreme";
}

function uvTone(uv: number): "emerald" | "amber" | "orange" | "rose" {
  if (uv <= 2) return "emerald";
  if (uv <= 5) return "amber";
  if (uv <= 7) return "orange";
  return "rose";
}

function pollenTone(value: number): "emerald" | "amber" | "orange" | "rose" {
  if (value < 10) return "emerald";
  if (value < 100) return "amber";
  if (value < 1000) return "orange";
  return "rose";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat([], { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
