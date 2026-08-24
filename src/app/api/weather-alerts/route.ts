export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "A valid latitude and longitude are required." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": process.env.FAMILY_HOME_NWS_USER_AGENT ?? "Family Command Center weather alerts (local family dashboard)",
      },
      cache: "no-store",
    });

    if (response.status === 404) return Response.json({ available: false, features: [] });
    if (!response.ok) return Response.json({ error: "The weather alert service is unavailable." }, { status: 502 });

    const payload = await response.json() as { features?: unknown };
    return Response.json({ available: true, features: Array.isArray(payload.features) ? payload.features : [] });
  } catch {
    return Response.json({ error: "The weather alert service is unavailable." }, { status: 502 });
  }
}
