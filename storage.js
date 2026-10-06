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

// Retrieves all saved courses from localStorage.
function getStoredCourses() {
  const data = localStorage.getItem(COURSES_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of courses into localStorage.
function saveStoredCourses(courses) {
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
  const courses = getStoredCourses().filter(c => c.id !== id);
  const assignments = getStoredAssignments().filter(a => a.courseId !== id);
  const classes = getStoredClasses().filter(c => c.courseId !== id);

  saveStoredCourses(courses);
  saveStoredAssignments(assignments);
  saveStoredClasses(classes);
}

// --------------------------------------------------------------------------
// ASSIGNMENT STORAGE HELPERS
// --------------------------------------------------------------------------

// Retrieves all saved assignments from localStorage.
function getStoredAssignments() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of assignments into localStorage.
function saveStoredAssignments(assignments) {
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
    firstSeen: data.isJustPosted ? Date.now() : null,
    lastChanged: null,
    previousDueDate: null,
    source: "manual"
  };

  assignments.push(newAssignment);
  saveStoredAssignments(assignments);
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
  return current;
}

// Toggles the planned checkbox status of an assignment.
function toggleAssignmentPlanned(id) {
  const assignments = getStoredAssignments();
  const assignment = assignments.find(item => item.id === id);
  if (assignment) {
    assignment.planned = !assignment.planned;
    saveStoredAssignments(assignments);
  }
}

// Deletes a single assignment by its ID.
function deleteAssignment(id) {
  const assignments = getStoredAssignments().filter(item => item.id !== id);
  saveStoredAssignments(assignments);
}

// --------------------------------------------------------------------------
// CLASS MEETING STORAGE HELPERS
// --------------------------------------------------------------------------

// Retrieves all saved class meetings from localStorage.
function getStoredClasses() {
  const data = localStorage.getItem(CLASSES_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of class meetings into localStorage.
function saveStoredClasses(classes) {
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
    unscheduled: isUnscheduled
  };

  classes.push(newClass);
  saveStoredClasses(classes);
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

  classes[index] = current;
  saveStoredClasses(classes);
  return current;
}

// Deletes a single class meeting by its ID.
function deleteClassMeeting(id) {
  const classes = getStoredClasses().filter(item => item.id !== id);
  saveStoredClasses(classes);
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
  saveStoredCourses([]);
  saveStoredAssignments([]);
  saveStoredClasses([]);
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
    classes: classes
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
        classes: data.classes
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
