type GooglePollenType = {
  code?: string;
  displayName?: string;
  inSeason?: boolean;
  indexInfo?: { value?: number; category?: string; indexDescription?: string };
};

type GooglePollenDay = {
  date?: { year?: number; month?: number; day?: number };
  pollenTypeInfo?: GooglePollenType[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));
  const apiKey = process.env.GOOGLE_POLLEN_API_KEY;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "A valid latitude and longitude are required." }, { status: 400 });
  }

  if (!apiKey) return Response.json({ available: false, configured: false, provider: "Google Pollen API", message: "Pollen provider is not configured.", days: [] });

  try {
    const pollenUrl = new URL("https://pollen.googleapis.com/v1/forecast:lookup");
    pollenUrl.searchParams.set("key", apiKey);
    pollenUrl.searchParams.set("location.latitude", String(latitude));
    pollenUrl.searchParams.set("location.longitude", String(longitude));
    pollenUrl.searchParams.set("days", "5");
    pollenUrl.searchParams.set("languageCode", "en");
    pollenUrl.searchParams.set("plantsDescription", "false");
    const response = await fetch(pollenUrl, { cache: "no-store" });
    if (!response.ok) return Response.json({ error: "The pollen service is unavailable." }, { status: 502 });

    const payload = await response.json() as { dailyInfo?: GooglePollenDay[] };
    const days = (payload.dailyInfo ?? []).flatMap((day) => {
      const date = day.date;
      if (!date?.year || !date.month || !date.day) return [];
      return [{
        date: `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
        types: (day.pollenTypeInfo ?? []).map((type) => ({
          code: type.code ?? "UNKNOWN",
          name: type.displayName ?? type.code ?? "Pollen",
          inSeason: type.inSeason === true,
          value: typeof type.indexInfo?.value === "number" ? type.indexInfo.value : null,
          category: type.indexInfo?.category ?? null,
          description: null,
          indexDescription: type.indexInfo?.indexDescription ?? null,
        })),
      }];
    });
    return Response.json({ available: true, configured: true, provider: "Google Pollen API", days });
  } catch {
    return Response.json({ error: "The pollen service is unavailable." }, { status: 502 });
  }
}
