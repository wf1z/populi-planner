// ==========================================================================
// ARCHIVE TAB CONTROLLER & VIEW (Populi Planner)
// ==========================================================================
// Manages the Archive tab view: displays archived assignments grouped by course,
// provides one-click Restore (returning assignments as unchecked), and provides
// Delete Forever with explicit modal confirmation.
// ==========================================================================

let deleteForeverTargetId = null;
let lastDeleteForeverFocusedElement = null;
let isDeleteForeverBackdropMouseDown = false;

/**
 * Formats an ISO date string or local YYYY-MM-DD string into human-friendly format (e.g. "Oct 24, 2026").
 */
function formatArchiveDisplayDate(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.includes("T") ? dateStr.split("T")[0].split("-") : dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

/**
 * Opens the Delete Forever confirmation dialog for a specific archived assignment.
 */
function openDeleteForeverConfirm(assignment) {
  deleteForeverTargetId = assignment.id;
  lastDeleteForeverFocusedElement = document.activeElement;

  const dialog = document.getElementById("delete-forever-dialog");
  const msgEl = document.getElementById("delete-forever-message");

  if (dialog && msgEl) {
    msgEl.textContent = `Are you sure you want to permanently delete "${assignment.title}"?`;
    dialog.showModal();
    const cancelBtn = document.getElementById("delete-forever-cancel-btn");
    if (cancelBtn) cancelBtn.focus();
  } else if (confirm(`Are you sure you want to permanently delete "${assignment.title}"? This cannot be undone.`)) {
    executeDeleteForever();
  }
}

/**
 * Closes the Delete Forever confirmation dialog and restores focus.
 */
function closeDeleteForeverConfirm() {
  const dialog = document.getElementById("delete-forever-dialog");
  if (dialog && dialog.open) {
    dialog.close();
  }
  deleteForeverTargetId = null;
  if (lastDeleteForeverFocusedElement && typeof lastDeleteForeverFocusedElement.focus === "function") {
    lastDeleteForeverFocusedElement.focus();
  }
}

/**
 * Executes permanent deletion of the targeted assignment from local and cloud storage.
 */
function executeDeleteForever() {
  if (!deleteForeverTargetId) return;
  const id = deleteForeverTargetId;
  closeDeleteForeverConfirm();

  const deleted = deleteAssignmentPermanently(id);
  if (typeof window.renderApp === "function") {
    window.renderApp();
  }

  if (typeof window.showAuthToast === "function" && deleted) {
    window.showAuthToast(`Permanently deleted "${deleted.title}".`, "info");
  }
}

/**
 * Renders the entire Archive tab view: empty state vs. course-grouped archived items.
 */
function renderArchiveTab() {
  const container = document.getElementById("archive-list");
  const emptyState = document.getElementById("archive-empty-state");
  const tabCountBadge = document.getElementById("archive-tab-count");

  const archivedAssignments = getArchivedAssignments();
  const count = archivedAssignments.length;

  // Update count badge on the top bar Archive tab
  if (tabCountBadge) {
    tabCountBadge.textContent = count;
    tabCountBadge.style.display = count > 0 ? "inline-flex" : "none";
  }

  if (!container || !emptyState) return;

  if (count === 0) {
    emptyState.style.display = "block";
    container.innerHTML = "";
    return;
  }

  emptyState.style.display = "none";
  container.innerHTML = "";

  // Group archived assignments by course
  const courses = getStoredCourses();
  const courseMap = new Map();
  courses.forEach(c => courseMap.set(c.id, c));

  const groups = new Map();
  archivedAssignments.forEach(assignment => {
    const cId = assignment.courseId || "unknown";
    if (!groups.has(cId)) {
      groups.set(cId, []);
    }
    groups.get(cId).push(assignment);
  });

  // Sort groups by course code alphabetically (case-insensitive)
  const sortedCourseIds = Array.from(groups.keys()).sort((a, b) => {
    const courseA = courseMap.get(a);
    const courseB = courseMap.get(b);
    const codeA = courseA ? courseA.code : "ZZZ";
    const codeB = courseB ? courseB.code : "ZZZ";
    return codeA.localeCompare(codeB, undefined, { sensitivity: "base" });
  });

  sortedCourseIds.forEach(courseId => {
    const items = groups.get(courseId);
    const course = courseMap.get(courseId) || getCourseById(courseId);

    // Sort items within course: newest archived first, then due date
    items.sort((a, b) => {
      const dateA = a.archivedAt || a.dueDate || "";
      const dateB = b.archivedAt || b.dueDate || "";
      return dateB.localeCompare(dateA);
    });

    const groupEl = document.createElement("section");
    groupEl.className = "archive-course-group";

    // Course Group Header
    const headerEl = document.createElement("div");
    headerEl.className = "archive-group-header";

    const headerLeft = document.createElement("div");
    headerLeft.className = "archive-group-title";

    const tag = document.createElement("span");
    tag.className = "course-tag";
    tag.textContent = course.code;
    tag.style.borderLeftColor = getCourseColorVariable(course.colorNumber);
    tag.style.borderLeftWidth = "4px";

    const nameText = document.createElement("span");
    nameText.className = "archive-course-name";
    nameText.textContent = (course.name && course.name !== course.code) ? course.name : "";

    headerLeft.appendChild(tag);
    if (nameText.textContent) {
      headerLeft.appendChild(nameText);
    }

    const countSpan = document.createElement("span");
    countSpan.className = "archive-group-count";
    countSpan.textContent = `${items.length} archived item${items.length === 1 ? "" : "s"}`;

    headerEl.appendChild(headerLeft);
    headerEl.appendChild(countSpan);
    groupEl.appendChild(headerEl);

    // Items list container
    const itemsGrid = document.createElement("div");
    itemsGrid.className = "archive-items-grid";

    items.forEach(assignment => {
      const card = document.createElement("div");
      card.className = "archive-card";

      // Card Header: Status pills
      const cardTop = document.createElement("div");
      cardTop.className = "archive-card-top";

      const pillsWrap = document.createElement("div");
      pillsWrap.className = "archive-card-pills";

      const archPill = document.createElement("span");
      archPill.className = "archive-pill archive-pill-muted";
      archPill.textContent = "Archived";
      pillsWrap.appendChild(archPill);

      if (assignment.completed || assignment.planned) {
        const compPill = document.createElement("span");
        compPill.className = "archive-pill archive-pill-completed";
        compPill.textContent = "Completed";
        pillsWrap.appendChild(compPill);
      }

      cardTop.appendChild(pillsWrap);

      // Card Title
      const titleEl = document.createElement("h4");
      titleEl.className = "archive-card-title";
      titleEl.textContent = assignment.title;

      // Card Metadata (Due Date & Archived Date)
      const metaEl = document.createElement("div");
      metaEl.className = "archive-card-meta";

      const dueSpan = document.createElement("span");
      dueSpan.className = "archive-meta-item";
      const formattedDueDate = typeof formatDisplayDate === "function" ? formatDisplayDate(assignment.dueDate) : formatArchiveDisplayDate(assignment.dueDate);
      dueSpan.textContent = assignment.dueDate ? `Due: ${formattedDueDate}` : "No due date";
      metaEl.appendChild(dueSpan);

      if (assignment.archivedAt) {
        const archSpan = document.createElement("span");
        archSpan.className = "archive-meta-item archive-meta-date";
        archSpan.textContent = `Archived: ${formatArchiveDisplayDate(assignment.archivedAt)}`;
        metaEl.appendChild(archSpan);
      }

      // Card Action Buttons
      const actionsEl = document.createElement("div");
      actionsEl.className = "archive-card-actions";

      // Restore button: Per requirement 7, returns completed items as unchecked
      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.className = "btn-secondary btn-sm btn-restore-assignment";
      restoreBtn.textContent = "Restore";
      restoreBtn.title = "Restore this assignment to the active planner (unchecked)";
      restoreBtn.addEventListener("click", function () {
        restoreAssignment(assignment.id);
        if (typeof window.renderApp === "function") {
          window.renderApp();
        }
        if (typeof window.showUndoToast === "function") {
          window.showUndoToast(1, "restore", [assignment]);
        }
      });

      // Delete Forever button
      const deleteForeverBtn = document.createElement("button");
      deleteForeverBtn.type = "button";
      deleteForeverBtn.className = "btn-danger btn-sm btn-delete-forever";
      deleteForeverBtn.textContent = "Delete forever";
      deleteForeverBtn.title = "Permanently delete this assignment";
      deleteForeverBtn.addEventListener("click", function () {
        openDeleteForeverConfirm(assignment);
      });

      actionsEl.appendChild(restoreBtn);
      actionsEl.appendChild(deleteForeverBtn);

      card.appendChild(cardTop);
      card.appendChild(titleEl);
      card.appendChild(metaEl);
      card.appendChild(actionsEl);

      itemsGrid.appendChild(card);
    });

    groupEl.appendChild(itemsGrid);
    container.appendChild(groupEl);
  });
}

// Attach event listeners for Delete Forever dialog once DOM is ready
function initArchiveDialogListeners() {
  const dialog = document.getElementById("delete-forever-dialog");
  const cancelBtn = document.getElementById("delete-forever-cancel-btn");
  const closeBtn = document.getElementById("delete-forever-close-btn");
  const confirmBtn = document.getElementById("delete-forever-confirm-btn");

  if (cancelBtn) cancelBtn.addEventListener("click", closeDeleteForeverConfirm);
  if (closeBtn) closeBtn.addEventListener("click", closeDeleteForeverConfirm);
  if (confirmBtn) confirmBtn.addEventListener("click", executeDeleteForever);

  if (dialog) {
    dialog.addEventListener("mousedown", function (e) {
      isDeleteForeverBackdropMouseDown = (e.target === dialog);
    });
    dialog.addEventListener("click", function (e) {
      if (isDeleteForeverBackdropMouseDown && e.target === dialog) {
        closeDeleteForeverConfirm();
      }
      isDeleteForeverBackdropMouseDown = false;
    });
    dialog.addEventListener("close", function () {
      if (lastDeleteForeverFocusedElement && typeof lastDeleteForeverFocusedElement.focus === "function") {
        lastDeleteForeverFocusedElement.focus();
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArchiveDialogListeners);
} else {
  initArchiveDialogListeners();
}

window.renderArchiveTab = renderArchiveTab;
