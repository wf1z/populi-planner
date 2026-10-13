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

## 📅 Populi Calendar (.ics) Import (Stages 1 & 2)

Import calendar files (`.ics`) exported from Populi to automatically populate your course catalog, weekly class schedule, and coursework planner without tedious manual entry.

### 1. Security & Privacy Notice
> [!IMPORTANT]
> **Calendar Data Privacy**: Calendar files (`.ics`) exported from Populi contain real personal student schedule data, including courses, professors, meeting locations, and assignments.
> - **`.gitignore` protection**: `*.ics` is ignored in `.gitignore` to prevent committing calendar files to version control.
> - **Zero server transmissions**: All `.ics` file reading, parsing, mapping, and rendering happens 100% client-side inside your local browser.
> - **Untrusted Text Rendering**: Every course title, assignment summary, meeting location, and raw debug string is rendered strictly via `textContent`, never `innerHTML`. No embedded links are parsed or executed.

### 2. Stage 1: RFC 5545 Parsing Capabilities
- **Tolerant Line Unfolding**: Unfolds lines wrapped with CRLF/LF followed by a space or tab (`\r\n `, `\n\t`, etc.).
- **Case-Insensitive Property & Quoted Parameter Parsing**: Handles property names and parameters regardless of case, including quoted parameter values (e.g. `TZID="America/Los_Angeles"`).
- **Strict Local Date/Time Handling**:
  - **All-day dates** (`VALUE=DATE` or 8 digits): Decoded directly into local `{ year, month, day }` and formatted as `YYYY-MM-DD`. Never uses `new Date("YYYY-MM-DD")` or `.toISOString()`.
  - **Floating times**: Wall-clock values mapped directly into local time parts.
  - **UTC times ("Z")**: Decoded into local date and time parts using the browser's local timezone.
  - **TZID times**: Campus wall-clock times preserved, with a note indicating the timezone as written.
- **Component Counting**: Reports the count of every component type found in the file (e.g. `40 VEVENT, 3 VTODO, 1 VTIMEZONE`).
- **VTODO Support**: Treated as a one-time assignment item using `DUE` (or `DTSTART`) as its date.
- **Weekly Recurrence (RRULE)**:
  - Supports `FREQ=WEEKLY` with `BYDAY`, `INTERVAL`, `COUNT`, `UNTIL`, and `EXDATE`.
  - Capped at 60 occurrences and 1 year from today.
  - Detects daylight saving clock shifts across the first 12 occurrences and displays a visible warning: `⚠️ times shift after clock change`.
  - Numbered weekdays (e.g. `1MO`) and non-weekly frequencies (e.g. `DAILY`, `MONTHLY`) are classified as `Unsupported`.
  - Events marked `STATUS:CANCELLED` or containing `RECURRENCE-ID` are classified as `Unsupported`.

### 3. Stage 2: Map & Import Architecture
- **Automatic Course Code Guessing**:
  - Scans event summaries for standard course codes (e.g. `THEO 201`, `BIBL 110`, `MIN 305`).
  - Guessed codes are normalized using `normalizeCourseCode` (trim, collapse spaces, uppercase).
- **Shared Course Mappings Panel**:
  - All events sharing a guessed code share a single mapping dropdown.
  - Choose an existing course record or select `+ Create new course: <Code>`.
  - When creating new courses, each course is allocated the first unused color from the 8-color palette (`--course-color-1` through `--course-color-8`).
- **Action Selection**:
  - For each event row, pick **Class meeting**, **Assignment / due date**, or **Skip**.
  - Intelligent defaults: repeating events default to **Class meeting**, one-time events default to **Assignment**, unsupported / duplicates / previously skipped items default to **Skip**.
  - **Quick Group Select Buttons**: One-click bulk buttons to map repeating items, one-time items, or skip all unsupported items.
- **Occurrence Expansion for Repeating Assignments (Note 8)**:
  - If a repeating event is mapped to **Assignment**, it is expanded into individual assignment records per occurrence date (excluding `EXDATE`s and respecting `UNTIL`/`COUNT`).
  - Expanded assignments receive a deterministic `externalId` composed of `UID#YYYY-MM-DD` (e.g. `chapel-series@populi#2026-10-15`).
  - Class meetings use `externalId = UID`.
- **Duplicate Detection against Existing Planner Items (Note 9)**:
  - Checks events against existing planner items by normalized course, normalized title (ignoring course prefix and punctuation), and due date.
  - Detected duplicates display an **Already in your planner** badge, default to **Skip**, and link the calendar `externalId` to the existing assignment without creating a duplicate record.
- **Remembering Skipped and Deleted Items (Note 10)**:
  - Skipped event UIDs and deleted imported items (`deleteAssignment` / `deleteClassMeeting`) are saved in `localStorage` under `populi_ignored_uids`.
  - On future re-imports, previously ignored items default to **Skip**.
  - `populi_ignored_uids` is included in Version 3 JSON backups.
- **In-Place Re-import Updates (Note 11)**:
  - Re-importing a calendar file only updates an assignment's `dueDate` (recording `previousDueDate` and setting `lastChanged` timestamp), and a class meeting's `days`, `startTime`, `endTime`, and `location`.
  - Never overwrites custom titles, courses, or `planned` checkbox state.
  - Existing items no longer in the file remain untouched.
- **Baseline Detection (Note 12)**:
  - Baseline import is detected strictly by verifying that `no stored assignment or class meeting has source === "ics"`.
  - On baseline import, `firstSeen` and `lastChanged` are set to `null` so no false "New" or "Due date changed" badges appear.
  - On subsequent imports, newly added assignments receive a `firstSeen` timestamp, and shifted due dates receive a `lastChanged` timestamp.
- **Pre-Save Confirmation Screen**:
  - Displays a full breakdown before committing anything to storage:
    - New courses to create (with color swatches).
    - Class meetings to add and update (with exact day/time shifts).
    - Assignments to add and due date changes highlighted.
    - Safety and preservation metrics (linked duplicates, untouched missing items, remembered skips).
  - Navigation options: **Back to Preview** (preserves all selections), **Cancel** (discards import), and **Confirm and Save**.
  - Redraws immediately through `renderApp()`.

---

## 🧪 How to Test Stage 2 (Calendar Map & Import)

### Test 1: Open Dialog & Paste Sample Calendar Data
1. Open `index.html` in your web browser.
2. In the top bar, click the **Courses** tab (or **Schedule** tab) and click **Import Calendar**.
3. Paste the following calendar snippet containing one class lecture, one chapel series, and one assignment:
   ```text
   BEGIN:VCALENDAR
   VERSION:2.0
   PRODID:-//Populi//Calendar//EN
   BEGIN:VEVENT
   UID:class-theo201-fall2026@populi.co
   SUMMARY:THEO 201: Systematic Theology I
   DTSTART:20261013T090000
   DTEND:20261013T101500
   RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=6
   LOCATION:Chapel Hall 102
   END:VEVENT
   BEGIN:VEVENT
   UID:chapel-series-fall2026@populi.co
   SUMMARY:CHAP 100: Campus Chapel Gathering
   DTSTART:20261014T100000
   DTEND:20261014T110000
   RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=4
   LOCATION:Main Auditorium
   END:VEVENT
   BEGIN:VEVENT
   UID:assign-reading-theo201@populi.co
   SUMMARY:THEO 201: Reading Reflection 1
   DTSTART;VALUE=DATE:20261020
   LOCATION:Online
   END:VEVENT
   END:VCALENDAR
   ```
4. Observe the Preview UI:
   - **Course Mappings**: Displays detected courses `THEO 201` and `CHAP 100` mapped to `+ Create new course`.
   - **Table Rows**:
     - `THEO 201: Systematic Theology I` defaults to **Class meeting**.
     - `CHAP 100: Campus Chapel Gathering` defaults to **Class meeting**.
     - `THEO 201: Reading Reflection 1` defaults to **Assignment / due date**.

### Test 2: Repeating Event Mapped to Assignment (Note 8)
1. On the row for `CHAP 100: Campus Chapel Gathering`, change the action dropdown from **Class meeting** to **Assignment / due date**.
2. Click the **Review & Import...** button at the bottom:
   - The confirmation summary appears.
   - Headline displays: *"Import 1 class meeting and 5 assignments, create 2 courses"*.
   - In the Assignments section, observe that `CHAP 100: Campus Chapel Gathering` was expanded into 4 individual assignments (one for each Wednesday in the series).
3. Click **Back to Preview**:
   - Verify all your course mappings and action choices were remembered.

### Test 3: Baseline Import & Badge Verification (Note 12)
1. Click **Review & Import...** again, then click **Confirm and Save**:
   - The dialog closes and `renderApp()` redraws the page.
2. Check the **Courses** tab:
   - Both `THEO 201` and `CHAP 100` have been created with distinct palette colors.
3. Check the **Schedule** tab:
   - `THEO 201` appears on Tuesday and Thursday from 9:00 AM to 10:15 AM in `Chapel Hall 102`.
4. Check the **Planner** tab:
   - The assignments for `THEO 201` and `CHAP 100` are displayed.
   - Notice that **no "New" badges appear** because this was the initial baseline import!

### Test 4: Duplicate Detection & Linking (Note 9)
1. Open the Calendar Import dialog again and paste the same calendar text as Test 1.
2. In the preview table:
   - Notice that `THEO 201: Reading Reflection 1` now displays the badge **Already in your planner** and its action default is set to **Skip**.
3. Click **Review & Import...**:
   - The summary indicates: *"1 assignment(s) already in your planner were linked to calendar IDs without creating duplicates."*

### Test 5: In-Place Due Date & Class Time Shift on Re-Import (Note 11)
1. In the Planner, check the checkbox on one `CHAP 100` assignment to mark it as **Planned**, and rename `THEO 201: Reading Reflection 1` to `THEO 201: Reading Reflection 1 (Finished Draft)`.
2. Open the Calendar Import dialog and paste a modified calendar where the due date and class time shifted:
   ```text
   BEGIN:VCALENDAR
   VERSION:2.0
   BEGIN:VEVENT
   UID:class-theo201-fall2026@populi.co
   SUMMARY:THEO 201: Systematic Theology I
   DTSTART:20261013T093000
   DTEND:20261013T104500
   RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=6
   LOCATION:Room 205
   END:VEVENT
   BEGIN:VEVENT
   UID:assign-reading-theo201@populi.co
   SUMMARY:THEO 201: Reading Reflection 1
   DTSTART;VALUE=DATE:20261022
   LOCATION:Online
   END:VEVENT
   END:VCALENDAR
   ```
3. Set the action for `THEO 201: Reading Reflection 1` to **Assignment / due date** and click **Review & Import...**:
   - Review the confirmation screen:
     - Class Meetings: highlights time shift to `09:30 - 10:45` and location `Room 205`.
     - Assignments: highlights *"Changed due date: 'THEO 201: Reading Reflection 1 (Finished Draft)' was 2026-10-20 → now 2026-10-22"*.
4. Click **Confirm and Save**:
   - In the **Planner**: notice your custom title `(Finished Draft)` and planned checkbox remain intact, the due date updated to Oct 22, and a **"Due date changed"** badge is now visible!
   - In the **Schedule**: the meeting block moved to 9:30 AM – 10:45 AM in Room 205.

### Test 6: Remembering Deleted Items (Note 10)
1. In the Planner, delete one of the `CHAP 100` assignments.
2. In the browser Developer Tools console or Local Storage:
   - Check `localStorage.getItem("populi_ignored_uids")`: verify the deleted item's `externalId` is recorded.
3. Re-import the original calendar:
   - Notice the deleted item automatically defaults to **Skip** so it does not reappear unexpectedly.

---

## 🌿 Git Version Control Commands

To commit Stage 2 to your Git repository, run these commands in your terminal:

```bash
# 1. Navigate to the project folder
cd "C:\Users\supaw\Documents\populi-planner"

# 2. Check changed and untracked files
git status

# 3. Stage all modified files (note: *.ics files remain automatically ignored)
git add .

# 4. Commit your changes
git commit -m "Implement Stage 2: Populi Calendar (.ics) course mapping, occurrence expansion, duplicate detection, and in-place re-import"
```
