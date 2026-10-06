# Populi Planner (Coursework Planner & Weekly Class Schedule)

A clean, dark-mode, at-a-glance planner for college students that highlights upcoming coursework, computed **NEW** and **CHANGED** badges, a visual month calendar, and an interactive **Weekly Class Schedule** with support for both timed classes and flexible/unscheduled courses.

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

### 1. Sticky Top Bar & Navigation Tabs
- **Compact & Sticky**: Fixed at the top (`height: 56px`), keeping navigation accessible while scrolling.
- **Persistent Tabs**: Real `<button role="tab">` elements for **Planner** and **Schedule**. The active tab persists across all additions, edits, and page redraws.
- **Adaptive Top Action Button**: 
  - On the **Planner** tab: displays `+ Add assignment`.
  - On the **Schedule** tab: displays `+ Add class`.
  - High-contrast primary button styling (`--primary` background, `--on-primary` dark text, `--primary-hover` on hover, visible keyboard focus).

### 2. Native Modal Dialogs (`<dialog>`) & Unified Button System
- **First Screen Priority**: Forms no longer occupy page real estate. Main screens focus directly on assignments, the month calendar, or the weekly schedule grid.
- **Safe Backdrop Click**: Modal dialogs only close when *both* `mousedown` and `click` occur on the backdrop itself. Selecting text with your mouse drifting outside the dialog will never close it or wipe your input.
- **Unified Button Styling**:
  - Primary buttons (`.btn-primary`, `.btn-top-add`, `.btn-empty-add`) use `--primary` background with `--on-primary` (`#1a1720`) dark text for optimal contrast.
  - Secondary buttons (`.btn-secondary`: "Save and add another" and "Cancel") use subtle card backgrounds with clean borders.
  - All dialog buttons share identical height (`38px`), padding (`0 16px`), and border-radius (`var(--radius-sm)`), with visible `:focus-visible` rings and clear `:disabled` states.
- **Keyboard & Focus Management**:
  - Focus moves automatically to the first relevant input field on open.
  - Supports `Esc` and Cancel buttons.
  - When closed, focus returns to the exact element that opened the dialog.
- **"Save and add another"**: Rapid entry workflow for entering a syllabus: saves the current item, keeps course, dates, and times intact, and resets the specific text field so you can type the next item immediately.

### 3. Weekly Class Schedule (Schedule Tab)
- **Sunday-to-Saturday Time Grid**: Aligns with the month calendar (Sunday = column 0).
- **Auto-Fitting Hour Range**: Dynamically fits the earliest start time to the latest end time with **1 hour of padding** (defaults to 8:00 AM – 6:00 PM if empty or if only unscheduled classes exist).
- **Side-by-Side Overlap Layout**: Connected clusters of overlapping class meetings on the same day are divided into equal sub-columns (`width: calc(100% / totalCols)` and `left: calc(colIndex * 100% / totalCols)`), ensuring overlapping classes are never hidden or stacked on top of each other.
- **Current Day Highlight**: The current day of the week is subtly highlighted in both the header and the grid column.
- **Interactive Event Blocks**: Clicking any class block on the grid opens the class modal in Edit mode.
- **All Class Meetings List**: Displayed below the grid with course tag, meeting days, formatted 12-hour time range, optional location/notes, and **Edit** and **Delete** (with confirmation) buttons.
- **Multi-Meeting Hint**: A clear helper note reminds students: *"A class that meets at different times on different days is entered as separate meetings."*

### 4. Classes with No Set Meeting Time (Unscheduled Courses)
- **Flexible / Attendance-Based Courses**: Accommodates courses with no fixed meeting times (e.g. College Chapel, practicums, thesis work, or online classes).
- **"No set meeting time" Checkbox**: Located inside the class dialog. Checking it hides meeting days and start/end time fields while keeping any typed values intact in case you uncheck it.
- **"Location or notes (optional)"**: Provides a place for notes such as *"Attend 15 of 30 services per semester"*.
- **Validation**: Day and time checks are bypassed when "No set meeting time" is selected.
- **Grid Safety**: Unscheduled courses are skipped during time math, hour range calculations, and grid placement.
- **"No set meeting time" Section**: Rendered directly below the weekly grid when unscheduled courses exist (automatically hidden when none exist).
- **Full Course Integration**: Unscheduled courses are full citizens—they receive a persistent course color, appear in assignment dropdowns, and participate in course code normalization.

### 5. Normalized Course Matching & Color Mapping
- **Course Normalization**: All course codes are cleaned via `normalizeCourseCode()` (trimmed, internal repeated spaces collapsed, and converted to uppercase). `"theo 201"` and `"THEO  201"` resolve to the exact same course across assignments, classes, and filters.
- **Shared Course Dropdowns**: Adding a course in either an assignment or a class immediately makes it available in the other.
- **Course Color Palette**: Each course is mapped to one of 6 readable muted background colors (`--course-color-1` through `--course-color-6`).
- **Persistent Color Mapping**: Stored in `populi_course_colors` in `localStorage`. New courses take the first unused color from 1 to 6 so adjacent courses don't collide.

### 6. Month Calendar Side Panel
- **Always 6 Rows (42 Cells)**: Sunday-first grid maintaining consistent height month-to-month to eliminate layout jumps.
- **Assignment Indicator Dots**:
  - Normal coursework uses `--primary` (silvery pink).
  - Overdue coursework uses `--danger-text`.
  - Planned coursework displays dimmed dots.
- **Selected Day Panel**: Clicking a day displays all assignments due on that date with an interactive "planned" checkbox.

### 7. Data Integrity & Version 2 Backups
- **Version 2 Backup Schema**: Exports assignments, class meetings (including unscheduled flags), and course color mappings into a clean JSON structure:
  ```json
  {
    "version": 2,
    "exportedAt": "2026-10-06T...",
    "assignments": [...],
    "classes": [
      {
        "id": "meeting-1",
        "courseCode": "THEO 201",
        "courseName": "Systematic Theology I",
        "days": [1, 3, 5],
        "startTime": "09:00",
        "endTime": "10:15",
        "location": "Chapel Hall 102",
        "unscheduled": false
      },
      {
        "id": "meeting-2",
        "courseCode": "CHAP 100",
        "courseName": "College Chapel",
        "days": [],
        "startTime": null,
        "endTime": null,
        "location": "Attend 15 of 30 services per semester",
        "unscheduled": true
      }
    ],
    "courseColors": { "THEO 201": 1, "BIBL 110": 2, "MIN 305": 3, "CHAP 100": 4 }
  }
  ```
- **Backward Compatibility**: Version 1 and earlier Version 2 backup files import seamlessly without errors.
- **Validation**: Every imported file is verified for valid JSON and expected fields before any data is replaced.

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

  /* Course Schedule Colors */
  --course-color-1: #6b3e52; /* Muted rose */
  --course-color-2: #2d5045; /* Muted forest */
  --course-color-3: #5a452a; /* Muted amber */
  --course-color-4: #2d4560; /* Muted slate */
  --course-color-5: #4b365c; /* Muted plum */
  --course-color-6: #35534c; /* Muted teal */
}
```

---

## 🧪 Testing Guide

### Test 1: Button Styling & Contrast
1. Open `index.html` in your browser.
2. Inspect the top bar button (`+ Add assignment` or `+ Add class`):
   - Notice the high-contrast dark text (`--on-primary: #1a1720`) on the silvery pink background (`--primary: #e0b8c8`).
   - Hover over it to observe `--primary-hover` without text contrast loss.
3. Click `+ Add assignment` (or `+ Add class` on Schedule tab):
   - Inspect the modal footer buttons:
     - **Save**: Primary button with `--primary` background, `--on-primary` dark text, and matching 38px height.
     - **Save and add another**: Secondary button with card background and text.
     - **Cancel**: Secondary button with identical 38px height and radius.
   - Press `Tab` to navigate between buttons and observe the high-visibility focus ring (`outline: 2px solid var(--primary)`).

### Test 2: Sample Data & Unscheduled Course ("College Chapel")
1. Scroll down and expand **Data & Backup tools**, then click **Load Sample Data** and confirm.
2. Click the **Schedule** tab:
   - Notice the weekly grid displays timed classes (`THEO 201`, `BIBL 110`, `MIN 305`).
   - Directly below the grid, observe the **"No set meeting time (1)"** section:
     - Shows a card for `CHAP 100` - **College Chapel**.
     - Notes: *"Attend 15 of 30 services per semester"*.
     - Action buttons: **Edit** and **Delete**.
   - Below that, the **"All Class Meetings (4)"** list shows all courses, with `CHAP 100` clearly displaying *"Schedule: No set meeting time"*.

### Test 3: "No Set Meeting Time" Checkbox in Dialog
1. On the Schedule tab, click `+ Add class`.
2. Notice the new checkbox: **"No set meeting time (for chapel, performance-based, online, or flexible courses)"**.
3. Select `Mon` and `Wed`, and enter times `14:00` to `15:15`.
4. Now check **"No set meeting time"**:
   - The Meeting Days and Start/End time fields are cleanly hidden.
   - The location field is labeled **"Location or notes (optional)"**.
5. Uncheck the checkbox:
   - The days (`Mon`, `Wed`) and times (`14:00`, `15:15`) reappear immediately without having been wiped!
6. Check it again, enter notes *"Online asynchronous course"*, select `+ Add New Course...` (`MUSC 101` - `Music Appreciation`), and click **Save**.
7. The course saves with no day/time errors and appears in the "No set meeting time" section!

### Test 4: Grid Behavior with No Timed Classes
1. On the Schedule tab, click **Delete** on each of the timed classes (`THEO 201`, `BIBL 110`, `MIN 305`), leaving only `CHAP 100` and `MUSC 101`.
2. Observe the weekly grid:
   - It continues to render an empty weekly grid with the default 8:00 AM – 6:00 PM range without throwing errors.
   - The "No set meeting time" section remains visible with your unscheduled courses.

### Test 5: Course Sharing in Planner
1. Switch to the **Planner** tab.
2. In the **Filter by Course** dropdown, notice `CHAP 100` and `MUSC 101` are available!
3. Click `+ Add assignment`, select `CHAP 100`, and add an assignment (e.g. *"Midterm Chapel Attendance Check"*).
4. Save and observe the assignment rendered with `CHAP 100`'s assigned course color.

### Test 6: Backup Export & Import with Unscheduled Classes
1. Expand **Data & Backup tools** and click **Export Backup**.
2. Open the downloaded JSON file and inspect the `classes` array:
   - Notice unscheduled courses have `days: []`, `startTime: null`, `endTime: null`, `unscheduled: true`.
3. Click **Clear All Data** and confirm.
4. Click **Import Backup** and select your downloaded file.
5. All assignments, timed classes, unscheduled classes, and course colors restore smoothly without any validation warnings.

---

## 🌿 Git Version Control Commands

To commit these changes to Git, open your terminal (in **Git Bash**, remember to quote the Windows path or use forward slashes):

```bash
# 1. Navigate to the project folder
cd "C:\Users\supaw\Documents\populi-planner"

# 2. Check changed and untracked files
git status

# 3. Stage all new and modified files
git add .

# 4. Commit your changes
git commit -m "Fix Save button styling with --on-primary variable, and add support for unscheduled classes"
```
