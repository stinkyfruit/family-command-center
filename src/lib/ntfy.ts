export type NtfyPublishInput = {
  topic: string;
  title: string;
  message: string;
  priority?: "min" | "low" | "default" | "high" | "max";
  tags?: string;
};

function ntfyBaseUrl() {
  return (process.env.NTFY_BASE_URL ?? "https://ntfy.sh").replace(/\/$/, "");
}

export async function publishNtfy(input: NtfyPublishInput) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    Title: input.title,
    Priority: input.priority ?? "default",
    Tags: input.tags ?? "loudspeaker",
    // Mood notifications can contain sensitive family information.
    Cache: "no",
  });
  const accessToken = process.env.NTFY_ACCESS_TOKEN;
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${ntfyBaseUrl()}/${encodeURIComponent(input.topic)}`, {
    method: "POST",
    headers,
    body: input.message,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ntfy returned ${response.status}.`);
}
