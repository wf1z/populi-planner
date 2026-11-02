// ============================================================================
// POPULI PLANNER - FIREBASE CONFIGURATION
// ============================================================================
// Paste your Firebase Web App configuration below.
// Find these in Firebase Console: Project Settings -> General -> "Your apps" (Web)
//
// NOTE: Only public client identifiers go here. Never put private service
// account keys or administrative secrets in client-side code.
// ============================================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmxBXbIRq_yJk-92uBsYIiWTuQcQLNUew",
  authDomain: "populiplanner.firebaseapp.com",
  projectId: "populiplanner",
  storageBucket: "populiplanner.firebasestorage.app",
  messagingSenderId: "60257287652",
  appId: "1:60257287652:web:b3920527dcaa8912089bf1",
  measurementId: "G-WTHW9Y2X92"
};

// Validates whether the developer has replaced the placeholder config.
function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}

// Expose on window for firebase.js and the rest of the application
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
