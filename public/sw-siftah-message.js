/* Siftah Message — privacy-safe push (no message body). */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Siftah Message", body: "New message received" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        data = {
          title: typeof parsed.title === "string" ? parsed.title : data.title,
          body: typeof parsed.body === "string" ? parsed.body : data.body,
        };
      }
    }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: "siftah-message-private",
      renotify: true,
      data: { url: "/siftah-message" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/siftah-message";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
