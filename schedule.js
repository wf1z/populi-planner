// Currently editing class meeting ID, or null when in Add mode.
let currentEditingClassId = null;

// Stores element that opened the class dialog to restore focus on close.
let lastClassFocusedElement = null;

// Tracks whether mousedown originated on the class dialog backdrop.
let isClassBackdropMouseDown = false;

// Weekday names mapping for Sunday (0) through Saturday (6).
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Converts a "HH:MM" 24-hour time string into total minutes since midnight.
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Formats a 24-hour "HH:MM" string into readable 12-hour format like "9:00 AM".
function format12HourTime(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = String(minutes).padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${period}`;
}

// Formats an hour integer (0-24) into a 12-hour grid label like "8:00 AM".
function formatHourLabel(hour) {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

// Calculates the visible start and end hours for the weekly grid with 1 hour of padding.
function calculateGridHourRange(classes) {
  const timedClasses = (classes || []).filter(c => !c.unscheduled && c.startTime && c.endTime);
  if (timedClasses.length === 0) {
    return { startHour: 8, endHour: 18 };
  }

  let minStart = 24 * 60;
  let maxEnd = 0;

  timedClasses.forEach(c => {
    const start = timeToMinutes(c.startTime);
    const end = timeToMinutes(c.endTime);
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  });

  const startHour = Math.max(0, Math.floor(minStart / 60) - 1);
  const endHour = Math.min(24, Math.ceil(maxEnd / 60) + 1);

  // Maintain at least a 6-hour range for a balanced appearance
  if (endHour - startHour < 6) {
    return { startHour: Math.max(0, startHour - 1), endHour: Math.min(24, endHour + 2) };
  }

  return { startHour, endHour };
}

// Organizes overlapping classes on a given day into side-by-side sub-columns.
function layoutDayOverlaps(dayClasses) {
  if (dayClasses.length === 0) return [];

  // Sort by start time ascending, then by duration descending
  const sorted = [...dayClasses].sort((a, b) => {
    const aStart = timeToMinutes(a.startTime);
    const bStart = timeToMinutes(b.startTime);
    if (aStart !== bStart) return aStart - bStart;
    const aDur = timeToMinutes(a.endTime) - aStart;
    const bDur = timeToMinutes(b.endTime) - bStart;
    return bDur - aDur;
  });

  // Group classes into overlapping clusters
  const clusters = [];
  let currentCluster = [];
  let clusterEnd = -1;

  sorted.forEach(item => {
    const start = timeToMinutes(item.startTime);
    const end = timeToMinutes(item.endTime);

    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = end;
    } else if (start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = end;
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // Assign each class to the first available sub-column within its cluster
  const positioned = [];
  clusters.forEach(cluster => {
    const colEndTimes = [];
    const assignments = [];

    cluster.forEach(item => {
      const start = timeToMinutes(item.startTime);
      const end = timeToMinutes(item.endTime);
      let assignedCol = -1;

      for (let i = 0; i < colEndTimes.length; i++) {
        if (colEndTimes[i] <= start) {
          assignedCol = i;
          colEndTimes[i] = end;
          break;
        }
      }

      if (assignedCol === -1) {
        assignedCol = colEndTimes.length;
        colEndTimes.push(end);
      }

      assignments.push({ item, colIndex: assignedCol });
    });

    const totalCols = colEndTimes.length;
    assignments.forEach(entry => {
      positioned.push({
        item: entry.item,
        colIndex: entry.colIndex,
        totalCols: totalCols
      });
    });
  });

  return positioned;
}

// Renders the weekly time grid (Sunday through Saturday) with positioned class blocks.
function renderWeeklyGrid(classes) {
  const gridContainer = document.getElementById("schedule-grid-container");
  if (!gridContainer) return;

  gridContainer.innerHTML = "";

  const timedClasses = (classes || []).filter(c => !c.unscheduled && c.startTime && c.endTime);
  const { startHour, endHour } = calculateGridHourRange(timedClasses);
  const totalHours = endHour - startHour;
  const totalMinutes = totalHours * 60;
  const gridStartMinutes = startHour * 60;

  const todayDayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Wrapper with horizontal scroll
  const scrollWrapper = document.createElement("div");
  scrollWrapper.className = "schedule-grid-scroll";

  const gridTable = document.createElement("div");
  gridTable.className = "schedule-grid-table";

  // 1. Header row: time corner + 7 weekday headers
  const headerRow = document.createElement("div");
  headerRow.className = "schedule-header-row";

  const corner = document.createElement("div");
  corner.className = "schedule-header-corner";
  headerRow.appendChild(corner);

  WEEKDAY_NAMES.forEach((dayName, dayIndex) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = `schedule-header-day ${dayIndex === todayDayIndex ? "is-today" : ""}`;
    dayHeader.textContent = dayName;
    dayHeader.title = WEEKDAY_FULL_NAMES[dayIndex];
    headerRow.appendChild(dayHeader);
  });
  gridTable.appendChild(headerRow);

  // 2. Body row: time gutter + 7 day columns
  const bodyRow = document.createElement("div");
  bodyRow.className = "schedule-body";

  // Time labels column
  const timeCol = document.createElement("div");
  timeCol.className = "schedule-time-col";
  for (let h = startHour; h < endHour; h++) {
    const slot = document.createElement("div");
    slot.className = "schedule-time-slot";
    slot.textContent = formatHourLabel(h);
    timeCol.appendChild(slot);
  }
  bodyRow.appendChild(timeCol);

  // 7 Day columns with hour divider lines and positioned class blocks
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayCol = document.createElement("div");
    dayCol.className = `schedule-day-column ${dayIndex === todayDayIndex ? "is-today" : ""}`;
    dayCol.dataset.dayIndex = dayIndex;

    // Hour background lines
    for (let h = startHour; h < endHour; h++) {
      const line = document.createElement("div");
      line.className = "schedule-hour-line";
      dayCol.appendChild(line);
    }

    // Filter classes meeting on this day (timed classes only)
    const classesOnDay = timedClasses.filter(c => Array.isArray(c.days) && c.days.includes(dayIndex));
    const positionedList = layoutDayOverlaps(classesOnDay);

    positionedList.forEach(({ item, colIndex, totalCols }) => {
      const classStart = timeToMinutes(item.startTime);
      const classEnd = timeToMinutes(item.endTime);

      const topPercent = ((classStart - gridStartMinutes) / totalMinutes) * 100;
      const heightPercent = ((classEnd - classStart) / totalMinutes) * 100;
      const widthPercent = 100 / totalCols;
      const leftPercent = colIndex * widthPercent;

      const block = document.createElement("div");
      block.className = "schedule-class-block";
      block.style.top = `${topPercent}%`;
      block.style.height = `${heightPercent}%`;
      block.style.width = `calc(${widthPercent}% - 2px)`;
      block.style.left = `calc(${leftPercent}% + 1px)`;
      const course = getCourseById(item.courseId);
      block.style.backgroundColor = getCourseColorVariable(course.colorNumber);

      const timeRangeStr = `${format12HourTime(item.startTime)} - ${format12HourTime(item.endTime)}`;
      block.title = `${course.code} - ${course.name}\n${timeRangeStr}${item.location ? `\nLocation: ${item.location}` : ""}`;

      // Render block contents safely using textContent
      const codeSpan = document.createElement("span");
      codeSpan.className = "class-block-code";
      codeSpan.textContent = course.code;

      const titleSpan = document.createElement("span");
      titleSpan.className = "class-block-title";
      titleSpan.textContent = course.name;

      const timeSpan = document.createElement("span");
      timeSpan.className = "class-block-time";
      timeSpan.textContent = timeRangeStr;

      block.appendChild(codeSpan);
      block.appendChild(titleSpan);
      block.appendChild(timeSpan);

      if (item.location) {
        const locSpan = document.createElement("span");
        locSpan.className = "class-block-location";
        locSpan.textContent = item.location;
        block.appendChild(locSpan);
      }

      // Clicking class block opens edit dialog
      block.addEventListener("click", () => {
        openClassDialog("edit", item);
      });

      dayCol.appendChild(block);
    });

    bodyRow.appendChild(dayCol);
  }

  gridTable.appendChild(bodyRow);
  scrollWrapper.appendChild(gridTable);
  gridContainer.appendChild(scrollWrapper);
}

// Renders the "No set meeting time" section directly below the grid.
function renderUnscheduledSection(classes) {
  const container = document.getElementById("schedule-unscheduled-container");
  if (!container) return;

  container.innerHTML = "";

  const unscheduled = (classes || []).filter(c => Boolean(c.unscheduled));
  if (unscheduled.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  const section = document.createElement("section");
  section.className = "unscheduled-section";

  const header = document.createElement("div");
  header.className = "unscheduled-title";
  const title = document.createElement("h3");
  title.textContent = `No set meeting time (${unscheduled.length})`;
  header.appendChild(title);
  section.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "meetings-grid";

  unscheduled.forEach(item => {
    const card = document.createElement("article");
    card.className = "meeting-card";

    const course = getCourseById(item.courseId);

    // Header: Course code tag + color pill
    const cardHeader = document.createElement("div");
    cardHeader.className = "meeting-card-header";

    const tag = document.createElement("span");
    tag.className = "course-tag";
    tag.textContent = course.code;
    tag.style.borderLeft = `4px solid ${getCourseColorVariable(course.colorNumber)}`;

    cardHeader.appendChild(tag);

    // Title
    const cardTitle = document.createElement("h4");
    cardTitle.className = "meeting-card-title";
    cardTitle.textContent = course.name;

    // Details / Notes
    const details = document.createElement("div");
    details.className = "meeting-card-details";

    const pType = document.createElement("p");
    pType.textContent = "Schedule: No set meeting time";
    details.appendChild(pType);

    if (item.location) {
      const pNotes = document.createElement("p");
      pNotes.textContent = `Notes: ${item.location}`;
      details.appendChild(pNotes);
    }

    // Card Actions (Edit & Delete)
    const actions = document.createElement("div");
    actions.className = "meeting-card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-card-action";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      openClassDialog("edit", item);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-card-action btn-card-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete class meeting "${course.code} - ${course.name}"?`)) {
        deleteClassMeeting(item.id);
        if (typeof window.renderApp === "function") {
          window.renderApp();
        }
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(cardHeader);
    card.appendChild(cardTitle);
    card.appendChild(details);
    card.appendChild(actions);

    grid.appendChild(card);
  });

  section.appendChild(grid);
  container.appendChild(section);
}

// Renders the list of class meetings below the grid with Edit and Delete controls.
function renderMeetingsList(classes) {
  const container = document.getElementById("schedule-meetings-list");
  if (!container) return;

  container.innerHTML = "";

  if (!classes || classes.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "welcome-empty-state";
    const h3 = document.createElement("h3");
    h3.textContent = "No classes scheduled yet";
    const p = document.createElement("p");
    p.textContent = "Add your weekly class meetings to populate your schedule grid.";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-empty-add";
    btn.textContent = "+ Add your first class";
    btn.addEventListener("click", () => openClassDialog("add"));

    emptyNotice.appendChild(h3);
    emptyNotice.appendChild(p);
    emptyNotice.appendChild(btn);
    container.appendChild(emptyNotice);
    return;
  }

  const section = document.createElement("section");
  section.className = "meetings-section";

  const header = document.createElement("div");
  header.className = "meetings-title";
  const title = document.createElement("h3");
  title.textContent = `All Class Meetings (${classes.length})`;
  header.appendChild(title);
  section.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "meetings-grid";

  classes.forEach(item => {
    const course = getCourseById(item.courseId);

    // Header: Course code tag + color pill
    const cardHeader = document.createElement("div");
    cardHeader.className = "meeting-card-header";

    const tag = document.createElement("span");
    tag.className = "course-tag";
    tag.textContent = course.code;
    tag.style.borderLeft = `4px solid ${getCourseColorVariable(course.colorNumber)}`;

    cardHeader.appendChild(tag);

    // Title
    const cardTitle = document.createElement("h4");
    cardTitle.className = "meeting-card-title";
    cardTitle.textContent = course.name;

    // Days & Time details
    const details = document.createElement("div");
    details.className = "meeting-card-details";

    if (item.unscheduled) {
      const pDays = document.createElement("p");
      pDays.textContent = "Schedule: No set meeting time";
      details.appendChild(pDays);

      if (item.location) {
        const pNotes = document.createElement("p");
        pNotes.textContent = `Notes: ${item.location}`;
        details.appendChild(pNotes);
      }
    } else {
      const daysFormatted = (item.days || []).map(d => WEEKDAY_NAMES[d]).join(", ") || "No days";
      const timeFormatted = (item.startTime && item.endTime)
        ? `${format12HourTime(item.startTime)} - ${format12HourTime(item.endTime)}`
        : "Time not set";
      const locationText = item.location ? ` • ${item.location}` : "";

      const pDays = document.createElement("p");
      pDays.textContent = `Days: ${daysFormatted}`;
      const pTime = document.createElement("p");
      pTime.textContent = `Time: ${timeFormatted}${locationText}`;

      details.appendChild(pDays);
      details.appendChild(pTime);
    }

    // Card Actions (Edit & Delete)
    const actions = document.createElement("div");
    actions.className = "meeting-card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-card-action";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      openClassDialog("edit", item);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-card-action btn-card-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Are you sure you want to delete class meeting "${course.code} - ${course.name}"?`)) {
        deleteClassMeeting(item.id);
        if (typeof window.renderApp === "function") {
          window.renderApp();
        }
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(cardHeader);
    card.appendChild(cardTitle);
    card.appendChild(details);
    card.appendChild(actions);

    grid.appendChild(card);
  });

  section.appendChild(grid);
  container.appendChild(section);
}

// Shows or hides day pills and time inputs based on "No set meeting time" checkbox.
function updateUnscheduledVisibility() {
  const unscheduledCheckbox = document.getElementById("class-unscheduled");
  if (!unscheduledCheckbox) return;

  const isUnscheduled = unscheduledCheckbox.checked;
  const daysGroup = document.getElementById("class-days-group");
  const startTimeGroup = document.getElementById("class-start-time-group");
  const endTimeGroup = document.getElementById("class-end-time-group");

  if (daysGroup) daysGroup.style.display = isUnscheduled ? "none" : "block";
  if (startTimeGroup) startTimeGroup.style.display = isUnscheduled ? "none" : "block";
  if (endTimeGroup) endTimeGroup.style.display = isUnscheduled ? "none" : "block";
}

// Opens the native class modal dialog in either Add or Edit mode.
function openClassDialog(mode, meeting = null) {
  lastClassFocusedElement = document.activeElement;
  const dialog = document.getElementById("class-dialog");
  const heading = document.getElementById("class-dialog-heading");
  const submitBtn = document.getElementById("class-form-submit-btn");
  const saveAnotherBtn = document.getElementById("class-form-save-another-btn");
  const errorBox = document.getElementById("class-form-error");

  const courseSelect = document.getElementById("class-course-select");
  const unscheduledCheckbox = document.getElementById("class-unscheduled");
  const startTimeInput = document.getElementById("class-start-time");
  const endTimeInput = document.getElementById("class-end-time");
  const locationInput = document.getElementById("class-location");
  const dayCheckboxes = document.querySelectorAll(".class-day-checkbox");

  errorBox.style.display = "none";
  errorBox.textContent = "";

  if (mode === "edit" && meeting) {
    currentEditingClassId = meeting.id;
    heading.textContent = "Edit Class Meeting";
    submitBtn.textContent = "Save";
    saveAnotherBtn.style.display = "none";

    unscheduledCheckbox.checked = Boolean(meeting.unscheduled);
    locationInput.value = meeting.location || "";

    if (meeting.unscheduled) {
      if (!startTimeInput.value) startTimeInput.value = "09:00";
      if (!endTimeInput.value) endTimeInput.value = "10:15";
      dayCheckboxes.forEach(cb => { cb.checked = false; });
    } else {
      startTimeInput.value = meeting.startTime || "09:00";
      endTimeInput.value = meeting.endTime || "10:15";
      dayCheckboxes.forEach(cb => {
        cb.checked = Array.isArray(meeting.days) && meeting.days.includes(Number(cb.value));
      });
    }

    // Match course dropdown
    let matched = false;
    for (let i = 0; i < courseSelect.options.length; i++) {
      if (courseSelect.options[i].value === meeting.courseId) {
        courseSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const course = getCourseById(meeting.courseId);
      courseSelect.value = "__NEW__";
      document.getElementById("new-class-course-code").value = course.code || "";
      document.getElementById("new-class-course-name").value = (course.name !== course.code) ? (course.name || "") : "";
    }
  } else {
    currentEditingClassId = null;
    heading.textContent = "Add Class Meeting";
    submitBtn.textContent = "Save";
    saveAnotherBtn.style.display = "inline-block";

    unscheduledCheckbox.checked = false;
    startTimeInput.value = "09:00";
    endTimeInput.value = "10:15";
    locationInput.value = "";

    dayCheckboxes.forEach(cb => {
      cb.checked = false;
    });
  }

  updateUnscheduledVisibility();
  updateNewClassCourseVisibility();
  dialog.showModal();
  courseSelect.focus();
}

// Closes the class modal dialog and restores keyboard focus.
function closeClassDialog() {
  const dialog = document.getElementById("class-dialog");
  dialog.close();
  if (lastClassFocusedElement && typeof lastClassFocusedElement.focus === "function") {
    lastClassFocusedElement.focus();
  }
}

// Shows or hides custom course inputs inside the class dialog.
function updateNewClassCourseVisibility() {
  const select = document.getElementById("class-course-select");
  const fields = document.getElementById("new-class-course-fields");
  if (!select || !fields) return;
  fields.style.display = select.value === "__NEW__" ? "grid" : "none";
}

// Reads and validates input fields from the class dialog.
function getValidatedClassValues() {
  const courseSelect = document.getElementById("class-course-select");
  const isUnscheduled = document.getElementById("class-unscheduled").checked;
  const startTime = document.getElementById("class-start-time").value;
  const endTime = document.getElementById("class-end-time").value;
  const location = document.getElementById("class-location").value.trim();
  const errorBox = document.getElementById("class-form-error");

  let courseId = "";

  if (courseSelect.value === "__NEW__") {
    const rawCode = document.getElementById("new-class-course-code").value;
    const cleanCode = normalizeCourseCode(rawCode);
    const rawName = document.getElementById("new-class-course-name").value.trim();
    if (!cleanCode) {
      showClassError("Please enter a course code.");
      return null;
    }
    const courses = getStoredCourses();
    const existing = courses.find(c => normalizeCourseCode(c.code) === cleanCode);
    if (existing) {
      if (rawName && (!existing.name || existing.name === cleanCode)) {
        existing.name = rawName;
        saveStoredCourses(courses);
      }
      courseId = existing.id;
    } else {
      const created = addCourse({ code: cleanCode, name: rawName || cleanCode });
      courseId = created.id;
    }
  } else {
    courseId = courseSelect.value;
    if (!courseId) {
      showClassError("Please select a course.");
      return null;
    }
  }

  // If unscheduled, skip day selection and time validation
  if (isUnscheduled) {
    errorBox.style.display = "none";
    return {
      courseId,
      days: [],
      startTime: null,
      endTime: null,
      location,
      unscheduled: true
    };
  }

  const selectedDays = [];
  document.querySelectorAll(".class-day-checkbox:checked").forEach(cb => {
    selectedDays.push(Number(cb.value));
  });

  if (selectedDays.length === 0) {
    showClassError("Please select at least one day of the week.");
    return null;
  }

  if (!startTime || !endTime) {
    showClassError("Please specify both start and end times.");
    return null;
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (endMin <= startMin) {
    showClassError("End time must be after start time (no overnight classes).");
    return null;
  }

  errorBox.style.display = "none";
  return {
    courseId,
    days: selectedDays,
    startTime,
    endTime,
    location,
    unscheduled: false
  };
}

// Displays an inline error message inside the class modal dialog.
function showClassError(msg) {
  const errorBox = document.getElementById("class-form-error");
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

// Handles standard form submission (Save) for adding or updating class meetings.
function handleClassFormSubmit(event) {
  event.preventDefault();

  const values = getValidatedClassValues();
  if (!values) return;

  if (currentEditingClassId) {
    updateClassMeeting(currentEditingClassId, values);
  } else {
    addClassMeeting(values);
  }

  closeClassDialog();
  if (typeof window.renderApp === "function") {
    window.renderApp();
  }
}

// Handles "Save and add another" by saving the class meeting while keeping course and times.
function handleClassSaveAndAddAnother() {
  const values = getValidatedClassValues();
  if (!values) return;

  addClassMeeting(values);

  // Clear day checkboxes if scheduled, clear location notes
  if (!values.unscheduled) {
    document.querySelectorAll(".class-day-checkbox").forEach(cb => {
      cb.checked = false;
    });
  }
  document.getElementById("class-location").value = "";
  document.getElementById("class-form-error").style.display = "none";

  // Redraw app behind the open dialog
  if (typeof window.renderApp === "function") {
    window.renderApp();
  }
}

// Syncs courses into the class dialog select dropdown.
function syncClassCourseDropdown(coursesList, selectedVal) {
  const select = document.getElementById("class-course-select");
  if (!select) return;

  const currentVal = selectedVal || select.value;
  select.innerHTML = "";

  const courses = coursesList || getStoredCourses();

  courses.forEach(course => {
    const opt = document.createElement("option");
    opt.value = course.id;
    opt.textContent = `${course.code} - ${course.name}`;
    select.appendChild(opt);
  });

  const addCustomOption = document.createElement("option");
  addCustomOption.value = "__NEW__";
  addCustomOption.textContent = "+ Add New Course...";
  select.appendChild(addCustomOption);

  if (currentVal && (courses.some(c => c.id === currentVal) || currentVal === "__NEW__")) {
    select.value = currentVal;
  } else if (courses.length > 0) {
    select.selectedIndex = 0;
  } else {
    select.value = "__NEW__";
  }

  updateNewClassCourseVisibility();
}

// Main rendering function for the Schedule tab.
function renderScheduleTab() {
  const classes = getStoredClasses();
  renderWeeklyGrid(classes);
  renderUnscheduledSection(classes);
  renderMeetingsList(classes);
}

// Initializes event listeners for the class dialog modal.
function initScheduleControls() {
  const dialog = document.getElementById("class-dialog");
  if (!dialog) return;

  document.getElementById("class-form-cancel-btn").addEventListener("click", closeClassDialog);
  document.getElementById("class-dialog-close-btn").addEventListener("click", closeClassDialog);
  document.getElementById("class-form-save-another-btn").addEventListener("click", handleClassSaveAndAddAnother);
  document.getElementById("class-form").addEventListener("submit", handleClassFormSubmit);
  document.getElementById("class-course-select").addEventListener("change", updateNewClassCourseVisibility);
  document.getElementById("class-unscheduled").addEventListener("change", updateUnscheduledVisibility);

  // Safe backdrop click: only close when both mousedown and click happen on dialog backdrop
  dialog.addEventListener("mousedown", event => {
    isClassBackdropMouseDown = (event.target === dialog);
  });
  dialog.addEventListener("click", event => {
    if (isClassBackdropMouseDown && event.target === dialog) {
      closeClassDialog();
    }
    isClassBackdropMouseDown = false;
  });

  dialog.addEventListener("close", () => {
    if (lastClassFocusedElement && typeof lastClassFocusedElement.focus === "function") {
      lastClassFocusedElement.focus();
    }
  });
}

// Expose schedule functions to global scope.
window.renderScheduleTab = renderScheduleTab;
window.openClassDialog = openClassDialog;
window.syncClassCourseDropdown = syncClassCourseDropdown;
window.initScheduleControls = initScheduleControls;
