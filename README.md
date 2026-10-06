# Populi Planner (Manual Entry, Calendar & Modal Popups)

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

## ✨ Features & Architecture (Stage 1)

### 1. Sticky Top Bar & Tabs
- **Compact & Sticky**: Always visible at the top (`height: 56px`).
- **Tabs**: Real `<button role="tab">` elements for **Planner** and **Schedule**. The active tab persists across all page updates and actions.
- **Top Action Button**: Prominent `+ Add assignment` button on the Planner tab. In Stage 1, this button is automatically hidden on the Schedule tab until Stage 2 is built.

### 2. Native Modal Dialog (`<dialog>`)
- **First Screen Priority**: Forms no longer occupy space on the main page. The first screen focuses directly on upcoming coursework and the visual calendar.
- **Triggering**: Clicking `+ Add assignment`, `+ Add your first assignment` in an empty state, or `Edit` on an assignment card opens the native `<dialog>`.
- **Safe Backdrop Click**: Only closes the modal when *both* `mousedown` and `click` occur on the backdrop itself. Selecting text with your mouse drifting outside the dialog will never close it.
- **Focus Management**: Focus automatically moves to the title field on open, and returns to the button that opened it when closed. Supports native `Esc` and Cancel.
- **"Save and add another"**: Rapid syllabus entry: saves the assignment, retains the selected course and due date, clears the title, and re-focuses the title field without closing the modal.

### 3. Sticky Offset & Scroll Padding
- To prevent the sticky calendar sidebar from sliding under the sticky top bar, its sticky `top` is offset to `calc(var(--topbar-height) + var(--space-md))` and its `max-height` subtracts the top bar height.
- `scroll-padding-top` is configured so anchor scrolling and focus navigation never get obscured behind the top bar.

### 4. Slimmed-Down Planner Layout
- Course filtering is reduced to a single compact line above the coursework.
- Collapsed **Data & Backup tools** (`<details>` at the bottom of the page) keeps data import, export, sample loading, and clearing available without visual clutter.

### 5. Visual Month Calendar (Side Panel)
- **Always 6 Rows (42 Cells)**: Sunday-first grid that maintains consistent height month-to-month to prevent layout jumps.
- **Assignment Indicator Dots**:
  - Up to 3 dots per day, plus `+N` for additional coursework.
  - Normal dots use `--primary` (silvery pink).
  - Overdue items use danger colors (`--danger-text`).
  - Planned items show dimmed dots.
- **Selected Day Panel**: Clicking any day reveals its tasks in the sidebar panel with title, course code, and interactive "planned" checkbox. Clicking the same day deselects it.
- **Responsive Layout**: Sticky sidebar beside the main sections on wide screens (≥900px), stacking cleanly above the sections on smaller screens.

---

## 🎨 Design Rules & Styling

### Design Rules
1. **Never hardcode colors**: Always reference the CSS custom properties in `:root` (e.g. `var(--bg-color)`, `var(--input-bg)`, `var(--text-main)`).
2. **Never overwrite existing `:root` theme values**: Preserve the custom dark palette across all updates.

### Theme Variables (`styles.css`)

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

To save Stage 1 changes to Git, open your terminal (in **Git Bash**, remember to quote the Windows path or use forward slashes):

```bash
# 1. Navigate to the project folder
cd "C:\Users\supaw\Documents\populi-planner"

# 2. Check changed and untracked files
git status

# 3. Stage all new and modified files
git add .

# 4. Commit your changes
git commit -m "Stage 1: Add sticky top bar, native modal dialog, compact layout, and collapsed backup tools"
```
