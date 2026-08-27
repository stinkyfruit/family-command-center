/* Family Command Center Web Push service worker. */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "You have a new family update." };
  }

  const title = typeof data.title === "string" ? data.title : "Family Command Center";
  const options = {
    body: typeof data.body === "string" ? data.body : "You have a new family update.",
    icon: "/apple-icon?v=3",
    badge: "/notification-badge.png?v=1",
    tag: typeof data.tag === "string" ? data.tag : "family-command-center",
    data: { url: typeof data.url === "string" ? data.url : "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
