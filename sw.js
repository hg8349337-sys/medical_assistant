// sw.js - Service Worker
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
        })
    );
});

self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || "تنبيه MedPulse", {
            body: data.body || "حان موعد الجرعة الآن",
            icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
            requireInteraction: true,
            vibrate: [300, 100, 300]
        })
    );
});
