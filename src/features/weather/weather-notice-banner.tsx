"use client";

import { AppIcon } from "@/components/home/shared-ui";
import {
  moonPhase,
  notableSkyEventForDate,
  type AuroraActivity,
  type CometCloseApproach,
  type Weather,
  type WeatherAlert,
  type WeatherForecast,
  type WeatherInsights,
} from "@/features/home/model";

type WeatherNoticeBannerProps = {
  weather: Weather | null;
  forecast: WeatherForecast | null;
  insights: WeatherInsights | null;
  auroraActivity: AuroraActivity | null;
  cometCloseApproach: CometCloseApproach | null;
  onOpenForecast: () => void;
};

type Notice = {
  id: string;
  title: string;
  detail: string;
  tone: "rose" | "amber" | "orange" | "violet" | "sky";
  icon: "warning" | "sun" | "moon" | "info";
  href?: string | null;
};

function alertPriority(alert: WeatherAlert) {
  const severity = alert.severity.toLowerCase();
  if (severity === "extreme") return 4;
  if (severity === "severe") return 3;
  if (severity === "moderate") return 2;
  if (severity === "minor") return 1;
  return 0;
}

function pollenValue(insights: WeatherInsights | null) {
  return (insights?.pollen?.days[0]?.types ?? [])
    .map((type) => type.value)
    .filter((value): value is number => typeof value === "number")
    .sort((first, second) => second - first)[0] ?? null;
}

function buildNotices({ weather, forecast, insights, auroraActivity, cometCloseApproach }: Omit<WeatherNoticeBannerProps, "onOpenForecast">) {
  const notices: Notice[] = [];
  const alerts = [...(insights?.alerts ?? [])].sort((first, second) => alertPriority(second) - alertPriority(first));

  alerts.slice(0, 3).forEach((alert) => {
    const severe = alertPriority(alert) >= 3;
    notices.push({
      id: `alert-${alert.id}`,
      title: alert.event,
      detail: alert.headline,
      tone: severe ? "rose" : "amber",
      icon: "warning",
      href: alert.url,
    });
  });

  const nextHours = forecast?.hours.filter((hour) => hour.time >= Date.now() / 1000 - 60 * 60).slice(0, 12) ?? [];
  const currentThunderstorms = weather?.code !== undefined && weather.code >= 95;
  const thunderstormsSoon = currentThunderstorms || nextHours.some((hour) => hour.code >= 95);
  if (thunderstormsSoon && !alerts.some((alert) => /thunderstorm|lightning/i.test(`${alert.event} ${alert.headline}`))) {
    notices.push({ id: "thunderstorms", title: "Thunderstorms in the forecast", detail: currentThunderstorms ? "Storms are happening now." : "Check the forecast before outdoor plans.", tone: "violet", icon: "warning" });
  }

  const today = forecast?.days[0];
  if (today && (today.high >= 100 || today.low <= 10)) {
    notices.push({ id: "extreme-temperature", title: "Extreme temperatures today", detail: `High ${today.high}° · Low ${today.low}°`, tone: "orange", icon: "sun" });
  }

  const aqi = insights?.airQuality?.aqi;
  if (typeof aqi === "number" && aqi > 100) {
    notices.push({ id: "air-quality", title: "Air quality needs attention", detail: `${Math.round(aqi)} AQI · Consider easier outdoor plans`, tone: aqi > 150 ? "rose" : "orange", icon: "warning" });
  }

  const uv = insights?.uvIndex;
  if (typeof uv === "number" && uv >= 8) {
    notices.push({ id: "uv", title: "Very high UV today", detail: `UV index ${Math.round(uv)} · Plan shade and sun protection`, tone: "orange", icon: "sun" });
  }

  const pollen = pollenValue(insights);
  if (pollen !== null && pollen >= 4) {
    notices.push({ id: "pollen", title: "High pollen today", detail: "Keep allergy plans handy for outdoor time", tone: "amber", icon: "info" });
  }

  if (auroraActivity && auroraActivity.probability >= 50) {
    notices.push({ id: "aurora", title: "Aurora watch tonight", detail: `${auroraActivity.probability}% activity near you`, tone: "violet", icon: "moon" });
  }

  const date = new Date();
  const skyEvent = notableSkyEventForDate(date, cometCloseApproach);
  const phase = moonPhase(date);
  if (skyEvent) notices.push({ id: "sky-event", title: skyEvent.title, detail: skyEvent.detail, tone: "violet", icon: "moon" });
  if (!skyEvent && (phase.key === "full" || phase.key === "new")) {
    notices.push({ id: "moon-phase", title: `${phase.name} tonight`, detail: `${phase.illumination}% illuminated`, tone: "violet", icon: "moon" });
  }

  return notices;
}

function toneClasses(tone: Notice["tone"]) {
  return {
    rose: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-100",
    amber: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100",
    orange: "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-100",
    violet: "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100",
    sky: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-100",
  }[tone];
}

export function WeatherNoticeBanner({ weather, forecast, insights, auroraActivity, cometCloseApproach, onOpenForecast }: WeatherNoticeBannerProps) {
  const notices = buildNotices({ weather, forecast, insights, auroraActivity, cometCloseApproach });
  if (!notices.length) return null;

  const primary = notices[0];
  return <section aria-labelledby="weather-notice-title" className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border px-3 py-2 shadow-sm sm:gap-3 sm:px-4 ${toneClasses(primary.tone)}`}>
    <h2 id="weather-notice-title" className="sr-only">Weather and sky notices</h2>
    <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-white/70 dark:bg-white/10"><AppIcon name={primary.icon} className="size-4" /></span>
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs sm:text-sm">
      <span className="shrink-0 font-black uppercase tracking-wide opacity-65">Family watch</span>
      <span aria-hidden="true" className="opacity-45">·</span>
      {notices.map((notice, index) => <span key={notice.id} className="shrink-0 font-bold" title={`${notice.title}: ${notice.detail}`}>
        {index > 0 && <span aria-hidden="true" className="mr-2 opacity-45">·</span>}
        {notice.title}{index === 0 && <span className="ml-1 font-semibold opacity-70">— {notice.detail}</span>}
      </span>)}
    </div>
    <button type="button" onClick={onOpenForecast} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-xs font-black shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:bg-white/10 dark:hover:bg-white/15">Details <AppIcon name="chevronRight" className="size-3.5" /></button>
  </section>;
}
