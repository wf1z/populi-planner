// Keys for storing assignments, classes, and course color mappings in localStorage.
const STORAGE_KEY = "populi_assignments";
const CLASSES_STORAGE_KEY = "populi_classes";
const COURSE_COLORS_KEY = "populi_course_colors";

// Normalizes course codes by trimming, collapsing inner spaces, and upper-casing.
function normalizeCourseCode(code) {
  if (!code) return "";
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

// Generates a collision-resistant ID using a prefix, current timestamp, and random characters.
function generateUniqueId(prefix = "assign") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Retrieves all saved assignments from localStorage.
function getStoredAssignments() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of assignments into localStorage.
function saveStoredAssignments(assignments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// Retrieves all saved class meetings from localStorage.
function getStoredClasses() {
  const data = localStorage.getItem(CLASSES_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Saves the entire list of class meetings into localStorage.
function saveStoredClasses(classes) {
  localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes));
}

// Retrieves the saved course color number mapping from localStorage.
function getCourseColorMap() {
  const data = localStorage.getItem(COURSE_COLORS_KEY);
  return data ? JSON.parse(data) : {};
}

// Saves the course color mapping into localStorage.
function saveCourseColorMap(map) {
  localStorage.setItem(COURSE_COLORS_KEY, JSON.stringify(map));
}

// Determines and persists the course color variable, assigning the first unused color 1-6.
function getCourseColorVariable(courseCode) {
  const normalized = normalizeCourseCode(courseCode);
  if (!normalized) return "var(--course-color-1)";

  const map = getCourseColorMap();
  if (map[normalized]) {
    return `var(--course-color-${map[normalized]})`;
  }

  // Find first unused color number from 1 to 6
  const usedNumbers = new Set(Object.values(map));
  let assigned = 1;
  for (let i = 1; i <= 6; i++) {
    if (!usedNumbers.has(i)) {
      assigned = i;
      break;
    }
  }

  // If all 6 colors are in use, wrap around based on count
  if (usedNumbers.size >= 6) {
    assigned = (Object.keys(map).length % 6) + 1;
  }

  map[normalized] = assigned;
  saveCourseColorMap(map);
  return `var(--course-color-${assigned})`;
}

// Creates and saves a new manual assignment with a normalized course code.
function addAssignment(data) {
  const assignments = getStoredAssignments();
  const cleanCode = normalizeCourseCode(data.courseCode);

  const newAssignment = {
    id: generateUniqueId("assign"),
    courseCode: cleanCode,
    courseName: data.courseName.trim() || cleanCode,
    title: data.title.trim(),
    dueDate: data.dueDate,
    planned: false,
    firstSeen: data.isJustPosted ? Date.now() : null,
    lastChanged: null,
    previousDueDate: null,
    source: "manual"
  };

  // Ensure course is registered in color map
  getCourseColorVariable(cleanCode);

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
  const cleanCode = normalizeCourseCode(data.courseCode);

  if (markDueDateChanged && data.dueDate !== oldDueDate) {
    current.previousDueDate = oldDueDate;
    current.lastChanged = Date.now();
  }

  current.courseCode = cleanCode;
  current.courseName = data.courseName.trim() || cleanCode;
  current.title = data.title.trim();
  current.dueDate = data.dueDate;

  // Ensure course is registered in color map
  getCourseColorVariable(cleanCode);

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

// Creates and saves a new class meeting with normalized course code.
function addClassMeeting(data) {
  const classes = getStoredClasses();
  const cleanCode = normalizeCourseCode(data.courseCode);
  const isUnscheduled = Boolean(data.unscheduled);

  const newClass = {
    id: generateUniqueId("meeting"),
    courseCode: cleanCode,
    courseName: data.courseName.trim() || cleanCode,
    days: isUnscheduled ? [] : (data.days || []).map(Number).sort((a, b) => a - b),
    startTime: isUnscheduled ? null : (data.startTime || null),
    endTime: isUnscheduled ? null : (data.endTime || null),
    location: (data.location || "").trim(),
    source: data.source || "manual",
    unscheduled: isUnscheduled
  };

  // Ensure course is registered in color map
  getCourseColorVariable(cleanCode);

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
  const cleanCode = normalizeCourseCode(data.courseCode);
  const isUnscheduled = Boolean(data.unscheduled);

  current.courseCode = cleanCode;
  current.courseName = data.courseName.trim() || cleanCode;
  current.days = isUnscheduled ? [] : (data.days || []).map(Number).sort((a, b) => a - b);
  current.startTime = isUnscheduled ? null : (data.startTime || null);
  current.endTime = isUnscheduled ? null : (data.endTime || null);
  current.location = (data.location || "").trim();
  current.unscheduled = isUnscheduled;

  // Ensure course is registered in color map
  getCourseColorVariable(cleanCode);

  classes[index] = current;
  saveStoredClasses(classes);
  return current;
}

// Deletes a single class meeting by its ID.
function deleteClassMeeting(id) {
  const classes = getStoredClasses().filter(item => item.id !== id);
  saveStoredClasses(classes);
}

// Clears all stored assignments, class meetings, and course color mappings from localStorage.
function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CLASSES_STORAGE_KEY);
  localStorage.removeItem(COURSE_COLORS_KEY);
}

// Triggers a browser download of current assignments and classes as a Version 2 backup file.
function exportBackup() {
  const assignments = getStoredAssignments();
  const classes = getStoredClasses();
  const courseColors = getCourseColorMap();

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    assignments: assignments,
    classes: classes,
    courseColors: courseColors
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

// Validates imported JSON data supporting Version 1 and Version 2 formats.
function validateBackupJSON(rawText) {
  try {
    const data = JSON.parse(rawText);
    if (!data || typeof data !== "object") {
      return { valid: false, error: "The file does not contain valid JSON." };
    }

    if (data.version !== 1 && data.version !== 2) {
      return { valid: false, error: "Unsupported backup version. Expected version 1 or 2." };
    }

    if (!Array.isArray(data.assignments)) {
      return { valid: false, error: "Missing 'assignments' list in backup file." };
    }

    // Validate assignments list
    for (let i = 0; i < data.assignments.length; i++) {
      const item = data.assignments[i];
      if (!item.id || !item.title || !item.dueDate || !item.courseCode) {
        return { valid: false, error: `Assignment #${i + 1} is missing required fields (id, title, dueDate, courseCode).` };
      }
    }

    // If Version 2, validate class meetings
    if (data.version === 2) {
      if (!Array.isArray(data.classes)) {
        return { valid: false, error: "Missing 'classes' list in Version 2 backup file." };
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

      return {
        valid: true,
        version: 2,
        assignments: data.assignments,
        classes: data.classes,
        courseColors: (data.courseColors && typeof data.courseColors === "object") ? data.courseColors : null
      };
    }

    // Version 1 backward compatibility: returns assignments only
    return {
      valid: true,
      version: 1,
      assignments: data.assignments,
      classes: null,
      courseColors: null
    };

  } catch (err) {
    return { valid: false, error: "Could not parse JSON file: " + err.message };
  }
}
