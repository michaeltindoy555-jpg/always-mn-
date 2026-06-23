importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDdfTvPkKW2HoIS2BXu1QGxpu1-36hUWSI",
  authDomain: "always-mn.firebaseapp.com",
  projectId: "always-mn",
  storageBucket: "always-mn.firebasestorage.app",
  messagingSenderId: "95067850862",
  appId: "1:95067850862:web:3f1d5ce41e33bfbe86be7f",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}
  self.registration.showNotification(title || '💗 Always MN', {
    body: body || 'You have a new message',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow('/')
    })
  )
})