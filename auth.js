// ============================================================================
// POPULI PLANNER - AUTHENTICATION & CLOUD SYNC UI CONTROLLER
// ============================================================================
// Manages Google Sign-In / Sign-Out button states, user avatar & name display,
// first sign-in local data upload prompt, and cloud deletion confirmation.
// ============================================================================

let cloudUnsubscribeFn = null;
let toastTimeout = null;

// Displays a non-intrusive floating status or error toast.
function showAuthToast(message, type = "info", duration = 4000) {
  const toast = document.getElementById("auth-toast");
  if (!toast) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  toast.textContent = message;
  toast.className = `auth-toast auth-toast-${type}`;
  toast.style.display = "flex";

  toastTimeout = setTimeout(() => {
    toast.style.display = "none";
  }, duration);
}

// Updates the sync status chip in the toolbar (Local vs Cloud vs Syncing).
function updateSyncStatus(status) {
  const syncEl = document.getElementById("sync-status");
  if (!syncEl) return;

  const dot = syncEl.querySelector(".sync-dot");
  const text = syncEl.querySelector(".sync-text");

  if (status === "cloud") {
    syncEl.className = "sync-status sync-status-cloud";
    syncEl.title = "Connected to Google Cloud Firestore (real-time sync active)";
    if (text) text.textContent = "Cloud";
  } else if (status === "syncing") {
    syncEl.className = "sync-status sync-status-syncing";
    syncEl.title = "Syncing changes to cloud...";
    if (text) text.textContent = "Saving...";
  } else {
    syncEl.className = "sync-status sync-status-local";
    syncEl.title = "Operating in local-only mode (saved in browser)";
    if (text) text.textContent = "Local";
  }
}

// Updates the header UI based on user authentication state.
function updateAuthHeaderUI(user) {
  const btnSignIn = document.getElementById("btn-google-signin");
  const profileContainer = document.getElementById("auth-user-profile");
  const avatarImg = document.getElementById("user-avatar");
  const avatarFallback = document.getElementById("user-avatar-fallback");
  const userName = document.getElementById("user-name");
  const btnDeleteCloud = document.getElementById("btn-delete-cloud-data");

  if (user) {
    if (btnSignIn) btnSignIn.style.display = "none";
    if (profileContainer) profileContainer.style.display = "flex";
    if (btnDeleteCloud) btnDeleteCloud.style.display = "inline-block";

    if (userName) {
      userName.textContent = user.displayName || user.email || "Account";
      userName.title = user.email || user.displayName || "";
    }

    if (user.photoURL && avatarImg) {
      avatarImg.src = user.photoURL;
      avatarImg.style.display = "block";
      if (avatarFallback) avatarFallback.style.display = "none";
      avatarImg.onerror = function () {
        avatarImg.style.display = "none";
        if (avatarFallback) {
          avatarFallback.textContent = (user.displayName || "U").charAt(0).toUpperCase();
          avatarFallback.style.display = "inline-flex";
        }
      };
    } else if (avatarFallback) {
      if (avatarImg) avatarImg.style.display = "none";
      avatarFallback.textContent = (user.displayName || "U").charAt(0).toUpperCase();
      avatarFallback.style.display = "inline-flex";
    }

    updateSyncStatus("cloud");
  } else {
    if (btnSignIn) {
      btnSignIn.style.display = "inline-flex";
      btnSignIn.disabled = false;
      const btnText = btnSignIn.querySelector(".btn-auth-text");
      if (btnText) btnText.textContent = "Sign in";
    }
    if (profileContainer) profileContainer.style.display = "none";
    if (btnDeleteCloud) btnDeleteCloud.style.display = "none";

    updateSyncStatus("local");
  }
}

// Handles clicking "Sign in with Google".
async function handleSignInClick() {
  const btnSignIn = document.getElementById("btn-google-signin");

  // 1. Check if running on local file:// protocol
  if (window.location.protocol === "file:") {
    alert(
      "Google Sign-In Requires a Web Server (or Firebase Hosting):\n\n" +
      "Browsers and Google OAuth block sign-in on local 'file://' addresses.\n\n" +
      "To test Google Sign-In:\n" +
      "1. Run 'firebase serve' in your terminal and open http://localhost:5000\n" +
      "2. Or view your live app on Firebase Hosting: https://populiplanner.web.app"
    );
    return;
  }

  // 2. Check if Firebase module is loaded
  if (!window.PlannerFirebase) {
    showAuthToast("Firebase module is still loading. Please check your internet connection.", "error");
    return;
  }

  // 3. Check if Firebase configuration is still the placeholder
  if (typeof window.PlannerFirebase.isConfigured === "function" && !window.PlannerFirebase.isConfigured()) {
    alert(
      "Firebase Configuration Missing:\n\n" +
      "To enable Google Sign-In and Cloud Storage:\n" +
      "1. Open firebase.js in your editor.\n" +
      "2. Replace the placeholder apiKey, appId, and projectId in firebaseConfig with your web app settings from the Firebase Console (Project Settings > General > Your apps)."
    );
    return;
  }

  // 4. Attempt Google Sign-In
  try {
    if (btnSignIn) {
      btnSignIn.disabled = true;
      const btnText = btnSignIn.querySelector(".btn-auth-text");
      if (btnText) btnText.textContent = "Connecting...";
    }

    await window.PlannerFirebase.signInWithGoogle();
    // onAuthStateChanged will handle UI and data loading
  } catch (err) {
    console.warn("Sign-in warning / error:", err);
    if (btnSignIn) {
      btnSignIn.disabled = false;
      const btnText = btnSignIn.querySelector(".btn-auth-text");
      if (btnText) btnText.textContent = "Sign in";
    }

    const msg = err.message || "Could not sign in with Google.";
    showAuthToast(msg, "error");
  }
}

// Handles clicking "Sign out".
async function handleSignOutClick() {
  if (!window.PlannerFirebase) return;

  try {
    // Detach real-time cloud listener
    if (typeof cloudUnsubscribeFn === "function") {
      cloudUnsubscribeFn();
      cloudUnsubscribeFn = null;
    }

    await window.PlannerFirebase.signOutUser();

    // Switch storage back to local-only mode
    if (typeof setStorageUser === "function") {
      setStorageUser(null);
    }

    showAuthToast("Signed out. Operating in local mode.", "info");

    // Redraw application in local guest mode
    if (typeof window.renderApp === "function") {
      window.renderApp();
    }
  } catch (err) {
    console.error("Sign-out error:", err);
    showAuthToast("Error signing out: " + err.message, "error");
  }
}

// Evaluates cloud data and prompts for local upload on first sign-in if needed.
async function handleFirstSignInCheck(user) {
  if (!window.PlannerFirebase || !user) return;

  try {
    // 1. Check if user already has data in Cloud Firestore
    const cloudHasData = await window.PlannerFirebase.checkCloudHasData(user.uid);

    if (cloudHasData) {
      // User has cloud data: cloud is the definitive source of truth
      startCloudSubscription(user.uid);
      showAuthToast(`Signed in as ${user.displayName || "User"}. Cloud synced.`, "success");
      return;
    }

    // 2. Cloud is empty: check if user has existing local data on this browser
    const localData = typeof getLocalDataSnapshot === "function" ? getLocalDataSnapshot() : null;
    const totalLocalItems = localData
      ? (localData.assignments.length + localData.courses.length + localData.classes.length)
      : 0;

    if (totalLocalItems > 0) {
      // Offer to upload local data to the new cloud account
      promptLocalDataUpload(user, localData);
    } else {
      // Both cloud and local are empty: start empty cloud session
      startCloudSubscription(user.uid);
      showAuthToast(`Welcome to Populi Planner, ${user.displayName || "there"}!`, "success");
    }
  } catch (err) {
    console.error("Error during initial cloud data check:", err);
    startCloudSubscription(user.uid);
  }
}

// Opens the first sign-in modal dialog offering to upload local data to cloud.
function promptLocalDataUpload(user, localData) {
  const dialog = document.getElementById("first-signin-dialog");
  const nameSpan = document.getElementById("first-signin-user-name");
  const statsSpan = document.getElementById("first-signin-stats");
  const btnUpload = document.getElementById("first-signin-upload-btn");
  const btnSkip = document.getElementById("first-signin-skip-btn");

  if (!dialog) {
    startCloudSubscription(user.uid);
    return;
  }

  if (nameSpan) nameSpan.textContent = user.displayName || "there";
  if (statsSpan) {
    statsSpan.textContent = `${localData.assignments.length} assignment(s), ${localData.courses.length} course(s), ${localData.classes.length} class meeting(s)`;
  }

  // Upload handler
  btnUpload.onclick = async function () {
    try {
      btnUpload.disabled = true;
      btnUpload.textContent = "Uploading...";
      showAuthToast("Uploading local coursework to your Google account...", "info");

      await window.PlannerFirebase.uploadLocalDataToCloud(user.uid, localData);

      dialog.close();
      startCloudSubscription(user.uid);
      showAuthToast("Coursework uploaded to your Google account!", "success");
    } catch (uploadErr) {
      console.error("Upload error:", uploadErr);
      showAuthToast("Upload failed: " + uploadErr.message, "error");
      dialog.close();
      startCloudSubscription(user.uid);
    } finally {
      btnUpload.disabled = false;
      btnUpload.textContent = "Upload to Cloud";
    }
  };

  // Skip handler (start fresh in cloud)
  btnSkip.onclick = function () {
    dialog.close();
    startCloudSubscription(user.uid);
    showAuthToast("Started with fresh cloud account.", "info");
  };

  dialog.showModal();
}

// Attaches real-time Firestore listeners via onSnapshot.
function startCloudSubscription(uid) {
  if (typeof cloudUnsubscribeFn === "function") {
    cloudUnsubscribeFn();
    cloudUnsubscribeFn = null;
  }

  cloudUnsubscribeFn = window.PlannerFirebase.subscribeToUserData(
    uid,
    data => {
      // Deliver updated data to storage layer and trigger seamless redraw
      if (typeof applyCloudDataUpdate === "function") {
        applyCloudDataUpdate(data);
      }
    },
    err => {
      console.error("Real-time cloud sync error:", err);
      showAuthToast("Cloud connection error. Working offline.", "error");
    }
  );
}

// Handles user clicking "Delete Cloud Data" in settings.
function initDeleteCloudControls() {
  const btnDeleteCloud = document.getElementById("btn-delete-cloud-data");
  const dialog = document.getElementById("delete-cloud-dialog");
  const btnConfirm = document.getElementById("delete-cloud-confirm-btn");
  const btnCancel = document.getElementById("delete-cloud-cancel-btn");
  const btnClose = document.getElementById("delete-cloud-close-btn");

  if (!btnDeleteCloud || !dialog) return;

  btnDeleteCloud.addEventListener("click", function () {
    dialog.showModal();
  });

  if (btnCancel) {
    btnCancel.addEventListener("click", () => dialog.close());
  }
  if (btnClose) {
    btnClose.addEventListener("click", () => dialog.close());
  }

  if (btnConfirm) {
    btnConfirm.addEventListener("click", async function () {
      try {
        btnConfirm.disabled = true;
        btnConfirm.textContent = "Deleting...";

        if (typeof deleteMyData === "function") {
          await deleteMyData();
        }

        dialog.close();
        showAuthToast("All your cloud data has been permanently deleted.", "info");

        if (typeof window.renderApp === "function") {
          window.renderApp();
        }
      } catch (delErr) {
        console.error("Error deleting cloud data:", delErr);
        showAuthToast("Error deleting cloud data: " + delErr.message, "error");
      } finally {
        btnConfirm.disabled = false;
        btnConfirm.textContent = "Delete My Cloud Data";
      }
    });
  }
}

// Attaches click handlers to auth buttons immediately so they are never non-interactive
function attachAuthButtonListeners() {
  const btnSignIn = document.getElementById("btn-google-signin");
  const btnSignOut = document.getElementById("btn-signout");

  if (btnSignIn && !btnSignIn.dataset.authAttached) {
    btnSignIn.dataset.authAttached = "true";
    btnSignIn.addEventListener("click", handleSignInClick);
  }
  if (btnSignOut && !btnSignOut.dataset.authAttached) {
    btnSignOut.dataset.authAttached = "true";
    btnSignOut.addEventListener("click", handleSignOutClick);
  }

  initDeleteCloudControls();
}

// Connects all auth events once DOM and Firebase are ready.
function initAuthSystem() {
  attachAuthButtonListeners();

  // Listen to Firebase Auth state changes
  if (window.PlannerFirebase && typeof window.PlannerFirebase.onAuthChange === "function") {
    window.PlannerFirebase.onAuthChange(async user => {
      if (typeof setStorageUser === "function") {
        setStorageUser(user);
      }
      updateAuthHeaderUI(user);

      if (user) {
        await handleFirstSignInCheck(user);
      } else {
        if (typeof cloudUnsubscribeFn === "function") {
          cloudUnsubscribeFn();
          cloudUnsubscribeFn = null;
        }
        if (typeof window.renderApp === "function") {
          window.renderApp();
        }
      }
    });
  }
}

// Attach immediately if DOM is already parsed, or when DOMContentLoaded fires
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthSystem);
} else {
  initAuthSystem();
}

// Fallback safety to ensure button listeners are attached
window.addEventListener("load", attachAuthButtonListeners);

// Expose toast function globally
window.showAuthToast = showAuthToast;
window.updateSyncStatus = updateSyncStatus;
