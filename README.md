# Populi Planner (Coursework Planner, Weekly Class Schedule & Course Manager)

A clean, dark-mode, at-a-glance planner for college students that highlights upcoming coursework, computed **NEW** and **CHANGED** badges, a visual month calendar, an interactive **Weekly Class Schedule**, and a dedicated **Courses Tab** with course renaming, recoloring, cascade deletion, and resilient data migrations.

---

## 🚀 How to Run the App

1. Open File Explorer to:
   ```text
   C:\Users\supaw\Documents\populi-planner
   ```
2. Double-click **`index.html`** to open it in Google Chrome, Microsoft Edge, Firefox, or Safari.
3. No build tools, npm, or servers required!

---

## ✨ Features & Architecture

### 1. Sticky Top Bar & Three Navigation Tabs
- **Sticky & Compact**: Fixed at the top (`height: 56px`), keeping navigation accessible while scrolling.
- **Persistent Tabs**: Real `<button role="tab">` elements for **Planner**, **Schedule**, and **Courses**. The active tab persists across all additions, edits, deletions, and page redraws.
- **Contextual Top Action Button**:
  - On the **Planner** tab: displays `+ Add assignment`.
  - On the **Schedule** tab: displays `+ Add class`.
  - On the **Courses** tab: displays `+ Add course`.
  - Uses high-contrast primary button styling (`--primary` background, `--on-primary` `#1a1720` dark text, `--primary-hover` on hover, visible keyboard focus).

### 2. Courses Tab (Stage 2)
- **Alphabetical Course Grid**: Courses are displayed as clean cards sorted alphabetically by course code (case-insensitive).
- **Color Accent Indicator**: Each card features a color accent border on the course code tag matching the course's chosen palette color (`--course-color-1` through `--course-color-8`).
- **Live Summary Badge**:
  - Displays the count of open (unplanned) assignments: `X open assignment(s)`.
  - Displays class meeting summary: `Y class meeting(s)` or `No set meeting time` for unscheduled courses (e.g. chapel/online) or `No class meetings`.
  - Example: `3 open assignments • 2 class meetings` or `1 open assignment • No set meeting time`.
- **Edit & Delete Actions**:
  - **Edit**: Opens the Course modal dialog in Edit mode, pre-filled with the course's code, name, and currently selected color.
  - **Delete**: Warns with the exact count of assignments and class meetings that will be cascade-deleted before asking for confirmation.
- **Empty State**: Friendly welcome notice when no courses exist, with an `+ Add your first course` button.

### 3. Native Course Modal Dialog (`<dialog>`)
- **Fields**:
  - **Course Code** (required, e.g. `THEO 201`).
  - **Course Name** (optional, defaults to the course code if blank, e.g. `Systematic Theology I`).
  - **Color Picker**: An accessible radio group featuring all 8 muted palette swatches (`--course-color-1` through `--course-color-8`). Selecting a color displays an active outline ring with hover animation.
- **Validation**:
  - Course code is required.
  - Duplicate detection: Prevents creating or renaming to a course code that is already in use by another course (case-insensitive and whitespace-normalized).
- **Safe Backdrop & Focus Management**:
  - Modal only closes when *both* `mousedown` and `click` occur on the dialog backdrop itself.
  - Focus moves into the Course Code field on open and returns to the triggering button on close.

### 4. Cascade Delete & Referential Integrity
- Deleting a course permanently removes the course record and cleanly cascades deletion to:
  - All assignments linked to that course.
  - All class meetings (scheduled and unscheduled) linked to that course.
- After deletion, `renderApp()` immediately refreshes the Planner, calendar dots, and weekly schedule grid.

### 5. Weekly Class Schedule (Schedule Tab)
- **Sunday-to-Saturday Time Grid**: Aligns with the month calendar (Sunday = column 0).
- **Auto-Fitting Hour Range**: Dynamically fits the earliest start time to the latest end time with 1 hour of padding (defaults to 8:00 AM – 6:00 PM if empty).
- **Side-by-Side Overlap Layout**: Connected clusters of overlapping class meetings on the same day are divided into equal sub-columns.
- **Classes with No Set Meeting Time**: Checkbox in class dialog hides day/time fields for flexible courses (chapel, online, practicum). Displays in a dedicated "No set meeting time" section below the grid.

### 6. Course Data Model & Safe Migration (Version 3)
- **Distinct Course Records (`populi_courses`)**:
  - `{ id, code, name, colorNumber, source }`
  - All assignments and classes reference courses through `courseId`.
- **Multi-Tier Color Allocation (`allocateColorNumber()`)**:
  - Assigns the first unused color from 1 to 8.
  - If all 8 colors are in use, assigns the least-used color to maintain balance.
- **Untouched Snapshot & Marker**:
  - `populi_migration_backup_pre_v3` stores untouched raw data before migration starts and is never overwritten.
  - `populi_data_version = "3"` is written LAST after all writes succeed.
  - If migration encounters an error, a recovery screen appears with a **"Download my old data"** button.
  - `clearAllData()` clears lists while keeping the version marker at `"3"`.
- **Version 3 Backup & Universal Import**:
  - Exports `{ version: 3, courses, assignments, classes }`.
  - Seamlessly imports Version 1, 2, and 3 backup files.

---

## 🎨 Theme Variables (`styles.css`)

```css
:root {
  color-scheme: dark;

  /* Layout Dimensions */
  --topbar-height: 56px;

  /* Page Colors */
  --bg-color: #0f0d12;
  --card-bg: #1a1720;
  --card-border: #2e2937;
  --input-bg: #221e29;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);
  --backdrop-color: rgba(0, 0, 0, 0.75);

  /* Text Colors */
  --text-main: #ffffff;
  --text-muted: #d4cdd9;
  --text-dim: #9a92a3;

  /* Accent (silvery pink) */
  --primary: #e0b8c8;
  --primary-hover: #efcfdc;
  --on-primary: #1a1720;

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

  /* Course Schedule Colors (Muted tones readable with white text) */
  --course-color-1: #6b3e52; /* Muted rose */
  --course-color-2: #2d5045; /* Muted forest */
  --course-color-3: #5a452a; /* Muted amber */
  --course-color-4: #2d4560; /* Muted slate */
  --course-color-5: #4b365c; /* Muted plum */
  --course-color-6: #35534c; /* Muted teal */
  --course-color-7: #614035; /* Muted terracotta */
  --course-color-8: #3d3b5e; /* Muted indigo */
}
```

---

## 🧪 Testing Guide

### Test 1: Navigation & Empty State
1. Open `index.html` in your browser.
2. In the top bar, click the new **Courses** tab:
   - Notice the Courses tab is highlighted with `aria-selected="true"`.
   - The top action button updates to **`+ Add course`**.
3. If no courses exist, observe the empty state with the **`+ Add your first course`** button.

### Test 2: Add Course via Dialog
1. Click **`+ Add course`** in the top bar:
   - The native Course dialog opens with heading *"Add Course"*.
   - Focus is automatically placed in the Course Code field.
   - The color picker selects the first available color swatch by default.
2. Enter:
   - Code: `HIST 201`
   - Name: `Church History I`
   - Select color swatch 6 (Teal).
3. Click **Save**:
   - The dialog closes, and the course card appears in the grid.
   - The card shows code `HIST 201` with a teal accent bar, title `Church History I`, and summary `0 open assignments • No class meetings`.

### Test 3: Duplicate Code Prevention
1. Click **`+ Add course`**.
2. Enter Code `hist  201` (same code in lowercase with extra spaces).
3. Click **Save**:
   - The form displays an inline error: `A course with the code "HIST 201" already exists.`
   - The dialog remains open so you can correct the code.
4. Click **Cancel** to close the dialog.

### Test 4: Course Card Summaries
1. Load sample data (under **Data & Backup tools**, click **Load Sample Data**).
2. Switch to the **Courses** tab:
   - Notice all 4 courses (`BIBL 110`, `CHAP 100`, `MIN 305`, `THEO 201`) sorted alphabetically.
   - `CHAP 100` displays summary: `0 open assignments • No set meeting time`.
   - Other courses display summaries like: `3 open assignments • 1 class meeting`.
3. Switch to the **Planner** tab and check off one assignment for `THEO 201`.
4. Switch back to the **Courses** tab:
   - The open assignment count for `THEO 201` immediately updates to reflect only open items.

### Test 5: Edit Course (Rename & Recolor)
1. On the **Courses** tab, find `THEO 201` and click **Edit**:
   - Dialog opens with heading *"Edit Course"*.
   - Code, Name, and current color swatch (Rose) are pre-selected.
2. Change the code to `THEO 202`, name to `Systematic Theology II`, and pick color swatch 7 (Terracotta).
3. Click **Save**:
   - The course card updates immediately.
   - Switch to the **Schedule** tab: class blocks now display the new code `THEO 202` and the new terracotta color.
   - Switch to the **Planner** tab: assignment tags and course filter dropdown reflect `THEO 202`.

### Test 6: Cascade Delete with Warning
1. On the **Courses** tab, click **Delete** on `THEO 202`:
   - A confirmation dialog warns: *"Are you sure you want to delete course "THEO 202 - Systematic Theology II"? This will permanently delete X assignments and Y class meetings. This action cannot be undone."*
2. Confirm the deletion:
   - The course card is removed.
   - Switch to the **Planner** tab: all assignments linked to `THEO 202` have been deleted.
   - Switch to the **Schedule** tab: all class meetings for `THEO 202` have been deleted from the grid.

---

## 🌿 Git Version Control Commands

To commit your changes to Git:

```bash
# 1. Navigate to the project folder
cd "C:\Users\supaw\Documents\populi-planner"

# 2. Check changed and untracked files
git status

# 3. Stage all new and modified files
git add .

# 4. Commit your changes
git commit -m "Implement Stage 2: Courses tab, Course modal dialog with color picker, card summaries, and cascade delete"
```
