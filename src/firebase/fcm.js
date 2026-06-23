// src/firebase/fcm.js
// Handles FCM token registration and sending push notifications via Firebase

import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { app, db } from './config' // adjust path to your firebase config

// ⚠️ Replace with your VAPID key from Firebase Console
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Key pair
const VAPID_KEY = 'BGrJrtJ520zFTKFH0fwGUmSHChOU8kle74zmqJNhSLo6JKPW0Ex7eoRE-3fYlBVtpZOOHV-evv1co3TCyMydA8Q'

let messaging = null

function getMessagingInstance() {
  if (!messaging) messaging = getMessaging(app)
  return messaging
}

// Request permission + get FCM token, save it to Firestore under the user's doc
export async function registerFCMToken(userId) {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return null
    }
    const msg = getMessagingInstance()
    const token = await getToken(msg, { vapidKey: VAPID_KEY })
    if (token) {
      // Save token to Firestore so the partner can send to it
      await setDoc(doc(db, 'fcmTokens', userId), { token, updatedAt: Date.now() }, { merge: true })
      console.log('FCM token registered for', userId)
    }
    return token
  } catch (err) {
    console.error('FCM registration error:', err)
    return null
  }
}

// Get partner's FCM token from Firestore
export async function getPartnerToken(partnerId) {
  try {
    const snap = await getDoc(doc(db, 'fcmTokens', partnerId))
    return snap.exists() ? snap.data().token : null
  } catch {
    return null
  }
}

// Listen for foreground messages (app is open)
// Returns an unsubscribe function
export function onForegroundMessage(callback) {
  try {
    const msg = getMessagingInstance()
    return onMessage(msg, callback)
  } catch {
    return () => {}
  }
}

// Send a push notification to the partner via your backend or Firebase Cloud Functions.
// Since Vite apps can't use the Admin SDK on the client, we call a lightweight
// Cloudflare Worker / Cloud Function endpoint you deploy separately.
// See PUSH_SETUP.md for the full setup. For now this is a placeholder.
export async function sendPushNotification({ toToken, title, body }) {
  if (!toToken) return
  try {
    // Replace with your own Cloud Function or Cloudflare Worker URL
    // See PUSH_SETUP.md for how to deploy this for free
   await fetch('https://cloudflareworkerfcmpushsenderdeployforfreea.michaeltindoy555.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: toToken, title, body }),
    })
  } catch (err) {
    console.warn('Push send failed (non-critical):', err)
  }
}
