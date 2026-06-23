import { db } from './config'
import {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs, deleteDoc,
  onSnapshot, serverTimestamp, orderBy, query,
} from 'firebase/firestore'

const DOC = 'always-mn'
const shared = () => doc(db, 'shared', DOC)

// ── Shared single-doc data (moods, milestones, annDate, ping, checkins, promises, moodHistory, bgPhoto, milestonePhotos) ──
export function subscribeShared(cb) {
  return onSnapshot(shared(), snap => cb(snap.exists() ? snap.data() : {}))
}
export async function updateShared(data) {
  const ref = shared()
  const snap = await getDoc(ref)
  if (snap.exists()) await updateDoc(ref, data)
  else await setDoc(ref, data)
}

// ── Journal ───────────────────────────────────────────────────────────────────
const journalCol = () => collection(db, 'shared', DOC, 'journal')
export function subscribeJournal(cb) {
  return onSnapshot(query(journalCol(), orderBy('createdAt', 'desc')), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
export async function addJournalEntry(entry) {
  await addDoc(journalCol(), { ...entry, createdAt: serverTimestamp() })
}
export async function deleteJournalEntry(id) {
  await deleteDoc(doc(db, 'shared', DOC, 'journal', id))
}
// NEW: update journal entry (used for emoji reactions)
export async function updateJournalEntry(id, data) {
  await updateDoc(doc(db, 'shared', DOC, 'journal', id), data)
}

// ── Letters ───────────────────────────────────────────────────────────────────
const lettersCol = () => collection(db, 'shared', DOC, 'letters')
export function subscribeLetters(cb) {
  return onSnapshot(query(lettersCol(), orderBy('createdAt', 'desc')), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
export async function addLetter(letter) {
  await addDoc(lettersCol(), { ...letter, createdAt: serverTimestamp() })
}

// ── Bucket list ───────────────────────────────────────────────────────────────
const bucketCol = () => collection(db, 'shared', DOC, 'bucket')
export function subscribeBucket(cb) {
  return onSnapshot(query(bucketCol(), orderBy('createdAt', 'asc')), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
export async function addBucketItem(item) {
  await addDoc(bucketCol(), { ...item, createdAt: serverTimestamp() })
}
export async function updateBucketItem(id, data) {
  await updateDoc(doc(db, 'shared', DOC, 'bucket', id), data)
}
export async function deleteBucketItem(id) {
  await deleteDoc(doc(db, 'shared', DOC, 'bucket', id))
}

// ── Q of Day answers ──────────────────────────────────────────────────────────
export async function saveQodAnswers(qIdx, ansM, ansN) {
  await setDoc(doc(db, 'shared', DOC, 'qod', String(qIdx)), { ansM, ansN, updatedAt: serverTimestamp() })
}
export async function getQodAnswers(qIdx) {
  const snap = await getDoc(doc(db, 'shared', DOC, 'qod', String(qIdx)))
  return snap.exists() ? snap.data() : { ansM: '', ansN: '' }
}

// ── Ping ──────────────────────────────────────────────────────────────────────
export async function sendPing(from) {
  const to = from === 'M' ? 'N' : 'M'
  await updateShared({ ping: { from, to, unread: true, sentAt: Date.now() } })
}

// ── Memory Album ──────────────────────────────────────────────────────────────
const memoriesCol = () => collection(db, 'shared', DOC, 'memories')
export function subscribeMemories(cb) {
  return onSnapshot(query(memoriesCol(), orderBy('createdAt', 'desc')), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
export async function addMemoryPhoto(data) {
  await addDoc(memoriesCol(), { ...data, createdAt: serverTimestamp() })
}
export async function deleteMemoryPhoto(id) {
  await deleteDoc(doc(db, 'shared', DOC, 'memories', id))
}

// ── Voice Messages ────────────────────────────────────────────────────────────
const voiceCol = () => collection(db, 'shared', DOC, 'voice')
export function subscribeVoiceMessages(cb) {
  return onSnapshot(query(voiceCol(), orderBy('sentAt', 'desc')), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}
export async function addVoiceMessage(data) {
  await addDoc(voiceCol(), data)
}
export async function markVoicePlayed(id) {
  await updateDoc(doc(db, 'shared', DOC, 'voice', id), { played: true })
}
