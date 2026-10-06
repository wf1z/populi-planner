// Key used to store planned assignment IDs in the browser's localStorage.
const LOCAL_STORAGE_KEY = "populi_planned_assignments";

// Returns a Date object shifted by a specific number of days relative to today.
function getRelativeDate(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

// Formats a Date object into a readable string like "Oct 5".
function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Reads the list of saved "planned" assignment IDs from localStorage.
function getPlannedIds() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

// Saves the list of "planned" assignment IDs to localStorage.
function savePlannedIds(plannedIds) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plannedIds));
}

// Toggles an assignment's planned status and updates both storage and the card display.
function togglePlannedStatus(assignmentId, isChecked) {
  const plannedIds = getPlannedIds();
  const idIndex = plannedIds.indexOf(assignmentId);

  if (isChecked && idIndex === -1) {
    plannedIds.push(assignmentId);
  } else if (!isChecked && idIndex !== -1) {
    plannedIds.splice(idIndex, 1);
  }

  savePlannedIds(plannedIds);

  const cardElement = document.getElementById(`card-${assignmentId}`);
  if (cardElement) {
    cardElement.classList.toggle("is-planned", isChecked);
  }
}

// Creates the HTML element for an assignment badge (New or Due date changed).
function createBadgeElement(assignment, dueDateFormatted) {
  if (assignment.status === "new") {
    const badge = document.createElement("span");
    badge.className = "badge badge-new";
    badge.textContent = "New";
    return badge;
  }

  if (assignment.status === "changed" && assignment.previousDueDaysOffset !== null) {
    const prevDate = getRelativeDate(assignment.previousDueDaysOffset);
    const prevFormatted = formatDate(prevDate);
    const badge = document.createElement("span");
    badge.className = "badge badge-changed";
    badge.textContent = `Due date changed (Was ${prevFormatted} → now ${dueDateFormatted})`;
    return badge;
  }

  return null;
}

// Builds a single assignment card element with course tag, title, due date, badge, and checkbox.
function createAssignmentCard(assignment, isPlanned) {
  const dueDate = getRelativeDate(assignment.dueDaysOffset);
  const dueDateFormatted = formatDate(dueDate);

  const card = document.createElement("article");
  card.className = `assignment-card ${isPlanned ? "is-planned" : ""}`;
  card.id = `card-${assignment.id}`;

  // Checkbox wrapper
  const checkboxWrapper = document.createElement("div");
  checkboxWrapper.className = "card-checkbox-wrapper";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "planned-checkbox";
  checkbox.id = `check-${assignment.id}`;
  checkbox.checked = isPlanned;
  checkbox.title = "Mark as planned";
  checkbox.addEventListener("change", function () {
    togglePlannedStatus(assignment.id, checkbox.checked);
  });

  checkboxWrapper.appendChild(checkbox);

  // Main content container
  const mainContent = document.createElement("div");
  mainContent.className = "card-main";

  // Card header (Course tag + optional badge)
  const header = document.createElement("div");
  header.className = "card-header";

  const courseTag = document.createElement("span");
  courseTag.className = "course-tag";
  courseTag.textContent = assignment.courseCode;
  courseTag.title = assignment.courseName;
  header.appendChild(courseTag);

  const badgeElement = createBadgeElement(assignment, dueDateFormatted);
  if (badgeElement) {
    header.appendChild(badgeElement);
  }

  // Title
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = assignment.title;

  // Due Date
  const dueInfo = document.createElement("p");
  dueInfo.className = "card-due-date";
  dueInfo.innerHTML = `Due: <strong>${dueDateFormatted}</strong> &bull; ${assignment.courseName}`;

  mainContent.appendChild(header);
  mainContent.appendChild(title);
  mainContent.appendChild(dueInfo);

  card.appendChild(checkboxWrapper);
  card.appendChild(mainContent);

  return card;
}

// Fills a section container with cards or displays a friendly empty message if none exist.
function renderSection(containerId, countId, assignmentsList, plannedIds) {
  const container = document.getElementById(containerId);
  const countBadge = document.getElementById(countId);

  container.innerHTML = "";
  countBadge.textContent = assignmentsList.length;

  if (assignmentsList.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-message";
    emptyMsg.textContent = "No assignments in this section.";
    container.appendChild(emptyMsg);
    return;
  }

  assignmentsList.forEach(function (assignment) {
    const isPlanned = plannedIds.includes(assignment.id);
    const card = createAssignmentCard(assignment, isPlanned);
    container.appendChild(card);
  });
}

// Extracts unique course codes from the dataset to populate the filter dropdown.
function setupCourseFilter(assignments) {
  const filterSelect = document.getElementById("course-filter");
  const uniqueCourses = [];

  assignments.forEach(function (item) {
    if (!uniqueCourses.includes(item.courseCode)) {
      uniqueCourses.push(item.courseCode);
    }
  });

  uniqueCourses.forEach(function (code) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code;
    filterSelect.appendChild(option);
  });

  filterSelect.addEventListener("change", function () {
    renderApp();
  });
}

// Categorizes assignments into Today, This Week, and Later, then renders each section.
function renderApp() {
  const allAssignments = window.ASSIGNMENTS_DATA || [];
  const selectedCourse = document.getElementById("course-filter").value;
  const plannedIds = getPlannedIds();

  // Filter by selected course
  const filtered = allAssignments.filter(function (item) {
    return selectedCourse === "all" || item.courseCode === selectedCourse;
  });

  // Categorize into the three time buckets
  const todayItems = [];
  const thisWeekItems = [];
  const laterItems = [];

  filtered.forEach(function (item) {
    if (item.dueDaysOffset === 0) {
      todayItems.push(item);
    } else if (item.dueDaysOffset > 0 && item.dueDaysOffset <= 7) {
      thisWeekItems.push(item);
    } else {
      laterItems.push(item);
    }
  });

  renderSection("cards-today", "count-today", todayItems, plannedIds);
  renderSection("cards-this-week", "count-this-week", thisWeekItems, plannedIds);
  renderSection("cards-later", "count-later", laterItems, plannedIds);
}

// Initializes the app after the DOM has loaded.
document.addEventListener("DOMContentLoaded", function () {
  const assignments = window.ASSIGNMENTS_DATA || [];
  setupCourseFilter(assignments);
  renderApp();
});
