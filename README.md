# Populi Planner (Coursework Planner & Weekly Class Schedule)

A clean, dark-mode, at-a-glance planner for college students that highlights upcoming coursework, computed **NEW** and **CHANGED** badges, a visual month calendar, an interactive **Weekly Class Schedule**, and a robust **Version 3 Course Data Architecture** supporting course normalization, persistent color allocation, and resilient data migrations.

---

## 🚀 How to Run the App

1. Open File Explorer to:
   ```text
   C:\Users\supaw\Documents\populi-planner
   ```
2. Double-click **`index.html`** to open it in Google Chrome, Microsoft Edge, Firefox, or Safari.
3. No build tools, npm, or servers required!

---

## ✨ Stage 1: Course Data Architecture & Safe Migration (Version 3)

In Stage 1, courses have been upgraded from loose strings copied onto each item into **first-class records**, establishing the clean relational foundation needed for the upcoming Courses tab (Stage 2). The application UI in Stage 1 looks and behaves identically to before, while all data operations now use real course records and references.

### 1. Distinct Course Records (`populi_courses`)
- Each course is stored as an independent record in `localStorage` under `populi_courses`:
  ```json
  {
    "id": "course-1728180000000-abc1234",
    "code": "THEO 201",
    "name": "Systematic Theology I",
    "colorNumber": 1,
    "source": "manual"
  }
  ```
- All assignments (`populi_assignments`) and class meetings (`populi_classes`) now store a `courseId` foreign key instead of duplicate `courseCode` / `courseName` strings.
- Robust lookup fallback via `getCourseById(courseId)` guarantees that even if a reference were ever missing, the application renders gracefully without crashing or throwing errors.

### 2. Multi-Tier Color Allocation (Colors 1 through 8)
- Added `--course-color-7: #614035` (muted terracotta) and `--course-color-8: #3d3b5e` (muted indigo) to `:root` in `styles.css`.
- Intelligent color allocation (`allocateColorNumber()`):
  1. Checks colors 1 through 8 and assigns the **first unused color** so adjacent courses receive different tones.
  2. If all 8 colors are already assigned across courses, it dynamically allocates the **least-used color** to keep palette distribution balanced.

### 3. Bulletproof Migration with Snapshot Recovery
- **Marker Key (`populi_data_version = "3"`)**:
  - Migration status is tracked strictly by `populi_data_version`.
  - The marker is written **LAST**, after every other data write (`courses`, `assignments`, `classes`) succeeds.
- **Untouched Snapshot (`populi_migration_backup_pre_v3`)**:
  - Before converting any data, the raw strings from the old storage keys (`populi_assignments`, `populi_classes`, `populi_course_colors`) are saved in an untouched snapshot.
  - The snapshot is **never overwritten** if it already exists.
  - If migration was ever interrupted or the version marker is missing, migration re-runs directly from the untouched snapshot—never from half-migrated data.
- **Brand-New Users**:
  - A user opening the planner for the first time gets `populi_data_version = "3"` set immediately without creating a snapshot.
- **Migration Failure Recovery Screen**:
  - In the event of an unexpected migration error, a clean recovery screen appears with a **"Download my old data"** button that lets the user immediately download a JSON file of their preserved raw pre-migration data.
- **Clear All Data**:
  - Empties assignments, classes, and courses, leaving the version marker at `"3"` so migration does not re-trigger on an intentionally cleared app.

### 4. Backup Schema Version 3 & Universal Compatibility
- **Version 3 Backup Format**:
  ```json
  {
    "version": 3,
    "exportedAt": "2026-10-06T...",
    "courses": [
      {
        "id": "course-1",
        "code": "THEO 201",
        "name": "Systematic Theology I",
        "colorNumber": 1,
        "source": "manual"
      }
    ],
    "assignments": [
      {
        "id": "assign-1",
        "courseId": "course-1",
        "title": "Syllabus Acknowledgement",
        "dueDate": "2026-10-10",
        "planned": false,
        "firstSeen": null,
        "lastChanged": null,
        "previousDueDate": null,
        "source": "manual"
      }
    ],
    "classes": [
      {
        "id": "meeting-1",
        "courseId": "course-1",
        "days": [1, 3, 5],
        "startTime": "09:00",
        "endTime": "10:15",
        "location": "Chapel Hall 102",
        "source": "manual",
        "unscheduled": false
      }
    ]
  }
  ```
- **Strict V3 Validation**: Verifies that every `courseId` referenced in `assignments` or `classes` exists in `courses`.
- **Seamless V1 / V2 Import Support**:
  - **Version 2 files**: Automatically rebuilt into course records, inheriting colors from the backup's `courseColors` map or matching existing courses, and linking items by `courseId`.
  - **Version 1 files**: Matches assignments to existing courses by normalized code or creates new courses without deleting existing class schedule records.

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

## 🧪 Stage 1 Verification & Testing Steps

To test the Stage 1 data model and migration:

### Test 1: Automatic Migration from Existing Data
1. Open `index.html` in your browser.
2. If you had existing assignments or class schedule items:
   - Notice everything renders normally without missing data or broken cards.
   - Open Developer Tools (`F12`) > **Application** / **Storage** > **Local Storage**:
     - Check `populi_data_version`: value is `"3"`.
     - Check `populi_courses`: contains an array of real course objects (`id, code, name, colorNumber, source`).
     - Check `populi_assignments`: items have `courseId` matching the course IDs.
     - Check `populi_classes`: items have `courseId` matching the course IDs.
     - Check `populi_migration_backup_pre_v3`: contains your untouched pre-migration raw data.

### Test 2: Sample Data & Shared Course Dropdowns
1. Scroll down to **Data & Backup tools**, click **Load Sample Data**, and confirm.
2. In Local Storage, inspect `populi_courses`:
   - Notice 4 sample courses: `THEO 201`, `BIBL 110`, `MIN 305`, `CHAP 100`.
3. Check the **Filter by Course** dropdown on the Planner tab:
   - Lists all 4 courses by code. Selecting one filters assignments accordingly.
4. Click `+ Add assignment` in the top bar:
   - The Course dropdown shows all 4 courses.
5. Click the **Schedule** tab:
   - The weekly grid and the "No set meeting time" section display properly with their assigned course colors.

### Test 3: "+ Add New Course..." Creates Real Course Records
1. On the **Planner** tab, click `+ Add assignment`.
2. Select `+ Add New Course...`.
3. Enter Code `PHIL 101` and Name `Intro to Philosophy`.
4. Enter an Assignment Title and Due Date, then click **Save**.
5. Inspect `populi_courses` in Local Storage:
   - A new course `PHIL 101` has been created with the next unused color (e.g. `colorNumber: 5`).
6. Click the **Schedule** tab and click `+ Add class`:
   - Open the Course dropdown: `PHIL 101 - Intro to Philosophy` is already in the list!

### Test 4: Version 3 Backup Export & Import
1. Scroll to **Data & Backup tools** and click **Export Backup**.
2. Open the downloaded file in a text editor:
   - Notice `"version": 3`.
   - Contains top-level `courses`, `assignments`, and `classes` arrays.
3. Click **Clear All Data** and confirm:
   - All items and courses are cleared.
   - Local Storage shows `populi_data_version` is still `"3"`.
4. Click **Import Backup** and select your downloaded Version 3 file:
   - Confirmation dialog shows counts of courses, assignments, and class meetings.
   - After confirming, all courses, cards, calendar dots, and schedule blocks restore cleanly.

### Test 5: Backward Compatibility (V1 and V2 Import)
1. You can test importing an older Version 1 or Version 2 backup file:
   - A Version 2 file will rebuild course records, maintain legacy color selections, and relink all items.
   - A Version 1 file will merge courses, relink assignments, and leave the class schedule untouched.

---

## 🌿 Git Version Control Commands

To commit your Stage 1 changes:

```bash
# 1. Navigate to the project folder
cd "C:\Users\supaw\Documents\populi-planner"

# 2. Check changed and untracked files
git status

# 3. Stage all new and modified files
git add .

# 4. Commit your changes
git commit -m "Implement Stage 1: Course records, Version 3 migration, color allocation, and v3 backup schema"
```
