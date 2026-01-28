self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // يغلق الإشعار فوراً
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            if (windowClients.length > 0) {
                return windowClients[0].focus(); // يفتح التطبيق إذا كان مفتوحاً في الخلفية
            }
            return clients.openWindow('/'); // يفتح التطبيق من جديد
        })
    );
});
