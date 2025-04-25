/* ---- v1 ---- */
const CACHE_NAME = "audiobook-cache-v1";
const OFFLINE_URLS = [
  "./audiobook.html",
  "./voice04.mp3",
  "./cover04.png",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

/* インストール時：静的アセットをキャッシュ */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

/* 有効化：旧キャッシュを削除 */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* fetch ハンドラ：キャッシュ優先 → ネット → 失敗時はオフライン HTML へフォールバック */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(resp =>
      resp ||
      fetch(event.request).then(netResp => {
        /* 動的リソースもキャッシュ（任意） */
        if (netResp.ok) {
          const responseClone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return netResp;
      }).catch(() => caches.match("./audiobook.html"))
    )
  );
});

/* --- 〔オプション〕Web Push 受信 --- */
self.addEventListener("push", event => {
  const data = event.data?.json() || { title: "新着オーディオ", body: "続きが公開されました！" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",
      tag: "audiobook-update"
    })
  );
});

/* 通知クリック時の挙動 */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientsArr => {
      const url = "./audiobook.html";
      /* 既存タブがあればフォーカス。なければ新規 */
      for (const c of clientsArr) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
