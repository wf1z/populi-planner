// ==========================================================================
// STORAGE & DATA MODEL FOR POPULI PLANNER
// ==========================================================================

// Storage keys for localStorage
const STORAGE_KEY = "populi_assignments";
const CLASSES_STORAGE_KEY = "populi_classes";
const COURSES_STORAGE_KEY = "populi_courses";
const DATA_VERSION_KEY = "populi_data_version";
const MIGRATION_SNAPSHOT_KEY = "populi_migration_backup_pre_v3";
const LEGACY_COLORS_KEY = "populi_course_colors";
const IGNORED_UIDS_STORAGE_KEY = "populi_ignored_uids";
const GUEST_BACKUP_KEY = "populi_guest_backup";

// --------------------------------------------------------------------------
// CLOUD STORAGE & ACTIVE SESSION STATE
// --------------------------------------------------------------------------
let currentUser = null;
let activeCloudData = {
  courses: null,
  assignments: null,
  classes: null,
  ignoredUIDs: null
};

// Returns true if the user is authenticated and operating in Cloud mode.
function isCloudActive() {
  return Boolean(currentUser && currentUser.uid && window.PlannerFirebase);
}

// Configures the active storage user (called on auth state changes).
function setStorageUser(user) {
  currentUser = user;
  if (user && user.uid) {
    // Attempt to load user-scoped local offline cache
    const cacheKey = `populi_cloud_cache_${user.uid}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        activeCloudData = {
          courses: parsed.courses || [],
          assignments: parsed.assignments || [],
          classes: parsed.classes || [],
          ignoredUIDs: parsed.ignoredUIDs || []
        };
      } catch (e) {
        activeCloudData = { courses: [], assignments: [], classes: [], ignoredUIDs: [] };
      }
    } else {
      activeCloudData = { courses: [], assignments: [], classes: [], ignoredUIDs: [] };
    }
  } else {
    // Reset to local guest mode
    activeCloudData = { courses: null, assignments: null, classes: null, ignoredUIDs: null };
  }
}

// Updates the active cloud data from Firestore onSnapshot listeners.
function applyCloudDataUpdate(data) {
  if (!isCloudActive()) return;

  activeCloudData.courses = data.courses || [];
  activeCloudData.assignments = data.assignments || [];
  activeCloudData.classes = data.classes || [];
  activeCloudData.ignoredUIDs = data.ignoredUIDs || [];

  saveCloudCache();

  // Notify UI
  if (typeof window.renderApp === "function") {
    window.renderApp();
  }
}

// Saves current cloud cache to localStorage for offline resilience.
function saveCloudCache() {
  if (currentUser && currentUser.uid) {
    try {
      localStorage.setItem(`populi_cloud_cache_${currentUser.uid}`, JSON.stringify(activeCloudData));
    } catch (e) {
      // ignore quota
    }
  }
}

// Returns a complete snapshot of local storage data (courses, assignments, classes, ignoredUIDs).
function getLocalDataSnapshot() {
  const cData = localStorage.getItem(COURSES_STORAGE_KEY);
  const aData = localStorage.getItem(STORAGE_KEY);
  const mData = localStorage.getItem(CLASSES_STORAGE_KEY);
  const iData = localStorage.getItem(IGNORED_UIDS_STORAGE_KEY);

  return {
    courses: cData ? JSON.parse(cData) : [],
    assignments: aData ? JSON.parse(aData) : [],
    classes: mData ? JSON.parse(mData) : [],
    ignoredUIDs: iData ? JSON.parse(iData) : []
  };
}

// Normalizes course codes by trimming, collapsing inner spaces, and upper-casing.
function normalizeCourseCode(code) {
  if (!code) return "";
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

// Formats a local Date object into a YYYY-MM-DD string.
function formatLocalYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generates a collision-resistant ID using a prefix, current timestamp, and random characters.
function generateUniqueId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// --------------------------------------------------------------------------
// COURSE STORAGE & ALLOCATION HELPERS
// --------------------------------------------------------------------------

// Retrieves all saved courses (cloud cache if signed in, or localStorage if local).
function getStoredCourses() {
  if (isCloudActive() && Array.isArray(activeCloudData.courses)) {
    return activeCloudData.courses;
  }
  const data = localStorage.getItem(COURSES_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of courses into active storage.
function saveStoredCourses(courses) {
  if (isCloudActive()) {
    activeCloudData.courses = courses;
    saveCloudCache();
    if (window.PlannerFirebase && typeof window.PlannerFirebase.saveCourseToCloud === "function") {
      courses.forEach(c => window.PlannerFirebase.saveCourseToCloud(currentUser.uid, c));
    }
    return;
  }
  localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
}

// Retrieves a course by its unique ID with fallback to prevent rendering crashes.
function getCourseById(courseId) {
  const courses = getStoredCourses();
  const match = courses.find(c => c.id === courseId);
  if (match) return match;

  return {
    id: courseId || "unknown",
    code: "Unknown Course",
    name: "Unknown Course",
    colorNumber: 1,
    source: "manual"
  };
}

// Allocates the next color number (1-8): first unused color, or least-used if all 8 are taken.
function allocateColorNumber(coursesList = null) {
  const courses = coursesList || getStoredCourses();
  const usedColors = courses.map(c => Number(c.colorNumber) || 1);

  // Check for first unused color 1..8
  for (let i = 1; i <= 8; i++) {
    if (!usedColors.includes(i)) {
      return i;
    }
  }

  // If all 8 are used, pick the least-used color
  const counts = {};
  for (let i = 1; i <= 8; i++) {
    counts[i] = 0;
  }
  usedColors.forEach(num => {
    if (counts[num] !== undefined) counts[num]++;
  });

  let minColor = 1;
  let minCount = Infinity;
  for (let i = 1; i <= 8; i++) {
    if (counts[i] < minCount) {
      minCount = counts[i];
      minColor = i;
    }
  }
  return minColor;
}

// Returns the CSS variable string for a given course color number (1-8).
function getCourseColorVariable(colorNumber) {
  const num = Number(colorNumber) || 1;
  const safeNum = (num >= 1 && num <= 8) ? num : 1;
  return `var(--course-color-${safeNum})`;
}

// Creates and saves a new course record.
function addCourse(data) {
  const courses = getStoredCourses();
  const cleanCode = normalizeCourseCode(data.code);

  // Check if course with this normalized code already exists
  const existing = courses.find(c => normalizeCourseCode(c.code) === cleanCode);
  if (existing) {
    return existing;
  }

  const assignedColor = (data.colorNumber && data.colorNumber >= 1 && data.colorNumber <= 8)
    ? Number(data.colorNumber)
    : allocateColorNumber(courses);

  const newCourse = {
    id: generateUniqueId("course"),
    code: cleanCode,
    name: (data.name && data.name.trim()) ? data.name.trim() : cleanCode,
    colorNumber: assignedColor,
    source: data.source || "manual"
  };

  courses.push(newCourse);
  saveStoredCourses(courses);
  return newCourse;
}

// Updates an existing course record.
function updateCourse(id, data) {
  const courses = getStoredCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index === -1) return null;

  const current = courses[index];
  if (data.code) current.code = normalizeCourseCode(data.code);
  if (data.name) current.name = data.name.trim() || current.code;
  if (data.colorNumber && data.colorNumber >= 1 && data.colorNumber <= 8) {
    current.colorNumber = Number(data.colorNumber);
  }

  courses[index] = current;
  saveStoredCourses(courses);
  return current;
}

// Deletes a course and cascades deletion to all referencing assignments and class meetings.
function deleteCourse(id) {
  const courses = getStoredCourses();
  const assignments = getStoredAssignments();
  const classes = getStoredClasses();

  const toDeleteAssignments = assignments.filter(a => a.courseId === id);
  const toDeleteClasses = classes.filter(c => c.courseId === id);

  const remainingCourses = courses.filter(c => c.id !== id);
  const remainingAssignments = assignments.filter(a => a.courseId !== id);
  const remainingClasses = classes.filter(c => c.courseId !== id);

  saveStoredCourses(remainingCourses);
  saveStoredAssignments(remainingAssignments);
  saveStoredClasses(remainingClasses);

  if (isCloudActive() && window.PlannerFirebase) {
    if (typeof window.PlannerFirebase.deleteCourseFromCloud === "function") {
      window.PlannerFirebase.deleteCourseFromCloud(currentUser.uid, id);
    }
    if (toDeleteAssignments.length > 0 && typeof window.PlannerFirebase.bulkDeleteAssignmentsFromCloud === "function") {
      window.PlannerFirebase.bulkDeleteAssignmentsFromCloud(currentUser.uid, toDeleteAssignments.map(a => a.id));
    }
    if (toDeleteClasses.length > 0 && typeof window.PlannerFirebase.deleteClassMeetingFromCloud === "function") {
      toDeleteClasses.forEach(c => window.PlannerFirebase.deleteClassMeetingFromCloud(currentUser.uid, c.id));
    }
  }
}

// --------------------------------------------------------------------------
// ASSIGNMENT STORAGE HELPERS
// --------------------------------------------------------------------------

// Retrieves all saved assignments (cloud cache if signed in, or localStorage if local).
function getStoredAssignments() {
  if (isCloudActive() && Array.isArray(activeCloudData.assignments)) {
    return activeCloudData.assignments;
  }
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of assignments into active storage.
function saveStoredAssignments(assignments) {
  if (isCloudActive()) {
    activeCloudData.assignments = assignments;
    saveCloudCache();
    if (window.PlannerFirebase && typeof window.PlannerFirebase.saveAssignmentToCloud === "function") {
      assignments.forEach(a => window.PlannerFirebase.saveAssignmentToCloud(currentUser.uid, a));
    }
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// Creates and saves a new manual assignment referencing a courseId.
function addAssignment(data) {
  const assignments = getStoredAssignments();

  const newAssignment = {
    id: generateUniqueId("assign"),
    courseId: data.courseId,
    title: data.title.trim(),
    dueDate: data.dueDate,
    planned: false,
    firstSeen: data.isJustPosted ? Date.now() : (data.firstSeen !== undefined ? data.firstSeen : null),
    lastChanged: data.lastChanged || null,
    previousDueDate: data.previousDueDate || null,
    source: data.source || "manual",
    externalId: data.externalId || null
  };

  assignments.push(newAssignment);
  saveStoredAssignments(assignments);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveAssignmentToCloud === "function") {
    window.PlannerFirebase.saveAssignmentToCloud(currentUser.uid, newAssignment);
  }

  return newAssignment;
}

// Updates an existing assignment and conditionally logs due date history.
function updateAssignment(id, data, markDueDateChanged) {
  const assignments = getStoredAssignments();
  const index = assignments.findIndex(item => item.id === id);

  if (index === -1) {
    return null;
  }

  const current = assignments[index];
  const oldDueDate = current.dueDate;

  if (markDueDateChanged && data.dueDate !== oldDueDate) {
    current.previousDueDate = oldDueDate;
    current.lastChanged = Date.now();
  }

  current.courseId = data.courseId;
  current.title = data.title.trim();
  current.dueDate = data.dueDate;

  assignments[index] = current;
  saveStoredAssignments(assignments);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveAssignmentToCloud === "function") {
    window.PlannerFirebase.saveAssignmentToCloud(currentUser.uid, current);
  }

  return current;
}

// Toggles the planned checkbox status of an assignment.
function toggleAssignmentPlanned(id) {
  const assignments = getStoredAssignments();
  const assignment = assignments.find(item => item.id === id);
  if (assignment) {
    assignment.planned = !assignment.planned;
    saveStoredAssignments(assignments);

    if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveAssignmentToCloud === "function") {
      window.PlannerFirebase.saveAssignmentToCloud(currentUser.uid, assignment);
    }
  }
}

// Deletes a single assignment by its ID and records externalId in ignored list if present.
function deleteAssignment(id) {
  const assignments = getStoredAssignments();
  const toDelete = assignments.find(item => item.id === id);
  if (toDelete && toDelete.externalId) {
    addIgnoredUIDs(toDelete.externalId);
  }
  const remaining = assignments.filter(item => item.id !== id);
  saveStoredAssignments(remaining);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.deleteAssignmentFromCloud === "function") {
    window.PlannerFirebase.deleteAssignmentFromCloud(currentUser.uid, id);
  }
}

// Deletes multiple assignments in one atomic save and records their externalIds in populi_ignored_uids.
function bulkDeleteAssignments(ids) {
  const idSet = new Set(ids);
  const assignments = getStoredAssignments();
  const toDelete = [];
  const remaining = [];
  const externalIdsToAdd = [];

  assignments.forEach(item => {
    if (idSet.has(item.id)) {
      toDelete.push(item);
      if (item.externalId) {
        externalIdsToAdd.push(item.externalId);
      }
    } else {
      remaining.push(item);
    }
  });

  if (externalIdsToAdd.length > 0) {
    addIgnoredUIDs(externalIdsToAdd);
  }

  saveStoredAssignments(remaining);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.bulkDeleteAssignmentsFromCloud === "function") {
    window.PlannerFirebase.bulkDeleteAssignmentsFromCloud(currentUser.uid, Array.from(idSet));
  }

  return {
    deletedAssignments: toDelete,
    externalIdsAdded: externalIdsToAdd
  };
}

// Restores deleted assignments and removes their externalIds from populi_ignored_uids.
function bulkRestoreAssignments(itemsToRestore, externalIdsToRemove) {
  if (!itemsToRestore || itemsToRestore.length === 0) return;
  const assignments = getStoredAssignments();

  // Re-insert restored items exactly as they were
  itemsToRestore.forEach(item => {
    if (!assignments.some(a => a.id === item.id)) {
      assignments.push(item);
    }
  });

  saveStoredAssignments(assignments);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveAssignmentToCloud === "function") {
    itemsToRestore.forEach(item => window.PlannerFirebase.saveAssignmentToCloud(currentUser.uid, item));
  }

  if (externalIdsToRemove && externalIdsToRemove.length > 0) {
    removeIgnoredUIDs(externalIdsToRemove);
  }
}

// --------------------------------------------------------------------------
// CLASS MEETING STORAGE HELPERS
// --------------------------------------------------------------------------

// Retrieves all saved class meetings (cloud cache if signed in, or localStorage if local).
function getStoredClasses() {
  if (isCloudActive() && Array.isArray(activeCloudData.classes)) {
    return activeCloudData.classes;
  }
  const data = localStorage.getItem(CLASSES_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of class meetings into active storage.
function saveStoredClasses(classes) {
  if (isCloudActive()) {
    activeCloudData.classes = classes;
    saveCloudCache();
    if (window.PlannerFirebase && typeof window.PlannerFirebase.saveClassMeetingToCloud === "function") {
      classes.forEach(c => window.PlannerFirebase.saveClassMeetingToCloud(currentUser.uid, c));
    }
    return;
  }
  localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
}

// Creates and saves a new class meeting referencing a courseId.
function addClassMeeting(data) {
  const classes = getStoredClasses();
  const isUnscheduled = Boolean(data.unscheduled);

  const newClass = {
    id: generateUniqueId("meeting"),
    courseId: data.courseId,
    days: isUnscheduled ? [] : (data.days || []).map(Number).sort((a, b) => a - b),
    startTime: isUnscheduled ? null : (data.startTime || null),
    endTime: isUnscheduled ? null : (data.endTime || null),
    location: (data.location || "").trim(),
    source: data.source || "manual",
    unscheduled: isUnscheduled,
    externalId: data.externalId || null
  };

  classes.push(newClass);
  saveStoredClasses(classes);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveClassMeetingToCloud === "function") {
    window.PlannerFirebase.saveClassMeetingToCloud(currentUser.uid, newClass);
  }

  return newClass;
}

// Updates an existing class meeting.
function updateClassMeeting(id, data) {
  const classes = getStoredClasses();
  const index = classes.findIndex(item => item.id === id);

  if (index === -1) {
    return null;
  }

  const current = classes[index];
  const isUnscheduled = Boolean(data.unscheduled);

  current.courseId = data.courseId;
  current.days = isUnscheduled ? [] : (data.days || []).map(Number).sort((a, b) => a - b);
  current.startTime = isUnscheduled ? null : (data.startTime || null);
  current.endTime = isUnscheduled ? null : (data.endTime || null);
  current.location = (data.location || "").trim();
  current.unscheduled = isUnscheduled;
  if (data.externalId) {
    current.externalId = data.externalId;
  }

  classes[index] = current;
  saveStoredClasses(classes);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveClassMeetingToCloud === "function") {
    window.PlannerFirebase.saveClassMeetingToCloud(currentUser.uid, current);
  }

  return current;
}

// Deletes a single class meeting by its ID and records externalId in ignored list if present.
function deleteClassMeeting(id) {
  const classes = getStoredClasses();
  const toDelete = classes.find(item => item.id === id);
  if (toDelete && toDelete.externalId) {
    addIgnoredUIDs(toDelete.externalId);
  }
  const remaining = classes.filter(item => item.id !== id);
  saveStoredClasses(remaining);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.deleteClassMeetingFromCloud === "function") {
    window.PlannerFirebase.deleteClassMeetingFromCloud(currentUser.uid, id);
  }
}

// --------------------------------------------------------------------------
// CALENDAR IMPORT & IGNORED UIDS STORAGE HELPERS
// --------------------------------------------------------------------------

// Retrieves the list of ignored/skipped calendar UIDs.
function getIgnoredUIDs() {
  if (isCloudActive() && Array.isArray(activeCloudData.ignoredUIDs)) {
    return activeCloudData.ignoredUIDs;
  }
  const data = localStorage.getItem(IGNORED_UIDS_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the list of ignored/skipped calendar UIDs.
function saveIgnoredUIDs(uids) {
  const safeList = Array.isArray(uids) ? uids : [];
  if (isCloudActive()) {
    activeCloudData.ignoredUIDs = safeList;
    saveCloudCache();
    if (window.PlannerFirebase && typeof window.PlannerFirebase.saveSettingsToCloud === "function") {
      window.PlannerFirebase.saveSettingsToCloud(currentUser.uid, { ignoredUIDs: safeList });
    }
    return;
  }
  localStorage.setItem(IGNORED_UIDS_STORAGE_KEY, JSON.stringify(safeList));
}

// Adds one or more UIDs to the ignored list without duplicates.
function addIgnoredUIDs(newUIDs) {
  if (!newUIDs) return;
  const current = new Set(getIgnoredUIDs());
  const list = Array.isArray(newUIDs) ? newUIDs : [newUIDs];
  list.forEach(uid => {
    if (uid && typeof uid === "string") {
      current.add(uid.trim());
    }
  });
  saveIgnoredUIDs(Array.from(current));
}

// Removes one or more UIDs from the ignored list (used by Undo).
function removeIgnoredUIDs(uidsToRemove) {
  if (!uidsToRemove) return;
  const toRemove = new Set(Array.isArray(uidsToRemove) ? uidsToRemove : [uidsToRemove]);
  const current = getIgnoredUIDs().filter(uid => !toRemove.has(uid));
  saveIgnoredUIDs(current);
}

// Baseline detection: returns true if NO stored assignment or class has source "ics".
function isCalendarBaseline() {
  const assignments = getStoredAssignments();
  const classes = getStoredClasses();
  const hasIcsAssignment = assignments.some(a => a.source === "ics");
  const hasIcsClass = classes.some(c => c.source === "ics");
  return !hasIcsAssignment && !hasIcsClass;
}

// --------------------------------------------------------------------------
// DATA MIGRATION (UPGRADE TO VERSION 3)
// --------------------------------------------------------------------------

// Runs safe, one-time data migration to Version 3 data architecture.
function runDataMigration() {
  const currentVersion = localStorage.getItem(DATA_VERSION_KEY);

  // If already at Version 3, migration is complete.
  if (currentVersion === "3") {
    return { success: true, migrated: false };
  }

  // Check for pre-existing snapshot or current raw data
  const existingSnapshot = localStorage.getItem(MIGRATION_SNAPSHOT_KEY);
  let rawAssignments = null;
  let rawClasses = null;
  let rawColors = null;

  if (existingSnapshot) {
    try {
      const parsedSnapshot = JSON.parse(existingSnapshot);
      rawAssignments = parsedSnapshot.rawAssignments;
      rawClasses = parsedSnapshot.rawClasses;
      rawColors = parsedSnapshot.rawCourseColors;
    } catch (e) {
      console.warn("Could not parse existing migration snapshot, reading live keys:", e);
      rawAssignments = localStorage.getItem(STORAGE_KEY);
      rawClasses = localStorage.getItem(CLASSES_STORAGE_KEY);
      rawColors = localStorage.getItem(LEGACY_COLORS_KEY);
    }
  } else {
    rawAssignments = localStorage.getItem(STORAGE_KEY);
    rawClasses = localStorage.getItem(CLASSES_STORAGE_KEY);
    rawColors = localStorage.getItem(LEGACY_COLORS_KEY);

    // If completely brand-new user with zero existing data, set version 3 immediately
    if (!rawAssignments && !rawClasses && !rawColors) {
      saveStoredCourses([]);
      saveStoredAssignments([]);
      saveStoredClasses([]);
      localStorage.setItem(DATA_VERSION_KEY, "3");
      return { success: true, migrated: false };
    }

    // Save untouched pre-migration snapshot before attempting any modifications
    const snapshotPayload = {
      migratedAt: new Date().toISOString(),
      rawAssignments: rawAssignments,
      rawClasses: rawClasses,
      rawCourseColors: rawColors
    };
    localStorage.setItem(MIGRATION_SNAPSHOT_KEY, JSON.stringify(snapshotPayload));
  }

  // Execute migration in an isolated try/catch block
  try {
    const assignmentsList = rawAssignments ? JSON.parse(rawAssignments) : [];
    const classesList = rawClasses ? JSON.parse(rawClasses) : [];
    const colorsMap = rawColors ? JSON.parse(rawColors) : {};

    const migratedCourses = [];
    const codeToIdMap = new Map();

    // Helper to get or create a course record during migration
    function getOrCreateCourse(rawCode, rawName) {
      const cleanCode = normalizeCourseCode(rawCode);
      if (!cleanCode) return null;

      if (codeToIdMap.has(cleanCode)) {
        const existing = migratedCourses.find(c => c.id === codeToIdMap.get(cleanCode));
        if (rawName && (!existing.name || existing.name === cleanCode)) {
          existing.name = rawName.trim() || cleanCode;
        }
        return existing.id;
      }

      // Check legacy color mapping
      let colorNum = colorsMap[cleanCode] ? Number(colorsMap[cleanCode]) : null;
      if (!colorNum || colorNum < 1 || colorNum > 8) {
        colorNum = allocateColorNumber(migratedCourses);
      }

      const newCourse = {
        id: generateUniqueId("course"),
        code: cleanCode,
        name: (rawName && rawName.trim()) ? rawName.trim() : cleanCode,
        colorNumber: colorNum,
        source: "manual"
      };

      migratedCourses.push(newCourse);
      codeToIdMap.set(cleanCode, newCourse.id);
      return newCourse.id;
    }

    // 1. Relink assignments
    const migratedAssignments = [];
    assignmentsList.forEach(item => {
      let courseId = item.courseId;
      if (!courseId) {
        courseId = getOrCreateCourse(item.courseCode, item.courseName);
      }
      if (courseId) {
        const copy = { ...item, courseId };
        delete copy.courseCode;
        delete copy.courseName;
        migratedAssignments.push(copy);
      }
    });

    // 2. Relink class meetings
    const migratedClasses = [];
    classesList.forEach(item => {
      let courseId = item.courseId;
      if (!courseId) {
        courseId = getOrCreateCourse(item.courseCode, item.courseName);
      }
      if (courseId) {
        const copy = { ...item, courseId };
        delete copy.courseCode;
        delete copy.courseName;
        migratedClasses.push(copy);
      }
    });

    // Write all migrated data
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(migratedCourses));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedAssignments));
    localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(migratedClasses));

    // WRITTEN LAST after all writes succeed
    localStorage.setItem(DATA_VERSION_KEY, "3");

    return { success: true, migrated: true };

  } catch (err) {
    console.error("Migration to Version 3 failed:", err);
    return {
      success: false,
      error: err.message,
      snapshotRaw: existingSnapshot || localStorage.getItem(MIGRATION_SNAPSHOT_KEY)
    };
  }
}

// --------------------------------------------------------------------------
// RESET & BACKUP EXPORT / IMPORT
// --------------------------------------------------------------------------

// Clears all stored assignments, classes, and courses, leaving the data version marker at 3.
function clearAllData() {
  if (isCloudActive()) {
    const courseIds = (activeCloudData.courses || []).map(c => c.id);
    const assignIds = (activeCloudData.assignments || []).map(a => a.id);
    const classIds = (activeCloudData.classes || []).map(c => c.id);

    activeCloudData.courses = [];
    activeCloudData.assignments = [];
    activeCloudData.classes = [];
    activeCloudData.ignoredUIDs = [];
    saveCloudCache();

    if (window.PlannerFirebase) {
      if (assignIds.length > 0 && typeof window.PlannerFirebase.bulkDeleteAssignmentsFromCloud === "function") {
        window.PlannerFirebase.bulkDeleteAssignmentsFromCloud(currentUser.uid, assignIds);
      }
      if (courseIds.length > 0 && typeof window.PlannerFirebase.deleteCourseFromCloud === "function") {
        courseIds.forEach(id => window.PlannerFirebase.deleteCourseFromCloud(currentUser.uid, id));
      }
      if (classIds.length > 0 && typeof window.PlannerFirebase.deleteClassMeetingFromCloud === "function") {
        classIds.forEach(id => window.PlannerFirebase.deleteClassMeetingFromCloud(currentUser.uid, id));
      }
      if (typeof window.PlannerFirebase.saveSettingsToCloud === "function") {
        window.PlannerFirebase.saveSettingsToCloud(currentUser.uid, { ignoredUIDs: [] });
      }
    }
    return;
  }

  saveStoredCourses([]);
  saveStoredAssignments([]);
  saveStoredClasses([]);
  saveIgnoredUIDs([]);
  localStorage.setItem(DATA_VERSION_KEY, "3");
}

// Triggers a browser download of current data as a Version 3 backup file.
function exportBackup() {
  const courses = getStoredCourses();
  const assignments = getStoredAssignments();
  const classes = getStoredClasses();

  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    courses: courses,
    assignments: assignments,
    classes: classes,
    ignoredUIDs: getIgnoredUIDs()
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);

  const todayStr = formatLocalYYYYMMDD(new Date());
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `populi-planner-backup-${todayStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}

// Validates imported JSON data supporting Version 1, 2, and 3 formats.
function validateBackupJSON(rawText) {
  try {
    const data = JSON.parse(rawText);
    if (!data || typeof data !== "object") {
      return { valid: false, error: "The file does not contain valid JSON." };
    }

    if (data.version !== 1 && data.version !== 2 && data.version !== 3) {
      return { valid: false, error: "Unsupported backup version. Expected version 1, 2, or 3." };
    }

    // ----------------------------------------------------------------------
    // VERSION 3 VALIDATION
    // ----------------------------------------------------------------------
    if (data.version === 3) {
      if (!Array.isArray(data.courses)) {
        return { valid: false, error: "Missing 'courses' list in Version 3 backup file." };
      }
      if (!Array.isArray(data.assignments)) {
        return { valid: false, error: "Missing 'assignments' list in Version 3 backup file." };
      }
      if (!Array.isArray(data.classes)) {
        return { valid: false, error: "Missing 'classes' list in Version 3 backup file." };
      }

      // Validate courses list
      const courseIdSet = new Set();
      for (let i = 0; i < data.courses.length; i++) {
        const c = data.courses[i];
        if (!c.id || !c.code) {
          return { valid: false, error: `Course #${i + 1} is missing required fields (id, code).` };
        }
        courseIdSet.add(c.id);
      }

      // Validate assignments and verify every courseId exists in courses
      for (let i = 0; i < data.assignments.length; i++) {
        const a = data.assignments[i];
        if (!a.id || !a.title || !a.dueDate || !a.courseId) {
          return { valid: false, error: `Assignment #${i + 1} is missing required fields (id, title, dueDate, courseId).` };
        }
        if (!courseIdSet.has(a.courseId)) {
          return { valid: false, error: `Assignment "${a.title}" references a missing course ID: ${a.courseId}` };
        }
      }

      // Validate class meetings and verify every courseId exists in courses
      for (let i = 0; i < data.classes.length; i++) {
        const m = data.classes[i];
        if (!m.id || !m.courseId) {
          return { valid: false, error: `Class meeting #${i + 1} is missing required fields (id, courseId).` };
        }
        if (!courseIdSet.has(m.courseId)) {
          return { valid: false, error: `Class meeting #${i + 1} references a missing course ID: ${m.courseId}` };
        }
        if (!m.unscheduled) {
          if (!Array.isArray(m.days) || !m.startTime || !m.endTime) {
            return { valid: false, error: `Class meeting #${i + 1} is missing required schedule fields (days, startTime, endTime).` };
          }
        }
      }

      return {
        valid: true,
        version: 3,
        courses: data.courses,
        assignments: data.assignments,
        classes: data.classes,
        ignoredUIDs: Array.isArray(data.ignoredUIDs) ? data.ignoredUIDs : []
      };
    }

    // ----------------------------------------------------------------------
    // VERSION 2 VALIDATION & IN-MEMORY MIGRATION
    // ----------------------------------------------------------------------
    if (data.version === 2) {
      if (!Array.isArray(data.assignments)) {
        return { valid: false, error: "Missing 'assignments' list in Version 2 backup file." };
      }
      if (!Array.isArray(data.classes)) {
        return { valid: false, error: "Missing 'classes' list in Version 2 backup file." };
      }

      // Validate legacy structure
      for (let i = 0; i < data.assignments.length; i++) {
        const item = data.assignments[i];
        if (!item.id || !item.title || !item.dueDate || !item.courseCode) {
          return { valid: false, error: `Assignment #${i + 1} is missing required fields (id, title, dueDate, courseCode).` };
        }
      }

      for (let i = 0; i < data.classes.length; i++) {
        const item = data.classes[i];
        if (!item.id || !item.courseCode) {
          return { valid: false, error: `Class meeting #${i + 1} is missing required fields (id, courseCode).` };
        }
        if (!item.unscheduled) {
          if (!Array.isArray(item.days) || !item.startTime || !item.endTime) {
            return { valid: false, error: `Class meeting #${i + 1} is missing required schedule fields (days, startTime, endTime).` };
          }
        }
      }

      // Rebuild courses from assignments and classes
      const currentCourses = getStoredCourses();
      const colorsMap = (data.courseColors && typeof data.courseColors === "object") ? data.courseColors : {};
      const rebuiltCourses = [];
      const codeToIdMap = new Map();

      function getOrCreateRebuiltCourse(rawCode, rawName) {
        const cleanCode = normalizeCourseCode(rawCode);
        if (!cleanCode) return null;
        if (codeToIdMap.has(cleanCode)) {
          const c = rebuiltCourses.find(item => item.id === codeToIdMap.get(cleanCode));
          if (rawName && (!c.name || c.name === cleanCode)) {
            c.name = rawName.trim() || cleanCode;
          }
          return c.id;
        }

        // Keep color of any course whose normalized code matches a current course
        const currentMatch = currentCourses.find(c => normalizeCourseCode(c.code) === cleanCode);
        let colorNum = currentMatch ? currentMatch.colorNumber : (colorsMap[cleanCode] ? Number(colorsMap[cleanCode]) : null);
        if (!colorNum || colorNum < 1 || colorNum > 8) {
          colorNum = allocateColorNumber(rebuiltCourses);
        }

        const newCourse = {
          id: generateUniqueId("course"),
          code: cleanCode,
          name: (rawName && rawName.trim()) ? rawName.trim() : cleanCode,
          colorNumber: colorNum,
          source: "manual"
        };
        rebuiltCourses.push(newCourse);
        codeToIdMap.set(cleanCode, newCourse.id);
        return newCourse.id;
      }

      const migratedAssignments = data.assignments.map(a => {
        const courseId = getOrCreateRebuiltCourse(a.courseCode, a.courseName);
        const copy = { ...a, courseId };
        delete copy.courseCode;
        delete copy.courseName;
        return copy;
      });

      const migratedClasses = data.classes.map(c => {
        const courseId = getOrCreateRebuiltCourse(c.courseCode, c.courseName);
        const copy = { ...c, courseId };
        delete copy.courseCode;
        delete copy.courseName;
        return copy;
      });

      return {
        valid: true,
        version: 2,
        courses: rebuiltCourses,
        assignments: migratedAssignments,
        classes: migratedClasses
      };
    }

    // ----------------------------------------------------------------------
    // VERSION 1 VALIDATION & IN-MEMORY MIGRATION
    // ----------------------------------------------------------------------
    if (data.version === 1) {
      if (!Array.isArray(data.assignments)) {
        return { valid: false, error: "Missing 'assignments' list in Version 1 backup file." };
      }

      for (let i = 0; i < data.assignments.length; i++) {
        const item = data.assignments[i];
        if (!item.id || !item.title || !item.dueDate || !item.courseCode) {
          return { valid: false, error: `Assignment #${i + 1} is missing required fields (id, title, dueDate, courseCode).` };
        }
      }

      // Match each assignment to an existing course by normalized code or create a new one.
      // Do NOT delete existing courses or classes!
      const mergedCourses = [...getStoredCourses()];

      function matchOrCreateCourse(rawCode, rawName) {
        const cleanCode = normalizeCourseCode(rawCode);
        if (!cleanCode) return null;

        const match = mergedCourses.find(c => normalizeCourseCode(c.code) === cleanCode);
        if (match) {
          if (rawName && (!match.name || match.name === cleanCode)) {
            match.name = rawName.trim() || cleanCode;
          }
          return match.id;
        }

        const newCourse = {
          id: generateUniqueId("course"),
          code: cleanCode,
          name: (rawName && rawName.trim()) ? rawName.trim() : cleanCode,
          colorNumber: allocateColorNumber(mergedCourses),
          source: "manual"
        };
        mergedCourses.push(newCourse);
        return newCourse.id;
      }

      const migratedAssignments = data.assignments.map(a => {
        const courseId = matchOrCreateCourse(a.courseCode, a.courseName);
        const copy = { ...a, courseId };
        delete copy.courseCode;
        delete copy.courseName;
        return copy;
      });

      return {
        valid: true,
        version: 1,
        courses: mergedCourses,
        assignments: migratedAssignments,
        classes: null // Do not delete existing classes
      };
    }

  } catch (err) {
    return { valid: false, error: "Could not parse JSON file: " + err.message };
  }
}

// --------------------------------------------------------------------------
// UNIFIED DATA ACCESS LAYER (Read/Write Firestore or localStorage)
// --------------------------------------------------------------------------

/**
 * Loads all coursework data (courses, assignments, classes, ignoredUIDs).
 * Synchronous from active memory/cache, or async from Firestore if specified.
 */
async function loadAll(forceRemote = false) {
  if (isCloudActive()) {
    if (forceRemote && window.PlannerFirebase && typeof window.PlannerFirebase.loadAllUserData === "function") {
      const remoteData = await window.PlannerFirebase.loadAllUserData(currentUser.uid);
      applyCloudDataUpdate(remoteData);
      return remoteData;
    }
    return {
      courses: getStoredCourses(),
      assignments: getStoredAssignments(),
      classes: getStoredClasses(),
      ignoredUIDs: getIgnoredUIDs()
    };
  }

  return getLocalDataSnapshot();
}

/**
 * Unified save/update for an assignment.
 */
async function saveAssignment(assignment) {
  if (!assignment || !assignment.id) return null;
  const assignments = getStoredAssignments();
  const index = assignments.findIndex(a => a.id === assignment.id);
  if (index >= 0) {
    assignments[index] = assignment;
  } else {
    assignments.push(assignment);
  }
  saveStoredAssignments(assignments);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveAssignmentToCloud === "function") {
    await window.PlannerFirebase.saveAssignmentToCloud(currentUser.uid, assignment);
  }
  return assignment;
}

/**
 * Unified save/update for a course.
 */
async function saveCourse(course) {
  if (!course || !course.id) return null;
  const courses = getStoredCourses();
  const index = courses.findIndex(c => c.id === course.id);
  if (index >= 0) {
    courses[index] = course;
  } else {
    courses.push(course);
  }
  saveStoredCourses(courses);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveCourseToCloud === "function") {
    await window.PlannerFirebase.saveCourseToCloud(currentUser.uid, course);
  }
  return course;
}

/**
 * Unified save/update for a class meeting.
 */
async function saveClassMeeting(classMeeting) {
  if (!classMeeting || !classMeeting.id) return null;
  const classes = getStoredClasses();
  const index = classes.findIndex(c => c.id === classMeeting.id);
  if (index >= 0) {
    classes[index] = classMeeting;
  } else {
    classes.push(classMeeting);
  }
  saveStoredClasses(classes);

  if (isCloudActive() && window.PlannerFirebase && typeof window.PlannerFirebase.saveClassMeetingToCloud === "function") {
    await window.PlannerFirebase.saveClassMeetingToCloud(currentUser.uid, classMeeting);
  }
  return classMeeting;
}

/**
 * Permanently erases all cloud data for the authenticated user, or clears local data if signed out.
 */
async function deleteMyData() {
  if (isCloudActive()) {
    const uid = currentUser.uid;
    // Wipe active memory & local user cache
    activeCloudData = { courses: [], assignments: [], classes: [], ignoredUIDs: [] };
    try {
      localStorage.removeItem(`populi_cloud_cache_${uid}`);
    } catch (e) {}

    // Erase in Cloud Firestore
    if (window.PlannerFirebase && typeof window.PlannerFirebase.deleteUserCloudData === "function") {
      await window.PlannerFirebase.deleteUserCloudData(uid);
    }
    return;
  }

  // Local-only mode
  clearAllData();
}

// Expose unified data layer to global scope
window.loadAll = loadAll;
window.saveAssignment = saveAssignment;
window.saveCourse = saveCourse;
window.saveClassMeeting = saveClassMeeting;
window.deleteMyData = deleteMyData;
