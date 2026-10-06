// Key for storing the unified assignments list in localStorage.
const STORAGE_KEY = "populi_assignments";

// Generates a collision-resistant ID using current timestamp and random characters.
function generateUniqueId() {
  return "assign-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
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

// Creates and saves a new manual assignment.
function addAssignment(data) {
  const assignments = getStoredAssignments();
  const newAssignment = {
    id: generateUniqueId(),
    courseCode: data.courseCode.trim(),
    courseName: data.courseName.trim(),
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

  current.courseCode = data.courseCode.trim();
  current.courseName = data.courseName.trim();
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

// Clears all stored assignments from localStorage.
function clearAllAssignments() {
  localStorage.removeItem(STORAGE_KEY);
}

// Triggers a browser download of the current data as a versioned JSON backup file.
function exportBackup() {
  const assignments = getStoredAssignments();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    assignments: assignments
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

// Validates imported JSON data for expected structure and required assignment properties.
function validateBackupJSON(rawText) {
  try {
    const data = JSON.parse(rawText);
    if (!data || typeof data !== "object") {
      return { valid: false, error: "The file does not contain valid JSON." };
    }
    if (data.version !== 1) {
      return { valid: false, error: "Unsupported backup version. Expected version: 1." };
    }
    if (!Array.isArray(data.assignments)) {
      return { valid: false, error: "Missing 'assignments' list in backup file." };
    }

    for (let i = 0; i < data.assignments.length; i++) {
      const item = data.assignments[i];
      if (!item.id || !item.title || !item.dueDate || !item.courseCode) {
        return { valid: false, error: `Assignment #${i + 1} is missing required fields (id, title, dueDate, courseCode).` };
      }
    }

    return { valid: true, assignments: data.assignments };
  } catch (err) {
    return { valid: false, error: "Could not parse JSON file: " + err.message };
  }
}
