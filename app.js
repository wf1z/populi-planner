// Three days duration in milliseconds for badge expiration.
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Currently editing assignment ID, or null when in Add mode.
let currentEditingId = null;

// Tracks active tab: "planner" or "schedule".
let currentActiveTab = "planner";

// Stores reference to the element that triggered the assignment dialog for restoring focus on close.
let lastFocusedElement = null;

// Tracks whether mousedown originated on the assignment dialog backdrop.
let isBackdropMouseDown = false;

// Parses a "YYYY-MM-DD" string into a local Date at midnight.
function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Formats a "YYYY-MM-DD" string into a human-friendly string like "Oct 5".
function formatDisplayDate(dateString) {
  const localDate = parseLocalDate(dateString);
  return localDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Calculates the whole number of calendar days between today and the target date.
function getDaysOffsetFromToday(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = parseLocalDate(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Generates the badge element for New or Changed status based on timestamps.
function createBadgeElement(assignment) {
  const now = Date.now();

  // Changed badge check (3 days window)
  if (assignment.lastChanged && assignment.previousDueDate && (now - assignment.lastChanged <= THREE_DAYS_MS)) {
    const badge = document.createElement("span");
    badge.className = "badge badge-changed";
    const oldFormatted = formatDisplayDate(assignment.previousDueDate);
    const newFormatted = formatDisplayDate(assignment.dueDate);
    badge.textContent = `Due date changed (Was ${oldFormatted} → now ${newFormatted})`;
    return badge;
  }

  // New badge check (3 days window)
  if (assignment.firstSeen && (now - assignment.firstSeen <= THREE_DAYS_MS)) {
    const badge = document.createElement("span");
    badge.className = "badge badge-new";
    badge.textContent = "New";
    return badge;
  }

  return null;
}

// Builds a safe assignment card element using textContent to prevent HTML injection.
function createAssignmentCard(assignment) {
  const card = document.createElement("article");
  card.className = `assignment-card ${assignment.planned ? "is-planned" : ""}`;
  card.id = `card-${assignment.id}`;

  // Checkbox wrapper
  const checkboxWrapper = document.createElement("div");
  checkboxWrapper.className = "card-checkbox-wrapper";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "planned-checkbox";
  checkbox.checked = Boolean(assignment.planned);
  checkbox.title = "Mark as planned";
  checkbox.addEventListener("change", function () {
    toggleAssignmentPlanned(assignment.id);
    renderApp();
  });
  checkboxWrapper.appendChild(checkbox);

  // Main card content
  const cardMain = document.createElement("div");
  cardMain.className = "card-main";

  // Card header (Course tag, Badges, and Action buttons)
  const header = document.createElement("div");
  header.className = "card-header";

  const courseTag = document.createElement("span");
  courseTag.className = "course-tag";
  courseTag.textContent = assignment.courseCode;
  courseTag.title = assignment.courseName || assignment.courseCode;
  header.appendChild(courseTag);

  const badgeElement = createBadgeElement(assignment);
  if (badgeElement) {
    header.appendChild(badgeElement);
  }

  // Card Action Buttons (Edit and Delete)
  const actionWrapper = document.createElement("div");
  actionWrapper.className = "card-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-card-action";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", function () {
    openAssignmentDialog("edit", assignment);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-card-action btn-card-delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", function () {
    if (confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      deleteAssignment(assignment.id);
      renderApp();
    }
  });

  actionWrapper.appendChild(editBtn);
  actionWrapper.appendChild(deleteBtn);
  header.appendChild(actionWrapper);

  // Title (rendered safely with textContent)
  const titleEl = document.createElement("h3");
  titleEl.className = "card-title";
  titleEl.textContent = assignment.title;

  // Due Date & Course details (rendered safely with textContent)
  const dueInfo = document.createElement("p");
  dueInfo.className = "card-due-date";
  const formattedDueDate = formatDisplayDate(assignment.dueDate);
  const courseFullName = assignment.courseName ? ` • ${assignment.courseName}` : "";
  dueInfo.textContent = `Due: ${formattedDueDate}${courseFullName}`;

  cardMain.appendChild(header);
  cardMain.appendChild(titleEl);
  cardMain.appendChild(dueInfo);

  card.appendChild(checkboxWrapper);
  card.appendChild(cardMain);

  return card;
}

// Populates a section with sorted cards or displays an empty notice.
function renderSection(containerId, countId, itemsList) {
  const container = document.getElementById(containerId);
  const countBadge = document.getElementById(countId);

  container.innerHTML = "";
  countBadge.textContent = itemsList.length;

  if (itemsList.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-message";
    emptyMsg.textContent = "No assignments in this section.";
    container.appendChild(emptyMsg);
    return;
  }

  itemsList.forEach(function (assignment) {
    const card = createAssignmentCard(assignment);
    container.appendChild(card);
  });
}

// Aggregates and synchronizes shared courses across assignments, classes, and form dropdowns.
function syncAllCourseDropdowns(assignments, classes) {
  const courseFilter = document.getElementById("course-filter");
  const formCourseSelect = document.getElementById("form-course");

  const currentFilterValue = courseFilter ? courseFilter.value : "all";
  const currentFormValue = formCourseSelect ? formCourseSelect.value : null;

  // Gather normalized course map from BOTH assignments and classes
  const courseMap = new Map();

  assignments.forEach(item => {
    const code = normalizeCourseCode(item.courseCode);
    if (code && !courseMap.has(code)) {
      courseMap.set(code, item.courseName || code);
    }
  });

  classes.forEach(item => {
    const code = normalizeCourseCode(item.courseCode);
    if (code && !courseMap.has(code)) {
      courseMap.set(code, item.courseName || code);
    }
  });

  // Rebuild course filter dropdown
  if (courseFilter) {
    courseFilter.innerHTML = '<option value="all">All Courses</option>';
    courseMap.forEach((name, code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = code;
      courseFilter.appendChild(opt);
    });
    if (courseMap.has(currentFilterValue)) {
      courseFilter.value = currentFilterValue;
    } else {
      courseFilter.value = "all";
    }
  }

  // Rebuild assignment form course dropdown
  if (formCourseSelect) {
    formCourseSelect.innerHTML = "";
    courseMap.forEach((name, code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${code} - ${name}`;
      formCourseSelect.appendChild(opt);
    });

    const addCustomOption = document.createElement("option");
    addCustomOption.value = "__NEW__";
    addCustomOption.textContent = "+ Add New Course...";
    formCourseSelect.appendChild(addCustomOption);

    if (currentFormValue && (courseMap.has(currentFormValue) || currentFormValue === "__NEW__")) {
      formCourseSelect.value = currentFormValue;
    } else if (courseMap.size > 0) {
      formCourseSelect.selectedIndex = 0;
    } else {
      formCourseSelect.value = "__NEW__";
    }

    updateNewCourseVisibility();
  }

  // Sync to class dialog dropdown in schedule.js
  if (typeof window.syncClassCourseDropdown === "function") {
    window.syncClassCourseDropdown(courseMap);
  }
}

// Shows or hides the custom course input fields in the assignment dialog.
function updateNewCourseVisibility() {
  const formCourseSelect = document.getElementById("form-course");
  const newCourseFields = document.getElementById("new-course-fields");
  if (!formCourseSelect || !newCourseFields) return;
  const isCustom = formCourseSelect.value === "__NEW__";
  newCourseFields.style.display = isCustom ? "grid" : "none";
}

// Opens the native modal dialog in either Add or Edit mode and focuses the first field.
function openAssignmentDialog(mode, assignment = null) {
  lastFocusedElement = document.activeElement;
  const dialog = document.getElementById("assignment-dialog");

  const heading = document.getElementById("form-heading");
  const submitBtn = document.getElementById("form-submit-btn");
  const saveAnotherBtn = document.getElementById("form-save-another-btn");
  const newCheckboxRow = document.getElementById("form-new-checkbox-row");
  const changedCheckboxRow = document.getElementById("form-changed-checkbox-row");
  const justPostedCheckbox = document.getElementById("form-just-posted");
  const markChangedCheckbox = document.getElementById("form-mark-changed");

  const titleInput = document.getElementById("form-title");
  const dueDateInput = document.getElementById("form-due-date");
  const courseSelect = document.getElementById("form-course");

  if (mode === "edit" && assignment) {
    currentEditingId = assignment.id;
    heading.textContent = "Edit Assignment";
    submitBtn.textContent = "Save";
    saveAnotherBtn.style.display = "none";

    newCheckboxRow.style.display = "none";
    changedCheckboxRow.style.display = "flex";
    markChangedCheckbox.checked = true;

    titleInput.value = assignment.title;
    dueDateInput.value = assignment.dueDate;

    let matched = false;
    for (let i = 0; i < courseSelect.options.length; i++) {
      if (courseSelect.options[i].value === assignment.courseCode) {
        courseSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      courseSelect.value = "__NEW__";
      document.getElementById("new-course-code").value = assignment.courseCode;
      document.getElementById("new-course-name").value = assignment.courseName || "";
    }
  } else {
    currentEditingId = null;
    heading.textContent = "Add Assignment";
    submitBtn.textContent = "Save";
    saveAnotherBtn.style.display = "inline-block";

    newCheckboxRow.style.display = "flex";
    changedCheckboxRow.style.display = "none";
    justPostedCheckbox.checked = false;

    titleInput.value = "";
    if (!dueDateInput.value) {
      dueDateInput.value = formatLocalYYYYMMDD(new Date());
    }
  }

  updateNewCourseVisibility();
  dialog.showModal();
  titleInput.focus();
}

// Closes the assignment modal dialog and restores keyboard focus to the triggering element.
function closeAssignmentDialog() {
  const dialog = document.getElementById("assignment-dialog");
  dialog.close();
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

// Reads and validates inputs from the assignment dialog.
function getValidatedFormValues() {
  const title = document.getElementById("form-title").value.trim();
  const dueDate = document.getElementById("form-due-date").value;
  const courseSelectValue = document.getElementById("form-course").value;

  let courseCode = "";
  let courseName = "";

  if (courseSelectValue === "__NEW__") {
    courseCode = normalizeCourseCode(document.getElementById("new-course-code").value);
    courseName = document.getElementById("new-course-name").value.trim() || courseCode;
    if (!courseCode) {
      alert("Please enter a course code.");
      return null;
    }
  } else {
    courseCode = normalizeCourseCode(courseSelectValue);
    const assignments = getStoredAssignments();
    const classes = getStoredClasses();
    const match = [...assignments, ...classes].find(item => normalizeCourseCode(item.courseCode) === courseCode);
    courseName = match ? (match.courseName || courseCode) : courseCode;
  }

  if (!title || !dueDate) {
    alert("Please fill in both a title and due date.");
    return null;
  }

  return { title, dueDate, courseCode, courseName };
}

// Handles standard form submission (Save) for adding or updating an assignment.
function handleFormSubmit(event) {
  event.preventDefault();

  const values = getValidatedFormValues();
  if (!values) return;

  if (currentEditingId) {
    const markDueDateChanged = document.getElementById("form-mark-changed").checked;
    updateAssignment(currentEditingId, values, markDueDateChanged);
  } else {
    const isJustPosted = document.getElementById("form-just-posted").checked;
    addAssignment({
      courseCode: values.courseCode,
      courseName: values.courseName,
      title: values.title,
      dueDate: values.dueDate,
      isJustPosted: isJustPosted
    });
  }

  closeAssignmentDialog();
  renderApp();
}

// Handles "Save and add another" by saving the item, keeping course/date, and resetting title.
function handleSaveAndAddAnother() {
  const values = getValidatedFormValues();
  if (!values) return;

  const isJustPosted = document.getElementById("form-just-posted").checked;
  addAssignment({
    courseCode: values.courseCode,
    courseName: values.courseName,
    title: values.title,
    dueDate: values.dueDate,
    isJustPosted: isJustPosted
  });

  // Keep course and due date intact, clear title and uncheck 'just posted'
  const titleInput = document.getElementById("form-title");
  titleInput.value = "";
  document.getElementById("form-just-posted").checked = false;
  titleInput.focus();

  // Redraw page behind the modal
  renderApp();
}

// Switches between the Planner and Schedule tabs and toggles views and action buttons.
function switchTab(tabName) {
  currentActiveTab = tabName;

  const plannerTab = document.getElementById("tab-btn-planner");
  const scheduleTab = document.getElementById("tab-btn-schedule");
  const plannerPanel = document.getElementById("panel-planner");
  const schedulePanel = document.getElementById("panel-schedule");
  const topActionBtn = document.getElementById("top-action-btn");

  if (tabName === "planner") {
    plannerTab.setAttribute("aria-selected", "true");
    scheduleTab.setAttribute("aria-selected", "false");
    plannerPanel.style.display = "block";
    schedulePanel.style.display = "none";

    topActionBtn.style.display = "inline-block";
    topActionBtn.textContent = "+ Add assignment";
  } else {
    plannerTab.setAttribute("aria-selected", "false");
    scheduleTab.setAttribute("aria-selected", "true");
    plannerPanel.style.display = "none";
    schedulePanel.style.display = "block";

    topActionBtn.style.display = "inline-block";
    topActionBtn.textContent = "+ Add class";
  }
}

// Renders all assignment sections, the calendar, and the schedule, preserving active focus.
function renderApp() {
  const assignmentDialog = document.getElementById("assignment-dialog");
  const classDialog = document.getElementById("class-dialog");
  const isDialogOpen = (assignmentDialog && assignmentDialog.open) || (classDialog && classDialog.open);

  // Capture active focus if dialog is not open
  const activeEl = document.activeElement;
  const activeId = (!isDialogOpen && activeEl) ? activeEl.id : null;
  const activeDateKey = (!isDialogOpen && activeEl && activeEl.dataset) ? activeEl.dataset.dateKey : null;

  const allAssignments = getStoredAssignments();
  const allClasses = getStoredClasses();
  const selectedCourse = document.getElementById("course-filter").value;
  const welcomeBox = document.getElementById("welcome-empty-state");

  // Sync courses across assignments, classes, and dialog dropdowns
  syncAllCourseDropdowns(allAssignments, allClasses);

  // Show welcome state if no assignments exist at all
  if (allAssignments.length === 0) {
    welcomeBox.style.display = "block";
  } else {
    welcomeBox.style.display = "none";
  }

  // Filter items by course filter
  const filtered = allAssignments.filter(item => {
    return selectedCourse === "all" || item.courseCode === selectedCourse;
  });

  // Buckets
  const overdueList = [];
  const todayList = [];
  const thisWeekList = [];
  const laterList = [];

  filtered.forEach(item => {
    const daysOffset = getDaysOffsetFromToday(item.dueDate);
    if (daysOffset < 0) {
      overdueList.push(item);
    } else if (daysOffset === 0) {
      todayList.push(item);
    } else if (daysOffset >= 1 && daysOffset <= 7) {
      thisWeekList.push(item);
    } else {
      laterList.push(item);
    }
  });

  // Sort each list soonest first by due date
  const dateSorter = (a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return a.title.localeCompare(b.title);
  };

  overdueList.sort(dateSorter);
  todayList.sort(dateSorter);
  thisWeekList.sort(dateSorter);
  laterList.sort(dateSorter);

  // Toggle Overdue section visibility (only display when overdue items exist)
  const overdueSection = document.getElementById("section-overdue");
  if (overdueList.length > 0) {
    overdueSection.style.display = "block";
    renderSection("cards-overdue", "count-overdue", overdueList);
  } else {
    overdueSection.style.display = "none";
  }

  renderSection("cards-today", "count-today", todayList);
  renderSection("cards-this-week", "count-this-week", thisWeekList);
  renderSection("cards-later", "count-later", laterList);

  // Redraw month calendar using the same course-filtered list
  if (typeof window.renderCalendar === "function") {
    window.renderCalendar(filtered);
  }

  // Redraw Schedule tab (weekly grid & class meetings list)
  if (typeof window.renderScheduleTab === "function") {
    window.renderScheduleTab();
  }

  // Ensure active tab view is preserved
  switchTab(currentActiveTab);

  // Restore keyboard focus only if neither dialog is open
  if (!isDialogOpen) {
    if (activeId && document.getElementById(activeId)) {
      document.getElementById(activeId).focus();
    } else if (activeDateKey) {
      const dayBtn = document.querySelector(`.calendar-day[data-date-key="${activeDateKey}"]`);
      if (dayBtn) {
        dayBtn.focus();
      }
    }
  }
}

// Expose renderApp globally so other modules can trigger unified redraws.
window.renderApp = renderApp;

// Connects toolbar, forms, modals, tabs, and initiates first render.
document.addEventListener("DOMContentLoaded", function () {
  const assignmentDialog = document.getElementById("assignment-dialog");

  // Tab switching
  document.getElementById("tab-btn-planner").addEventListener("click", () => switchTab("planner"));
  document.getElementById("tab-btn-schedule").addEventListener("click", () => switchTab("schedule"));

  // Top action button (+ Add assignment or + Add class)
  document.getElementById("top-action-btn").addEventListener("click", function () {
    if (currentActiveTab === "planner") {
      openAssignmentDialog("add");
    } else {
      if (typeof window.openClassDialog === "function") {
        window.openClassDialog("add");
      }
    }
  });

  // Empty state button
  document.getElementById("btn-empty-add").addEventListener("click", function () {
    openAssignmentDialog("add");
  });

  // Assignment dialog controls
  document.getElementById("form-cancel-btn").addEventListener("click", closeAssignmentDialog);
  document.getElementById("dialog-close-btn").addEventListener("click", closeAssignmentDialog);
  document.getElementById("form-save-another-btn").addEventListener("click", handleSaveAndAddAnother);
  document.getElementById("assignment-form").addEventListener("submit", handleFormSubmit);
  document.getElementById("form-course").addEventListener("change", updateNewCourseVisibility);

  // Safe backdrop click handling for assignment dialog
  assignmentDialog.addEventListener("mousedown", function (event) {
    isBackdropMouseDown = (event.target === assignmentDialog);
  });
  assignmentDialog.addEventListener("click", function (event) {
    if (isBackdropMouseDown && event.target === assignmentDialog) {
      closeAssignmentDialog();
    }
    isBackdropMouseDown = false;
  });

  assignmentDialog.addEventListener("close", function () {
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  });

  // Course filter change
  document.getElementById("course-filter").addEventListener("change", renderApp);

  // Toolbar: Load Sample Data (loads both assignments and classes)
  document.getElementById("btn-load-sample").addEventListener("click", function () {
    const existingAssignments = getStoredAssignments();
    const existingClasses = getStoredClasses();

    if (existingAssignments.length > 0 || existingClasses.length > 0) {
      if (!confirm("Loading sample data will replace your current assignments and classes. Continue?")) {
        return;
      }
    }

    const freshAssignments = window.getFreshSampleAssignments ? window.getFreshSampleAssignments() : [];
    const freshClasses = window.getFreshSampleClasses ? window.getFreshSampleClasses() : [];

    saveStoredAssignments(freshAssignments);
    saveStoredClasses(freshClasses);
    renderApp();
  });

  // Toolbar: Clear All Data (clears assignments, classes, and course colors)
  document.getElementById("btn-clear-all").addEventListener("click", function () {
    if (confirm("Are you sure you want to clear ALL assignments, classes, and settings? This cannot be undone.")) {
      clearAllData();
      renderApp();
    }
  });

  // Toolbar: Export Backup
  document.getElementById("btn-export").addEventListener("click", function () {
    exportBackup();
  });

  // Toolbar: Import Backup
  const fileInput = document.getElementById("import-file-input");
  document.getElementById("btn-import").addEventListener("click", function () {
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const result = validateBackupJSON(e.target.result);
      if (!result.valid) {
        alert("Import Failed:\n" + result.error);
        return;
      }

      const countMsg = result.version === 2
        ? `${result.assignments.length} assignments and ${result.classes.length} class meetings`
        : `${result.assignments.length} assignments (Version 1 backup - existing class schedule will remain intact)`;

      if (confirm(`Valid backup found with ${countMsg}.\n\nImporting this backup will REPLACE corresponding data. Are you sure you want to proceed?`)) {
        saveStoredAssignments(result.assignments);

        if (result.version === 2 && Array.isArray(result.classes)) {
          saveStoredClasses(result.classes);
        }
        if (result.courseColors) {
          saveCourseColorMap(result.courseColors);
        }

        renderApp();
        alert("Backup imported successfully!");
      }
    };
    reader.readAsText(file);
  });

  // Initialize calendar controls (Prev, Next, Today)
  if (typeof window.initCalendarControls === "function") {
    window.initCalendarControls();
  }

  // Initialize schedule controls (Class dialog controls)
  if (typeof window.initScheduleControls === "function") {
    window.initScheduleControls();
  }

  // First initial render
  renderApp();
});
