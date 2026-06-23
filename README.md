# ALWAYS MN

A couples app built with React + Vite + Firebase.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your `.env` file
Copy `.env.example` to `.env` and fill in your Firebase credentials:
```bash
cp .env.example .env
```

Your `.env` should look like:
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Get these from: Firebase Console → Project Settings → Your apps → Web app config.

### 3. Firestore rules
In Firebase Console → Firestore → Rules, set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
(You can tighten this later once the app is working.)

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to Vercel
```bash
npm run build
```
Then push to GitHub and connect to Vercel. Add your `.env` variables in Vercel → Project Settings → Environment Variables.

## Features
- 🏠 Home — ping, quick mood, milestones, anniversary tracker
- 📖 Journal — shared entries synced in real-time
- 😊 Mood — both users' moods visible to each other
- 💌 Letters — love letters vault
- 🎯 Bucket list — shared goals with progress bar
- ❓ Question of the Day — saved answers per question
- 🧠 Quiz — AI-generated trivia via Claude API
- 🎙️ Voice — walkie-talkie UI (local only, no audio storage)
