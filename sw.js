self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // إغلاق الإشعار عند الضغط عليه
    if (event.action === 'stop') {
        // منطق إيقاف الصوت يمكن وضعه هنا أو العودة للتطبيق
    }
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            if (windowClients.length > 0) {
                windowClients[0].focus();
            } else {
                clients.openWindow('/');
            }
        })
    );
});
