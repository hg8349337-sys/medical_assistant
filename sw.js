self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(winClients => {
            if (winClients.length > 0) return winClients[0].focus();
            return clients.openWindow('/');
        })
    );
});
