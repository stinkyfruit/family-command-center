type NwsFeature = {
  id?: unknown;
  properties?: {
    stationIdentifier?: unknown;
    name?: unknown;
  };
};

type NwsMeasurement = { value?: unknown; unitCode?: unknown };

type NwsObservationProperties = {
  temperature?: NwsMeasurement;
  windSpeed?: NwsMeasurement;
  windGust?: NwsMeasurement;
  textDescription?: unknown;
  timestamp?: unknown;
};

const nwsHeaders = {
  Accept: "application/geo+json",
  "User-Agent": process.env.FAMILY_HOME_NWS_USER_AGENT ?? "Family Command Center weather observation (local family dashboard)",
};

function measurementValue(measurement: NwsMeasurement | undefined) {
  return typeof measurement?.value === "number" && Number.isFinite(measurement.value) ? measurement.value : null;
}

function celsiusToFahrenheit(value: number | null) {
  return value === null ? null : value * 9 / 5 + 32;
}

function windToMph(measurement: NwsMeasurement | undefined) {
  const value = measurementValue(measurement);
  if (value === null) return null;
  const unitCode = typeof measurement?.unitCode === "string" ? measurement.unitCode : "";
  if (unitCode.includes("km_h")) return value * 0.621371;
  if (unitCode.includes("m_s")) return value * 2.236936;
  return value;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: nwsHeaders, cache: "no-store" });
  if (!response.ok) throw new Error(`NWS request failed with ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ error: "A valid latitude and longitude are required." }, { status: 400 });
  }

  try {
    const point = await fetchJson(`https://api.weather.gov/points/${latitude},${longitude}`);
    const pointProperties = point.properties as { observationStations?: unknown } | undefined;
    if (typeof pointProperties?.observationStations !== "string") return Response.json({ available: false });

    const stations = await fetchJson(pointProperties.observationStations);
    const stationFeature = Array.isArray(stations.features) ? stations.features.find((feature): feature is NwsFeature => {
      if (!feature || typeof feature !== "object") return false;
      const candidate = feature as NwsFeature;
      return typeof candidate.id === "string";
    }) : null;
    if (!stationFeature || typeof stationFeature.id !== "string") return Response.json({ available: false });

    const observation = await fetchJson(`${stationFeature.id}/observations/latest`);
    const properties = observation.properties as NwsObservationProperties | undefined;
    const timestamp = typeof properties?.timestamp === "string" ? properties.timestamp : null;
    const timestampMs = timestamp ? Date.parse(timestamp) : NaN;
    if (!Number.isFinite(timestampMs) || Date.now() - timestampMs > 90 * 60 * 1000) return Response.json({ available: false, reason: "stale" });

    const stationName = typeof stationFeature.properties?.name === "string"
      ? stationFeature.properties.name
      : typeof stationFeature.properties?.stationIdentifier === "string" ? stationFeature.properties.stationIdentifier : null;
    return Response.json({
      available: true,
      stationName,
      textDescription: typeof properties?.textDescription === "string" ? properties.textDescription : null,
      temperatureF: celsiusToFahrenheit(measurementValue(properties?.temperature)),
      windSpeedMph: windToMph(properties?.windSpeed),
      windGustsMph: windToMph(properties?.windGust),
      timestamp,
    });
  } catch {
    return Response.json({ available: false });
  }
}
