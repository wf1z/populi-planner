// ============================================================================
// POPULI PLANNER - FIREBASE INITIALIZATION & CLOUD DATA LAYER
// ============================================================================
// Uses Firebase Modular SDK v10+ loaded dynamically from Google CDN.
// Compatible with both local testing and production hosting environments.
// Provides Google Authentication and Cloud Firestore synchronization
// partitioned per user under `users/{uid}`.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. FIREBASE CONFIGURATION
// ----------------------------------------------------------------------------
// Paste your Firebase Web App configuration below.
// Find these in Firebase Console: Project Settings -> General -> "Your apps" (Web)
//
// NOTE: Only public client identifiers go here. Never put private service
// account keys or administrative secrets in client-side code.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "populiplanner.firebaseapp.com",
  projectId: "populiplanner",
  storageBucket: "populiplanner.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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

// Module references populated once loaded dynamically from Google CDN
let fbApp = null;
let fbAuth = null;
let fbFirestore = null;

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

let authStateListeners = [];
let currentUser = null;
let initPromise = null;

/**
 * Dynamically imports and initializes Firebase SDK modules from CDN.
 * Safely handles unconfigured state and offline environments.
 */
async function initFirebase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // If running on local file:// protocol, warn that OAuth cannot complete
    if (window.location.protocol === "file:") {
      console.info(
        "%c[Populi Planner]%c Running from local file:// URL. Google Sign-In requires HTTP/HTTPS. Use 'firebase serve' or deploy with 'firebase deploy'.",
        "color: #e0b8c8; font-weight: bold;",
        "color: inherit;"
      );
    }

    // If config has placeholders, operate in local guest mode
    if (!isFirebaseConfigured()) {
      console.info(
        "%c[Populi Planner]%c Firebase is running in unconfigured mode. Paste your config into firebase.js to enable Google Sign-in and Cloud sync.",
        "color: #e0b8c8; font-weight: bold;",
        "color: inherit;"
      );
      return false;
    }

    try {
      const [appMod, authMod, firestoreMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js")
      ]);

      fbApp = appMod;
      fbAuth = authMod;
      fbFirestore = firestoreMod;

      app = fbApp.getApps().length === 0 ? fbApp.initializeApp(firebaseConfig) : fbApp.getApp();
      auth = fbAuth.getAuth(app);
      db = fbFirestore.getFirestore(app);
      googleProvider = new fbAuth.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: "select_account" });

      // Subscribe to auth state changes and notify registered listeners
      fbAuth.onAuthStateChanged(auth, user => {
        currentUser = user;
        authStateListeners.forEach(cb => {
          try {
            cb(user);
          } catch (e) {
            console.error("Auth state listener error:", e);
          }
        });
      });

      return true;
    } catch (initErr) {
      console.warn("Could not load or initialize Firebase modules:", initErr);
      return false;
    }
  })();

  return initPromise;
}

// ----------------------------------------------------------------------------
// 2. AUTHENTICATION HELPERS
// ----------------------------------------------------------------------------

/**
 * Initiates Google Sign-In with a popup.
 * Translates low-level errors into beginner-friendly, actionable messages.
 */
async function signInWithGoogle() {
  if (window.location.protocol === "file:") {
    const fileErr = new Error(
      "Google Sign-In Cannot Run on Local Files (file://)\n\n" +
      "Browsers and Google OAuth block sign-in on local 'file://' addresses.\n\n" +
      "To test Google Sign-In:\n" +
      "1. Run 'firebase serve' in your terminal and open http://localhost:5000\n" +
      "2. Or deploy to Firebase Hosting with 'firebase deploy' and open your web app URL."
    );
    fileErr.code = "auth/file-protocol-unsupported";
    throw fileErr;
  }

  if (!isFirebaseConfigured()) {
    const configErr = new Error(
      "Firebase Configuration Missing:\n\n" +
      "To enable Google Sign-In and Cloud Storage:\n" +
      "1. Open firebase.js in your editor.\n" +
      "2. Replace the placeholder apiKey, appId, and projectId in firebaseConfig with your web app settings from the Firebase Console (Project Settings > General > Your apps)."
    );
    configErr.code = "auth/not-configured";
    throw configErr;
  }

  const ready = await initFirebase();
  if (!ready || !auth || !googleProvider || !fbAuth) {
    throw new Error(
      "Firebase modules could not be loaded from CDN. Please check your internet connection."
    );
  }

  try {
    const result = await fbAuth.signInWithPopup(auth, googleProvider);
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
    if (err.code === "auth/unauthorized-domain") {
      const friendlyErr = new Error(
        "Domain not authorized in Firebase Console: Add '" + window.location.hostname + "' under Firebase Console -> Authentication -> Settings -> Authorized domains."
      );
      friendlyErr.code = err.code;
      throw friendlyErr;
    }
    throw err;
  }
}

/**
 * Signs out the currently authenticated user.
 */
async function signOutUser() {
  if (!auth || !fbAuth) return;
  await fbAuth.signOut(auth);
}

/**
 * Returns the currently signed-in user object, or null.
 */
function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Listens for auth state changes (sign in, sign out, token refresh).
 * @param {Function} callback - Function called with (user)
 * @returns {Function} Unsubscribe function
 */
function onAuthChange(callback) {
  if (typeof callback !== "function") return () => {};
  authStateListeners.push(callback);

  // If already authenticated or checked, invoke immediately
  if (currentUser) {
    callback(currentUser);
  }

  return () => {
    authStateListeners = authStateListeners.filter(cb => cb !== callback);
  };
}

// ----------------------------------------------------------------------------
// 3. USER PROFILE HELPERS
// ----------------------------------------------------------------------------

/**
 * Records or updates the user profile document at `users/{uid}`.
 * Only saves displayName, photoURL, email, and timestamps.
 */
async function saveUserProfile(user) {
  if (!user || !user.uid) return;
  await initFirebase();
  if (!db || !fbFirestore) return;

  const userRef = fbFirestore.doc(db, "users", user.uid);
  const profileData = {
    displayName: user.displayName || "User",
    photoURL: user.photoURL || null,
    email: user.email || null,
    lastLoginAt: fbFirestore.serverTimestamp()
  };

  try {
    await fbFirestore.setDoc(userRef, { profile: profileData }, { merge: true });
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
async function checkCloudHasData(uid) {
  if (!uid) return false;
  await initFirebase();
  if (!db || !fbFirestore) return false;

  try {
    const coursesSnap = await fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "courses"));
    if (!coursesSnap.empty) return true;

    const assignmentsSnap = await fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "assignments"));
    if (!assignmentsSnap.empty) return true;

    const classesSnap = await fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "classes"));
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
async function loadAllUserData(uid) {
  if (!uid) {
    return { courses: [], assignments: [], classes: [], ignoredUIDs: [] };
  }
  await initFirebase();
  if (!db || !fbFirestore) {
    return { courses: [], assignments: [], classes: [], ignoredUIDs: [] };
  }

  const [coursesSnap, assignmentsSnap, classesSnap, settingsDoc] = await Promise.all([
    fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "courses")),
    fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "assignments")),
    fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "classes")),
    fbFirestore.getDoc(fbFirestore.doc(db, "users", uid, "settings", "app"))
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
function subscribeToUserData(uid, onDataUpdate, onError) {
  if (!uid) return () => {};

  let currentCourses = [];
  let currentAssignments = [];
  let currentClasses = [];
  let currentIgnoredUIDs = [];

  let coursesLoaded = false;
  let assignmentsLoaded = false;
  let classesLoaded = false;
  let settingsLoaded = false;

  let unsubCourses = () => {};
  let unsubAssignments = () => {};
  let unsubClasses = () => {};
  let unsubSettings = () => {};

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

  initFirebase().then(ready => {
    if (!ready || !db || !fbFirestore) return;

    unsubCourses = fbFirestore.onSnapshot(
      fbFirestore.collection(db, "users", uid, "courses"),
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

    unsubAssignments = fbFirestore.onSnapshot(
      fbFirestore.collection(db, "users", uid, "assignments"),
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

    unsubClasses = fbFirestore.onSnapshot(
      fbFirestore.collection(db, "users", uid, "classes"),
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

    unsubSettings = fbFirestore.onSnapshot(
      fbFirestore.doc(db, "users", uid, "settings", "app"),
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
  });

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

async function saveCourseToCloud(uid, course) {
  if (!uid || !course || !course.id) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.setDoc(fbFirestore.doc(db, "users", uid, "courses", course.id), course);
}

async function deleteCourseFromCloud(uid, courseId) {
  if (!uid || !courseId) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.deleteDoc(fbFirestore.doc(db, "users", uid, "courses", courseId));
}

async function saveAssignmentToCloud(uid, assignment) {
  if (!uid || !assignment || !assignment.id) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.setDoc(fbFirestore.doc(db, "users", uid, "assignments", assignment.id), assignment);
}

async function deleteAssignmentFromCloud(uid, assignmentId) {
  if (!uid || !assignmentId) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.deleteDoc(fbFirestore.doc(db, "users", uid, "assignments", assignmentId));
}

async function bulkDeleteAssignmentsFromCloud(uid, assignmentIds) {
  if (!uid || !assignmentIds || assignmentIds.length === 0) return;
  await initFirebase();
  if (!db || !fbFirestore) return;

  const chunkSize = 450;
  for (let i = 0; i < assignmentIds.length; i += chunkSize) {
    const chunk = assignmentIds.slice(i, i + chunkSize);
    const batch = fbFirestore.writeBatch(db);
    chunk.forEach(id => {
      batch.delete(fbFirestore.doc(db, "users", uid, "assignments", id));
    });
    await batch.commit();
  }
}

async function saveClassMeetingToCloud(uid, classMeeting) {
  if (!uid || !classMeeting || !classMeeting.id) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.setDoc(fbFirestore.doc(db, "users", uid, "classes", classMeeting.id), classMeeting);
}

async function deleteClassMeetingFromCloud(uid, classId) {
  if (!uid || !classId) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.deleteDoc(fbFirestore.doc(db, "users", uid, "classes", classId));
}

async function saveSettingsToCloud(uid, settings) {
  if (!uid) return;
  await initFirebase();
  if (!db || !fbFirestore) return;
  await fbFirestore.setDoc(fbFirestore.doc(db, "users", uid, "settings", "app"), settings, { merge: true });
}

// ----------------------------------------------------------------------------
// 6. BULK UPLOAD & "DELETE MY DATA" HELPERS
// ----------------------------------------------------------------------------

async function uploadLocalDataToCloud(uid, data) {
  if (!uid) return;
  await initFirebase();
  if (!db || !fbFirestore) return;

  const { courses = [], assignments = [], classes = [], ignoredUIDs = [] } = data;
  const operations = [];

  courses.forEach(c => {
    operations.push({
      ref: fbFirestore.doc(db, "users", uid, "courses", c.id),
      data: c
    });
  });

  assignments.forEach(a => {
    operations.push({
      ref: fbFirestore.doc(db, "users", uid, "assignments", a.id),
      data: a
    });
  });

  classes.forEach(m => {
    operations.push({
      ref: fbFirestore.doc(db, "users", uid, "classes", m.id),
      data: m
    });
  });

  operations.push({
    ref: fbFirestore.doc(db, "users", uid, "settings", "app"),
    data: {
      ignoredUIDs: ignoredUIDs,
      dataVersion: "3",
      uploadedAt: fbFirestore.serverTimestamp()
    }
  });

  const chunkSize = 450;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const batch = fbFirestore.writeBatch(db);
    chunk.forEach(op => {
      batch.set(op.ref, op.data);
    });
    await batch.commit();
  }
}

async function deleteUserCloudData(uid) {
  if (!uid) return;
  await initFirebase();
  if (!db || !fbFirestore) return;

  const [coursesSnap, assignmentsSnap, classesSnap] = await Promise.all([
    fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "courses")),
    fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "assignments")),
    fbFirestore.getDocs(fbFirestore.collection(db, "users", uid, "classes"))
  ]);

  const deleteRefs = [];
  coursesSnap.forEach(d => deleteRefs.push(d.ref));
  assignmentsSnap.forEach(d => deleteRefs.push(d.ref));
  classesSnap.forEach(d => deleteRefs.push(d.ref));
  deleteRefs.push(fbFirestore.doc(db, "users", uid, "settings", "app"));
  deleteRefs.push(fbFirestore.doc(db, "users", uid));

  const chunkSize = 450;
  for (let i = 0; i < deleteRefs.length; i += chunkSize) {
    const chunk = deleteRefs.slice(i, i + chunkSize);
    const batch = fbFirestore.writeBatch(db);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

// ----------------------------------------------------------------------------
// 7. EXPOSE TO WINDOW FOR SEAMLESS SCRIPT INTEGRATION
// ----------------------------------------------------------------------------
// Instantly exposes window.PlannerFirebase synchronously so all application
// scripts (storage.js, auth.js, app.js) have immediate access without delays.
window.PlannerFirebase = {
  isConfigured: isFirebaseConfigured,
  init: initFirebase,
  get auth() {
    return auth;
  },
  get db() {
    return db;
  },
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

// Auto-initialize in background if running over HTTP/HTTPS and credentials exist
if (typeof window !== "undefined" && window.location && window.location.protocol !== "file:" && isFirebaseConfigured()) {
  initFirebase();
}
