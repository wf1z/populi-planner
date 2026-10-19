// ============================================================================
// POPULI PLANNER - FIREBASE INITIALIZATION & CLOUD DATA LAYER
// ============================================================================
// Uses Firebase Modular SDK v10+ loaded from Google CDN.
// Provides Google Authentication and Cloud Firestore synchronization
// partitioned per user under `users/{uid}`.
// ============================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ----------------------------------------------------------------------------
// 1. FIREBASE CONFIGURATION
// ----------------------------------------------------------------------------
// Paste your Firebase Web App configuration below.
// Find these in Firebase Console: Project Settings -> General -> "Your apps" (Web)
//
// NOTE: Only public client identifiers go here. Never put private service
// account keys or administrative secrets in client-side code.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "populiplanner.firebaseapp.com",
  projectId: "populiplanner",
  storageBucket: "populiplanner.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Validates whether the developer has replaced the placeholder config.
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}

// Initialize the Firebase App safely (avoid re-initializing if already active)
let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    // Prompt the user to select their account each time
    googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (initErr) {
    console.warn("Could not initialize Firebase with current configuration:", initErr);
  }
} else {
  console.info(
    "%c[Populi Planner]%c Firebase is running in unconfigured mode. Paste your config into firebase.js to enable Google Sign-in and Cloud sync.",
    "color: #e0b8c8; font-weight: bold;",
    "color: inherit;"
  );
}

// ----------------------------------------------------------------------------
// 2. AUTHENTICATION HELPERS
// ----------------------------------------------------------------------------

/**
 * Initiates Google Sign-In with a popup.
 * Translates low-level errors into beginner-friendly, actionable messages.
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured() || !auth || !googleProvider) {
    throw new Error(
      "Firebase configuration missing. Please paste your web config from Firebase Console into firebase.js."
    );
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Persist basic profile info in Firestore (display name, avatar, email)
    if (result && result.user) {
      await saveUserProfile(result.user);
    }
    return result.user;
  } catch (err) {
    if (err.code === "auth/popup-closed-by-user") {
      const friendlyErr = new Error("Sign-in popup was closed before completion.");
      friendlyErr.code = err.code;
      throw friendlyErr;
    }
    if (err.code === "auth/popup-blocked") {
      const friendlyErr = new Error(
        "Sign-in popup was blocked by your browser. Please allow popups for this site and try again."
      );
      friendlyErr.code = err.code;
      throw friendlyErr;
    }
    if (err.code === "auth/network-request-failed") {
      const friendlyErr = new Error("Network connection error. Please check your internet connection.");
      friendlyErr.code = err.code;
      throw friendlyErr;
    }
    throw err;
  }
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutUser() {
  if (!auth) return;
  await signOut(auth);
}

/**
 * Returns the currently signed-in user object, or null.
 */
export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Listens for auth state changes (sign in, sign out, token refresh).
 * @param {Function} callback - Function called with (user)
 * @returns {Function} Unsubscribe function
 */
export function onAuthChange(callback) {
  if (!auth) {
    // If not configured, immediately call back with null (guest mode)
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ----------------------------------------------------------------------------
// 3. USER PROFILE HELPERS
// ----------------------------------------------------------------------------

/**
 * Records or updates the user profile document at `users/{uid}`.
 * Only saves displayName, photoURL, email, and timestamps.
 */
export async function saveUserProfile(user) {
  if (!db || !user) return;
  const userRef = doc(db, "users", user.uid);
  const profileData = {
    displayName: user.displayName || "User",
    photoURL: user.photoURL || null,
    email: user.email || null,
    lastLoginAt: serverTimestamp()
  };

  try {
    await setDoc(userRef, { profile: profileData }, { merge: true });
  } catch (err) {
    console.warn("Could not save user profile:", err);
  }
}

// ----------------------------------------------------------------------------
// 4. CLOUD DATA CHECK & LOAD HELPERS
// ----------------------------------------------------------------------------

/**
 * Checks whether the user already has data in Firestore.
 * Used during first sign-in to decide whether to prompt for local data upload.
 */
export async function checkCloudHasData(uid) {
  if (!db || !uid) return false;

  try {
    // Check courses collection first
    const coursesSnap = await getDocs(collection(db, "users", uid, "courses"));
    if (!coursesSnap.empty) return true;

    // Check assignments collection
    const assignmentsSnap = await getDocs(collection(db, "users", uid, "assignments"));
    if (!assignmentsSnap.empty) return true;

    // Check classes collection
    const classesSnap = await getDocs(collection(db, "users", uid, "classes"));
    if (!classesSnap.empty) return true;

    return false;
  } catch (err) {
    console.error("Error checking cloud data status:", err);
    return false;
  }
}

/**
 * Fetches all courses, assignments, classes, and settings for a user once.
 */
export async function loadAllUserData(uid) {
  if (!db || !uid) {
    return { courses: [], assignments: [], classes: [], ignoredUIDs: [] };
  }

  const [coursesSnap, assignmentsSnap, classesSnap, settingsDoc] = await Promise.all([
    getDocs(collection(db, "users", uid, "courses")),
    getDocs(collection(db, "users", uid, "assignments")),
    getDocs(collection(db, "users", uid, "classes")),
    getDoc(doc(db, "users", uid, "settings", "app"))
  ]);

  const courses = [];
  coursesSnap.forEach(d => courses.push(d.data()));

  const assignments = [];
  assignmentsSnap.forEach(d => assignments.push(d.data()));

  const classes = [];
  classesSnap.forEach(d => classes.push(d.data()));

  let ignoredUIDs = [];
  if (settingsDoc.exists() && Array.isArray(settingsDoc.data().ignoredUIDs)) {
    ignoredUIDs = settingsDoc.data().ignoredUIDs;
  }

  return { courses, assignments, classes, ignoredUIDs };
}

/**
 * Subscribes to real-time changes across courses, assignments, classes,
 * and settings for the signed-in user via `onSnapshot`.
 * @returns {Function} Function to detach all active listeners on sign-out.
 */
export function subscribeToUserData(uid, onDataUpdate, onError) {
  if (!db || !uid) return () => {};

  let currentCourses = [];
  let currentAssignments = [];
  let currentClasses = [];
  let currentIgnoredUIDs = [];

  // Track initial loads so we don't trigger partial renders
  let coursesLoaded = false;
  let assignmentsLoaded = false;
  let classesLoaded = false;
  let settingsLoaded = false;

  function notifyIfReady() {
    if (coursesLoaded && assignmentsLoaded && classesLoaded && settingsLoaded) {
      onDataUpdate({
        courses: [...currentCourses],
        assignments: [...currentAssignments],
        classes: [...currentClasses],
        ignoredUIDs: [...currentIgnoredUIDs]
      });
    }
  }

  const unsubCourses = onSnapshot(
    collection(db, "users", uid, "courses"),
    snapshot => {
      currentCourses = [];
      snapshot.forEach(d => currentCourses.push(d.data()));
      coursesLoaded = true;
      notifyIfReady();
    },
    err => {
      console.error("Firestore courses listener error:", err);
      if (onError) onError(err);
    }
  );

  const unsubAssignments = onSnapshot(
    collection(db, "users", uid, "assignments"),
    snapshot => {
      currentAssignments = [];
      snapshot.forEach(d => currentAssignments.push(d.data()));
      assignmentsLoaded = true;
      notifyIfReady();
    },
    err => {
      console.error("Firestore assignments listener error:", err);
      if (onError) onError(err);
    }
  );

  const unsubClasses = onSnapshot(
    collection(db, "users", uid, "classes"),
    snapshot => {
      currentClasses = [];
      snapshot.forEach(d => currentClasses.push(d.data()));
      classesLoaded = true;
      notifyIfReady();
    },
    err => {
      console.error("Firestore classes listener error:", err);
      if (onError) onError(err);
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, "users", uid, "settings", "app"),
    docSnap => {
      if (docSnap.exists() && Array.isArray(docSnap.data().ignoredUIDs)) {
        currentIgnoredUIDs = docSnap.data().ignoredUIDs;
      } else {
        currentIgnoredUIDs = [];
      }
      settingsLoaded = true;
      notifyIfReady();
    },
    err => {
      console.error("Firestore settings listener error:", err);
      if (onError) onError(err);
    }
  );

  // Return unified cleanup function
  return function unsubscribeAll() {
    unsubCourses();
    unsubAssignments();
    unsubClasses();
    unsubSettings();
  };
}

// ----------------------------------------------------------------------------
// 5. INDIVIDUAL CLOUD MUTATIONS
// ----------------------------------------------------------------------------

export async function saveCourseToCloud(uid, course) {
  if (!db || !uid || !course || !course.id) return;
  await setDoc(doc(db, "users", uid, "courses", course.id), course);
}

export async function deleteCourseFromCloud(uid, courseId) {
  if (!db || !uid || !courseId) return;
  await deleteDoc(doc(db, "users", uid, "courses", courseId));
}

export async function saveAssignmentToCloud(uid, assignment) {
  if (!db || !uid || !assignment || !assignment.id) return;
  await setDoc(doc(db, "users", uid, "assignments", assignment.id), assignment);
}

export async function deleteAssignmentFromCloud(uid, assignmentId) {
  if (!db || !uid || !assignmentId) return;
  await deleteDoc(doc(db, "users", uid, "assignments", assignmentId));
}

/**
 * Bulk deletes assignments using Firestore write batches.
 */
export async function bulkDeleteAssignmentsFromCloud(uid, assignmentIds) {
  if (!db || !uid || !assignmentIds || assignmentIds.length === 0) return;

  // Process in chunks of 450 (Firestore limit is 500 ops per batch)
  const chunkSize = 450;
  for (let i = 0; i < assignmentIds.length; i += chunkSize) {
    const chunk = assignmentIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      batch.delete(doc(db, "users", uid, "assignments", id));
    });
    await batch.commit();
  }
}

export async function saveClassMeetingToCloud(uid, classMeeting) {
  if (!db || !uid || !classMeeting || !classMeeting.id) return;
  await setDoc(doc(db, "users", uid, "classes", classMeeting.id), classMeeting);
}

export async function deleteClassMeetingFromCloud(uid, classId) {
  if (!db || !uid || !classId) return;
  await deleteDoc(doc(db, "users", uid, "classes", classId));
}

export async function saveSettingsToCloud(uid, settings) {
  if (!db || !uid) return;
  await setDoc(doc(db, "users", uid, "settings", "app"), settings, { merge: true });
}

// ----------------------------------------------------------------------------
// 6. BULK UPLOAD & "DELETE MY DATA" HELPERS
// ----------------------------------------------------------------------------

/**
 * Uploads all local planner data to the user's Firestore collections.
 * Uses atomic write batches to ensure fast, reliable transfer.
 */
export async function uploadLocalDataToCloud(uid, data) {
  if (!db || !uid) return;
  const { courses = [], assignments = [], classes = [], ignoredUIDs = [] } = data;

  // Combine items to write
  const operations = [];

  courses.forEach(c => {
    operations.push({
      ref: doc(db, "users", uid, "courses", c.id),
      data: c
    });
  });

  assignments.forEach(a => {
    operations.push({
      ref: doc(db, "users", uid, "assignments", a.id),
      data: a
    });
  });

  classes.forEach(m => {
    operations.push({
      ref: doc(db, "users", uid, "classes", m.id),
      data: m
    });
  });

  operations.push({
    ref: doc(db, "users", uid, "settings", "app"),
    data: {
      ignoredUIDs: ignoredUIDs,
      dataVersion: "3",
      uploadedAt: serverTimestamp()
    }
  });

  // Commit in chunks of 450
  const chunkSize = 450;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(op => {
      batch.set(op.ref, op.data);
    });
    await batch.commit();
  }
}

/**
 * Permanently deletes all data under `users/{uid}` in Firestore.
 */
export async function deleteUserCloudData(uid) {
  if (!db || !uid) return;

  const [coursesSnap, assignmentsSnap, classesSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "courses")),
    getDocs(collection(db, "users", uid, "assignments")),
    getDocs(collection(db, "users", uid, "classes"))
  ]);

  const deleteRefs = [];

  coursesSnap.forEach(d => deleteRefs.push(d.ref));
  assignmentsSnap.forEach(d => deleteRefs.push(d.ref));
  classesSnap.forEach(d => deleteRefs.push(d.ref));
  deleteRefs.push(doc(db, "users", uid, "settings", "app"));
  deleteRefs.push(doc(db, "users", uid));

  const chunkSize = 450;
  for (let i = 0; i < deleteRefs.length; i += chunkSize) {
    const chunk = deleteRefs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

// ----------------------------------------------------------------------------
// 7. EXPOSE TO WINDOW FOR SEAMLESS SCRIPT INTEGRATION
// ----------------------------------------------------------------------------
// Makes all helper functions available on `window.PlannerFirebase`
// so standard non-module script files (storage.js, app.js) can easily call them.
window.PlannerFirebase = {
  isConfigured: isFirebaseConfigured,
  auth: auth,
  db: db,
  signInWithGoogle,
  signOutUser,
  getCurrentUser,
  onAuthChange,
  saveUserProfile,
  checkCloudHasData,
  loadAllUserData,
  subscribeToUserData,
  saveCourseToCloud,
  deleteCourseFromCloud,
  saveAssignmentToCloud,
  deleteAssignmentFromCloud,
  bulkDeleteAssignmentsFromCloud,
  saveClassMeetingToCloud,
  deleteClassMeetingFromCloud,
  saveSettingsToCloud,
  uploadLocalDataToCloud,
  deleteUserCloudData
};
