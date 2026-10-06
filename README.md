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

---

## 🎨 Where to Change Colors and Styling

All theme controls (colors, fonts, border radiuses, and spacing) are located at the top of **`styles.css`** inside the `:root` block:

```css
:root {
  /* Page Colors */
  --bg-color: #f8fafc;
  --card-bg: #ffffff;
  --primary: #2563eb;          /* Accent color for buttons & active focus */

  /* Badges */
  --badge-new-bg: #ecfdf5;     /* Green background for 'New' items */
  --badge-changed-bg: #fffbeb; /* Amber background for changed dates */
  --badge-overdue-bg: #fef2f2; /* Rose background for overdue section */
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
git commit -m "Add manual assignment entry, edit/delete actions, badge history checkboxes, and backup export/import"
```
