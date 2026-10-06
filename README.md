# Populi Planner (Manual Entry & History Tracking)

A clean, at-a-glance coursework planner for college students that highlights upcoming assignments and clearly flags what is **NEW** or has a **CHANGED** due date.

---

## 🚀 How to Run the App

1. Open File Explorer to:
   ```text
   C:\Users\supaw\Documents\populi-planner
   ```
2. Double-click **`index.html`** to open it in Google Chrome, Microsoft Edge, Firefox, or Safari.
3. No build tools, npm, or servers required!

---

## ✨ Features & How to Use

### 1. Manual Entry ("Add Assignment")
- Select an existing course from the dropdown, or choose **"+ Add New Course..."** to enter a new course code (e.g. `THEO 201`) and name (e.g. `Systematic Theology I`).
- Enter the assignment title and select the due date.
- **"Just posted in Populi" checkbox** (default: *unchecked*):
  - When typing in your semester syllabus, leave it unchecked so assignments don't trigger "New" badges.
  - Check this box when entering an assignment that was newly announced or posted in Populi to show the **New** badge for 3 days.

### 2. Editing & Deleting Assignments
- Each card has **Edit** and **Delete** buttons.
- Deleting prompts for confirmation to prevent accidental clicks.
- Clicking **Edit** loads the assignment into the top form:
  - If you change the due date, the **"Mark due date as changed"** checkbox (default: *checked*) logs the old date and shows the **"Due date changed (Was X → now Y)"** badge for 3 days.
  - If you are only fixing a typo in the title or date without wanting a badge, uncheck the box before saving.

### 3. Dynamic Sections
- **Overdue**: Automatically appears at the top *only* when there are assignments past their due date.
- **Today**: Due today (based on local midnight).
- **This Week**: Due within the next 7 days.
- **Later**: Due in 8+ days.
- Assignments are sorted **soonest first** by due date within every section.

### 4. Timezone-Safe Dates
Due dates (`YYYY-MM-DD`) are parsed as local calendar dates (`new Date(year, month - 1, day)`), preventing off-by-one errors caused by UTC conversions.

### 5. Safe Rendering
All titles, course codes, and course names are injected into the page using `textContent` rather than `innerHTML`. Titles containing special characters (e.g., `<Scripture & Hermeneutics>`) will render safely without breaking page markup.

### 6. Data Management & Backups
At the top of the page:
- **Load Sample Data**: Populates realistic sample coursework across Theology, Biblical Studies, and Ministry courses with relative dates (never stale). Asks for confirmation if assignments already exist.
- **Clear All Data**: Resets the planner to a clean state after asking for confirmation.
- **Export Backup**: Downloads a timestamped JSON file (`populi-planner-backup-YYYY-MM-DD.json`) with `version: 1`.
- **Import Backup**: Restores a previously downloaded backup file. Validates the data before replacing current assignments.

### 7. Visual Month Calendar (Side Panel)
- **Always 6 Rows (42 Cells)**: Sunday-first grid that maintains consistent height month-to-month to prevent layout jumps.
- **Assignment Indicator Dots**:
  - Up to 3 dots per day, plus `+N` for additional coursework.
  - Normal dots use `--primary` (silvery pink).
  - Overdue items use danger colors (`--danger-text`).
  - Planned items show dimmed dots.
- **Selected Day Panel**: Clicking any day reveals its tasks in the sidebar panel with title, course code, and interactive "planned" checkbox. Clicking the same day deselects it.
- **Persistent State & Focus**: Navigating months (Prev/Next/Today) or checking off tasks maintains the viewed month, selected date, and active keyboard focus without resetting.
- **Responsive Layout**: Sticky sidebar beside the main sections on wide screens (≥900px) with scrollable overflow (`max-height: calc(100vh - 2 * var(--space-md))`), stacking cleanly above the sections on smaller screens.

---

## 🎨 Design Rules & Styling

### Design Rules for the Future
1. **Never hardcode colors**: Always reference the CSS custom properties in `:root` (e.g. `var(--bg-color)`, `var(--input-bg)`, `var(--text-main)`).
2. **Never overwrite existing `:root` theme values**: Preserve the custom dark palette across all future features and updates.

### Theme Variables (`styles.css`)

All theme controls live in **`styles.css`** inside the `:root` block:

```css
:root {
  color-scheme: dark;

  /* Page Colors */
  --bg-color: #0f0d12;
  --card-bg: #1a1720;
  --card-border: #2e2937;
  --input-bg: #221e29;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);

  /* Text Colors */
  --text-main: #ffffff;
  --text-muted: #d4cdd9;
  --text-dim: #9a92a3;

  /* Accent (silvery pink) */
  --primary: #e0b8c8;
  --primary-hover: #efcfdc;

  /* Course Tag */
  --course-tag-bg: rgba(224, 184, 200, 0.12);
  --course-tag-text: #e8c4d2;
  --course-tag-border: rgba(224, 184, 200, 0.3);

  /* Badges */
  --badge-new-bg: #0f2a22;
  --badge-new-text: #6ee7b7;
  --badge-new-border: #1f5c46;
  --badge-changed-bg: #2a2210;
  --badge-changed-text: #fcd34d;
  --badge-changed-border: #5c4a14;

  /* Overdue / Delete (danger) */
  --danger-bg: #2a1218;
  --danger-text: #fda4af;
  --danger-border: #5c2030;

  /* Planned (checked off) */
  --planned-opacity: 0.5;
  --planned-card-bg: #141218;
}
```

---

## 🌿 Git Version Control Commands

To save your changes to Git, open your terminal (in **Git Bash**, remember to quote the Windows path or use forward slashes):

```bash
# 1. Navigate to the project folder
cd "C:\Users\supaw\Documents\populi-planner"

# 2. Check changed and untracked files
git status

# 3. Stage all new and modified files
git add .

# 4. Commit your changes
git commit -m "Add responsive visual month calendar side panel with persistent state, keyboard focus, and assignment dots"
```
