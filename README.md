# Populi Planner (MVP)

A streamlined, at-a-glance coursework planner for college students that highlights upcoming assignments from Populi (our school's LMS) and clearly signals what is **NEW** or has a **CHANGED** due date.

---

## 🚀 How to Run the App

1. Navigate to this folder:
   ```text
   C:\Users\supaw\Documents\populi-planner
   ```
2. Double-click **`index.html`** to open it in Google Chrome, Microsoft Edge, Firefox, or Safari.
3. No build tools, npm, servers, or installations required!

---

## 🎨 Where to Change Colors and Styling

All theme controls (colors, fonts, border radiuses, and spacing) live at the very top of **`styles.css`** inside the `:root` block:

```css
:root {
  /* Page Colors */
  --bg-color: #f8fafc;
  --card-bg: #ffffff;
  --primary: #2563eb;          /* Accent color for buttons/focus */

  /* Badges */
  --badge-new-bg: #ecfdf5;     /* Green background for 'New' items */
  --badge-new-text: #047857;   /* Green text */
  --badge-changed-bg: #fffbeb; /* Amber background for changed dates */
  --badge-changed-text: #b45309;

  /* Font & Spacing */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --radius-md: 10px;
}
```

Change any value there to immediately re-theme the entire application.

---

## 📊 Where the Data Lives

All sample coursework data is stored in **`data/assignments.js`**:

```javascript
window.ASSIGNMENTS_DATA = [
  {
    id: "theo-reading-1",
    courseCode: "THEO 201",
    courseName: "Systematic Theology I",
    title: "Weekly Reading Reflection: Trinity & Ecclesiology",
    dueDaysOffset: 0,            // 0 = today, 1-7 = this week, 8+ = later
    previousDueDaysOffset: -2,  // used when status is 'changed'
    status: "changed"           // "new", "changed", or "normal"
  },
  ...
];
```

### Future Populi LMS Integration
When you are ready to connect to real Populi data (via a school API key, an ics/calendar export, or a scraper script), that script can simply output this exact JSON-compatible structure into `data/assignments.js`. The user interface, sections, badges, and localStorage system will continue working without changing a single line of UI code.

---

## 💾 Features in this MVP

- **Three Time Sections**: Automatically sorts coursework into *Today*, *This Week*, and *Later* using dynamic dates relative to today's date.
- **Change Detection Badges**:
  - `New`: Newly posted assignments.
  - `Due date changed (Was [Old Date] → now [New Date])`: Clearly displays schedule adjustments.
- **Filter by Course**: Dropdown to focus on one course (`THEO 201`, `BIBL 110`, `MIN 305`) or view all.
- **"Planned" Checkbox**: Check off assignments as you plan them. Status is saved to your browser's `localStorage` so it persists when you refresh or close the page.

---

## 🌿 Git Version Control Commands

To save your initial project in Git, open PowerShell or Command Prompt, navigate to the folder, and run these commands step-by-step:

```powershell
# 1. Move into the project directory
cd C:\Users\supaw\Documents\populi-planner

# 2. Initialize a new Git repository
git init

# 3. Check the status of your files
git status

# 4. Stage all files for commit
git add .

# 5. Create your initial commit
git commit -m "Initial commit: Populi Planner MVP with Today, This Week, Later sections, badges, and filter"
```
