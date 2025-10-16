
self.addEventListener('push', event => {
  try {
    const data = event.data.json();
    console.log('Push received:', data);

    const title = data.title || 'Nuova Notifica';
    const options = {
      body: data.body || 'Hai un nuovo aggiornamento.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: {
        url: data.data?.url || '/',
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('Error processing push event:', error);
    // Fallback notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('Nuova Notifica', {
        body: 'Hai ricevuto un aggiornamento, ma non è stato possibile leggerne il contenuto.',
        icon: '/icon.svg',
        badge: '/icon.svg',
      })
    );
  }
});


self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
