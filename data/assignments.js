// NOTE: This sample file defines assignments as a global JavaScript array.
// Later, real Populi LMS data (from an export or API sync) can replace this file
// without modifying index.html, styles.css, or app.js.

window.ASSIGNMENTS_DATA = [
  // --- TODAY ---
  {
    id: "theo-reading-1",
    courseCode: "THEO 201",
    courseName: "Systematic Theology I",
    title: "Weekly Reading Reflection: Trinity & Ecclesiology",
    dueDaysOffset: 0,
    previousDueDaysOffset: -2,
    status: "changed"
  },
  {
    id: "bibl-quiz-1",
    courseCode: "BIBL 110",
    courseName: "Old Testament Survey",
    title: "Pentateuch Reading & Concept Quiz",
    dueDaysOffset: 0,
    previousDueDaysOffset: null,
    status: "new"
  },
  {
    id: "min-case-1",
    courseCode: "MIN 305",
    courseName: "Pastoral Ministry & Leadership",
    title: "Hospital Care Visitation Case Analysis",
    dueDaysOffset: 0,
    previousDueDaysOffset: null,
    status: "normal"
  },

  // --- THIS WEEK ---
  {
    id: "bibl-outline-1",
    courseCode: "BIBL 110",
    courseName: "Old Testament Survey",
    title: "Historical Books Essay Outline",
    dueDaysOffset: 2,
    previousDueDaysOffset: 4,
    status: "changed"
  },
  {
    id: "theo-draft-1",
    courseCode: "THEO 201",
    courseName: "Systematic Theology I",
    title: "Christology Paper Rough Draft",
    dueDaysOffset: 4,
    previousDueDaysOffset: null,
    status: "new"
  },
  {
    id: "min-sermon-1",
    courseCode: "MIN 305",
    courseName: "Pastoral Ministry & Leadership",
    title: "Sermon Outline: Expository Preaching on Beatitudes",
    dueDaysOffset: 5,
    previousDueDaysOffset: null,
    status: "normal"
  },
  {
    id: "bibl-memory-1",
    courseCode: "BIBL 110",
    courseName: "Old Testament Survey",
    title: "Passage Recitation & Context Analysis: Isaiah 53",
    dueDaysOffset: 6,
    previousDueDaysOffset: null,
    status: "normal"
  },

  // --- LATER ---
  {
    id: "theo-final-1",
    courseCode: "THEO 201",
    courseName: "Systematic Theology I",
    title: "Theological Synthesis & Final Integrative Paper",
    dueDaysOffset: 12,
    previousDueDaysOffset: null,
    status: "new"
  },
  {
    id: "min-practicum-1",
    courseCode: "MIN 305",
    courseName: "Pastoral Ministry & Leadership",
    title: "Community Outreach Practicum Ministry Log",
    dueDaysOffset: 15,
    previousDueDaysOffset: 10,
    status: "changed"
  },
  {
    id: "bibl-term-1",
    courseCode: "BIBL 110",
    courseName: "Old Testament Survey",
    title: "Covenant Theology Research Paper",
    dueDaysOffset: 21,
    previousDueDaysOffset: null,
    status: "normal"
  }
];
