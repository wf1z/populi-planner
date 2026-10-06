// Calendar view state (persists across renderApp redraws).
let currentViewYear = new Date().getFullYear();
let currentViewMonth = new Date().getMonth();
let selectedDateKey = null;

// Builds a local "YYYY-MM-DD" date key from numeric year, 0-indexed month, and day.
function formatLocalDateKey(year, monthIndex, day) {
  const y = year;
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Generates exactly 42 calendar day cells (6 full rows) starting with Sunday.
function getCalendarDays(year, month) {
  const days = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Always compute 42 cells starting from the preceding Sunday
  for (let i = 0; i < 42; i++) {
    const dayDate = new Date(year, month, 1 - startingDayOfWeek + i);
    const cellYear = dayDate.getFullYear();
    const cellMonth = dayDate.getMonth();
    const cellDay = dayDate.getDate();

    days.push({
      year: cellYear,
      month: cellMonth,
      day: cellDay,
      dateKey: formatLocalDateKey(cellYear, cellMonth, cellDay),
      isCurrentMonth: cellMonth === month
    });
  }

  return days;
}

// Groups filtered assignments into a dictionary keyed by their local YYYY-MM-DD string.
function groupAssignmentsByDate(assignments) {
  const map = {};
  assignments.forEach(item => {
    if (!map[item.dueDate]) {
      map[item.dueDate] = [];
    }
    map[item.dueDate].push(item);
  });
  return map;
}

// Formats month and year for the header display (e.g. "October 2026").
function formatMonthYearHeader(year, month) {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Builds the detailed assignment list for the currently selected date.
function renderSelectedDayPanel(dateKey, assignmentsMap) {
  const container = document.getElementById("calendar-selected-details");
  if (!container) return;

  container.innerHTML = "";

  if (!dateKey) {
    const hint = document.createElement("p");
    hint.className = "calendar-hint";
    hint.textContent = "Click a day to view its coursework.";
    container.appendChild(hint);
    return;
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const dateFormatted = localDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const header = document.createElement("div");
  header.className = "selected-day-header";

  const title = document.createElement("h4");
  title.className = "selected-day-title";
  title.textContent = dateFormatted;
  header.appendChild(title);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "selected-day-clear-btn";
  clearBtn.textContent = "Close";
  clearBtn.setAttribute("aria-label", "Deselect date");
  clearBtn.addEventListener("click", function () {
    selectedDateKey = null;
    if (typeof window.renderApp === "function") {
      window.renderApp();
    }
  });
  header.appendChild(clearBtn);

  container.appendChild(header);

  const items = assignmentsMap[dateKey] || [];
  if (items.length === 0) {
    const emptyNotice = document.createElement("p");
    emptyNotice.className = "selected-day-empty";
    emptyNotice.textContent = "Nothing due this day.";
    container.appendChild(emptyNotice);
    return;
  }

  const list = document.createElement("ul");
  list.className = "selected-day-list";

  items.forEach(assignment => {
    const li = document.createElement("li");
    li.className = `selected-day-item ${assignment.planned ? "is-planned" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "planned-checkbox";
    checkbox.id = `sel-check-${assignment.id}`;
    checkbox.checked = Boolean(assignment.planned);
    checkbox.setAttribute("aria-label", `Mark ${assignment.title} as planned`);
    checkbox.addEventListener("change", function () {
      toggleAssignmentPlanned(assignment.id);
      if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    });

    const info = document.createElement("div");
    info.className = "selected-day-item-info";

    const course = getCourseById(assignment.courseId);

    const courseTag = document.createElement("span");
    courseTag.className = "course-tag";
    courseTag.textContent = course.code;
    courseTag.title = course.name || course.code;

    const titleSpan = document.createElement("span");
    titleSpan.className = "selected-item-title";
    titleSpan.textContent = assignment.title;

    info.appendChild(courseTag);
    info.appendChild(titleSpan);

    li.appendChild(checkbox);
    li.appendChild(info);
    list.appendChild(li);
  });

  container.appendChild(list);
}

// Renders the visual month grid with status dots and updates the selected day details.
function renderCalendar(filteredAssignments) {
  const calendarContainer = document.getElementById("calendar-grid");
  const monthTitle = document.getElementById("calendar-month-title");
  if (!calendarContainer || !monthTitle) return;

  monthTitle.textContent = formatMonthYearHeader(currentViewYear, currentViewMonth);

  const assignmentsMap = groupAssignmentsByDate(filteredAssignments);
  const calendarDays = getCalendarDays(currentViewYear, currentViewMonth);

  const today = new Date();
  const todayKey = formatLocalDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  calendarContainer.innerHTML = "";

  calendarDays.forEach(cell => {
    const dayBtn = document.createElement("button");
    dayBtn.type = "button";
    dayBtn.className = "calendar-day";
    dayBtn.dataset.dateKey = cell.dateKey;
    dayBtn.id = `cal-day-${cell.dateKey}`;

    if (!cell.isCurrentMonth) {
      dayBtn.classList.add("calendar-day-other-month");
    }

    if (cell.dateKey === todayKey) {
      dayBtn.classList.add("is-today");
    }

    if (cell.dateKey === selectedDateKey) {
      dayBtn.classList.add("is-selected");
      dayBtn.setAttribute("aria-pressed", "true");
    } else {
      dayBtn.setAttribute("aria-pressed", "false");
    }

    const dayItems = assignmentsMap[cell.dateKey] || [];
    const count = dayItems.length;

    const [y, m, d] = cell.dateKey.split("-").map(Number);
    const cellDate = new Date(y, m - 1, d);
    const accessibleDateStr = cellDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    dayBtn.setAttribute("aria-label", `${accessibleDateStr}, ${count} assignment${count === 1 ? "" : "s"}`);

    // Day number
    const numSpan = document.createElement("span");
    numSpan.className = "calendar-day-num";
    numSpan.textContent = cell.day;
    dayBtn.appendChild(numSpan);

    // Indicator dots container (up to 3 dots + overflow label)
    if (count > 0) {
      const dotsContainer = document.createElement("div");
      dotsContainer.className = "calendar-dots";

      const maxDots = Math.min(count, 3);
      for (let i = 0; i < maxDots; i++) {
        const item = dayItems[i];
        const dot = document.createElement("span");
        dot.className = "calendar-dot";

        // Check overdue vs planned vs normal
        const isOverdue = getDaysOffsetFromToday(item.dueDate) < 0 && !item.planned;
        if (isOverdue) {
          dot.classList.add("dot-overdue");
        } else if (item.planned) {
          dot.classList.add("dot-planned");
        } else {
          dot.classList.add("dot-normal");
        }

        dotsContainer.appendChild(dot);
      }

      if (count > 3) {
        const moreSpan = document.createElement("span");
        moreSpan.className = "calendar-more-count";
        moreSpan.textContent = `+${count - 3}`;
        dotsContainer.appendChild(moreSpan);
      }

      dayBtn.appendChild(dotsContainer);
    }

    // Click handler: toggles date selection without changing the main assignment sections
    dayBtn.addEventListener("click", function () {
      if (selectedDateKey === cell.dateKey) {
        selectedDateKey = null;
      } else {
        selectedDateKey = cell.dateKey;
      }

      if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    });

    calendarContainer.appendChild(dayBtn);
  });

  renderSelectedDayPanel(selectedDateKey, assignmentsMap);
}

// Binds month navigation controls (Prev, Next, Today).
function initCalendarControls() {
  const prevBtn = document.getElementById("calendar-prev-btn");
  const nextBtn = document.getElementById("calendar-next-btn");
  const todayBtn = document.getElementById("calendar-today-btn");

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      currentViewMonth--;
      if (currentViewMonth < 0) {
        currentViewMonth = 11;
        currentViewYear--;
      }
      if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      currentViewMonth++;
      if (currentViewMonth > 11) {
        currentViewMonth = 0;
        currentViewYear++;
      }
      if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", function () {
      const now = new Date();
      currentViewYear = now.getFullYear();
      currentViewMonth = now.getMonth();
      selectedDateKey = formatLocalDateKey(currentViewYear, currentViewMonth, now.getDate());
      if (typeof window.renderApp === "function") {
        window.renderApp();
      }
    });
  }
}

// Expose render function and initializer to global scope.
window.renderCalendar = renderCalendar;
window.initCalendarControls = initCalendarControls;
