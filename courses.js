// ==========================================================================
// COURSES MANAGEMENT CONTROLLER & VIEW (Stage 2)
// ==========================================================================

// Currently editing course ID, or null when in Add mode.
let currentEditingCourseId = null;

// Stores element that opened the course dialog to restore focus on close.
let lastCourseFocusedElement = null;

// Tracks whether mousedown originated on the course dialog backdrop.
let isCourseBackdropMouseDown = false;

// Generates the human-readable summary for a course card.
function getCourseCardSummary(course, assignments, classes) {
  const openAssignments = assignments.filter(a => a.courseId === course.id && !a.planned);
  const openCount = openAssignments.length;
  const assignText = `${openCount} open assignment${openCount === 1 ? "" : "s"}`;

  const courseMeetings = classes.filter(c => c.courseId === course.id);
  let meetText = "";

  if (courseMeetings.length === 0) {
    meetText = "No class meetings";
  } else {
    const allUnscheduled = courseMeetings.every(c => Boolean(c.unscheduled));
    if (allUnscheduled) {
      meetText = "No set meeting time";
    } else {
      const timedCount = courseMeetings.filter(c => !c.unscheduled).length;
      const unschedCount = courseMeetings.filter(c => c.unscheduled).length;
      if (unschedCount === 0) {
        meetText = `${timedCount} class meeting${timedCount === 1 ? "" : "s"}`;
      } else {
        meetText = `${timedCount} class meeting${timedCount === 1 ? "" : "s"}, ${unschedCount} unscheduled`;
      }
    }
  }

  return `${assignText} • ${meetText}`;
}

// Renders the Courses tab list of course cards or displays empty state.
function renderCoursesTab() {
  const emptyBox = document.getElementById("courses-empty-state");
  const listContainer = document.getElementById("courses-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  const courses = getStoredCourses();
  const assignments = getStoredAssignments();
  const classes = getStoredClasses();

  if (courses.length === 0) {
    if (emptyBox) emptyBox.style.display = "block";
    return;
  }

  if (emptyBox) emptyBox.style.display = "none";

  // Sort courses alphabetically by course code (case-insensitive)
  const sortedCourses = [...courses].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { sensitivity: "base" })
  );

  sortedCourses.forEach(course => {
    const card = document.createElement("article");
    card.className = "course-card";
    card.id = `course-card-${course.id}`;

    // Top Row: Code badge with color bar + Edit/Delete actions
    const topRow = document.createElement("div");
    topRow.className = "course-card-top";

    const codeBadge = document.createElement("span");
    codeBadge.className = "course-card-code";
    codeBadge.textContent = course.code;
    codeBadge.style.borderLeft = `5px solid ${getCourseColorVariable(course.colorNumber)}`;
    topRow.appendChild(codeBadge);

    const actions = document.createElement("div");
    actions.className = "course-card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-card-action";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("aria-label", `Edit course ${course.code}`);
    editBtn.addEventListener("click", () => {
      openCourseDialog("edit", course);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-card-action btn-card-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete course ${course.code}`);
    deleteBtn.addEventListener("click", () => {
      handleDeleteCourseClick(course);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    topRow.appendChild(actions);

    // Title / Course Name
    const titleEl = document.createElement("h3");
    titleEl.className = "course-card-title";
    titleEl.textContent = course.name;

    // Summary line
    const summaryEl = document.createElement("p");
    summaryEl.className = "course-card-summary";
    summaryEl.textContent = getCourseCardSummary(course, assignments, classes);

    card.appendChild(topRow);
    card.appendChild(titleEl);
    card.appendChild(summaryEl);

    listContainer.appendChild(card);
  });
}

// Handles course deletion with warning on cascading deletions.
function handleDeleteCourseClick(course) {
  const assignments = getStoredAssignments().filter(a => a.courseId === course.id);
  const classes = getStoredClasses().filter(c => c.courseId === course.id);

  const assignCount = assignments.length;
  const meetCount = classes.length;

  let confirmPrompt = `Are you sure you want to delete course "${course.code} - ${course.name}"?`;
  if (assignCount > 0 || meetCount > 0) {
    confirmPrompt += `\n\nThis will permanently delete ${assignCount} assignment${assignCount === 1 ? "" : "s"} and ${meetCount} class meeting${meetCount === 1 ? "" : "s"}. This action cannot be undone.`;
  } else {
    confirmPrompt += `\n\nNo assignments or class meetings will be affected.`;
  }

  if (confirm(confirmPrompt)) {
    deleteCourse(course.id);
    if (typeof window.renderApp === "function") {
      window.renderApp();
    }
  }
}

// Opens the native course modal dialog in either Add or Edit mode.
function openCourseDialog(mode, course = null) {
  lastCourseFocusedElement = document.activeElement;
  const dialog = document.getElementById("course-dialog");
  const heading = document.getElementById("course-dialog-heading");
  const submitBtn = document.getElementById("course-form-submit-btn");
  const errorBox = document.getElementById("course-form-error");

  const codeInput = document.getElementById("course-form-code");
  const nameInput = document.getElementById("course-form-name");

  errorBox.style.display = "none";
  errorBox.textContent = "";

  if (mode === "edit" && course) {
    currentEditingCourseId = course.id;
    heading.textContent = "Edit Course";
    submitBtn.textContent = "Save";

    codeInput.value = course.code;
    nameInput.value = (course.name !== course.code) ? course.name : "";

    selectColorSwatch(course.colorNumber || 1);
  } else {
    currentEditingCourseId = null;
    heading.textContent = "Add Course";
    submitBtn.textContent = "Save";

    codeInput.value = "";
    nameInput.value = "";

    const autoColor = allocateColorNumber();
    selectColorSwatch(autoColor);
  }

  dialog.showModal();
  codeInput.focus();
}

// Selects a specific color number in the color radio swatch group.
function selectColorSwatch(colorNum) {
  const num = Number(colorNum) || 1;
  const targetRadio = document.querySelector(`input[name="course-color-choice"][value="${num}"]`);
  if (targetRadio) {
    targetRadio.checked = true;
  }
}

// Closes the course modal dialog and restores keyboard focus.
function closeCourseDialog() {
  const dialog = document.getElementById("course-dialog");
  dialog.close();
  if (lastCourseFocusedElement && typeof lastCourseFocusedElement.focus === "function") {
    lastCourseFocusedElement.focus();
  }
}

// Displays an inline error message inside the course dialog.
function showCourseError(msg) {
  const errorBox = document.getElementById("course-form-error");
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

// Handles course form submission (Save).
function handleCourseFormSubmit(event) {
  event.preventDefault();

  const codeInput = document.getElementById("course-form-code");
  const nameInput = document.getElementById("course-form-name");
  const rawCode = codeInput.value;
  const cleanCode = normalizeCourseCode(rawCode);
  const rawName = nameInput.value.trim();

  if (!cleanCode) {
    showCourseError("Please enter a course code.");
    codeInput.focus();
    return;
  }

  // Validate duplicate course code
  const courses = getStoredCourses();
  const duplicate = courses.find(c =>
    c.id !== currentEditingCourseId && normalizeCourseCode(c.code) === cleanCode
  );

  if (duplicate) {
    showCourseError(`A course with the code "${cleanCode}" already exists.`);
    codeInput.focus();
    return;
  }

  // Get selected color number (1-8)
  const checkedRadio = document.querySelector('input[name="course-color-choice"]:checked');
  const chosenColor = checkedRadio ? Number(checkedRadio.value) : 1;

  if (currentEditingCourseId) {
    updateCourse(currentEditingCourseId, {
      code: cleanCode,
      name: rawName || cleanCode,
      colorNumber: chosenColor
    });
  } else {
    addCourse({
      code: cleanCode,
      name: rawName || cleanCode,
      colorNumber: chosenColor,
      source: "manual"
    });
  }

  closeCourseDialog();
  if (typeof window.renderApp === "function") {
    window.renderApp();
  }
}

// Initializes event listeners for the course dialog and controls.
function initCourseControls() {
  const dialog = document.getElementById("course-dialog");
  if (!dialog) return;

  document.getElementById("course-form-cancel-btn").addEventListener("click", closeCourseDialog);
  document.getElementById("course-dialog-close-btn").addEventListener("click", closeCourseDialog);
  document.getElementById("course-form").addEventListener("submit", handleCourseFormSubmit);

  const emptyAddBtn = document.getElementById("btn-courses-empty-add");
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener("click", () => openCourseDialog("add"));
  }

  // Safe backdrop click handling
  dialog.addEventListener("mousedown", event => {
    isCourseBackdropMouseDown = (event.target === dialog);
  });
  dialog.addEventListener("click", event => {
    if (isCourseBackdropMouseDown && event.target === dialog) {
      closeCourseDialog();
    }
    isCourseBackdropMouseDown = false;
  });

  dialog.addEventListener("close", () => {
    if (lastCourseFocusedElement && typeof lastCourseFocusedElement.focus === "function") {
      lastCourseFocusedElement.focus();
    }
  });
}

// Expose course functions to global scope.
window.renderCoursesTab = renderCoursesTab;
window.openCourseDialog = openCourseDialog;
window.initCourseControls = initCourseControls;
