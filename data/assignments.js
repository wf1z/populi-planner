// Helper to format a local Date object into a YYYY-MM-DD string.
function formatLocalYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generates a YYYY-MM-DD string offset by a specific number of days from today.
function getRelativeDateString(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return formatLocalYYYYMMDD(date);
}

// Builds fresh sample assignments relative to today's date so sections are never stale.
window.getFreshSampleAssignments = function () {
  const now = Date.now();

  return [
    // --- OVERDUE (-2 days) ---
    {
      id: "sample-overdue-1",
      courseCode: "THEO 201",
      courseName: "Systematic Theology I",
      title: "Syllabus Acknowledgement & Academic Integrity Statement",
      dueDate: getRelativeDateString(-2),
      planned: false,
      firstSeen: null,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },

    // --- TODAY (0 days) ---
    {
      id: "sample-today-1",
      courseCode: "THEO 201",
      courseName: "Systematic Theology I",
      title: "Weekly Reading Reflection: Trinity & Ecclesiology",
      dueDate: getRelativeDateString(0),
      planned: false,
      firstSeen: null,
      lastChanged: now,
      previousDueDate: getRelativeDateString(-2),
      source: "sample"
    },
    {
      id: "sample-today-2",
      courseCode: "BIBL 110",
      courseName: "Old Testament Survey",
      title: "Pentateuch Reading & Concept Quiz",
      dueDate: getRelativeDateString(0),
      planned: false,
      firstSeen: now,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },
    {
      id: "sample-today-3",
      courseCode: "MIN 305",
      courseName: "Pastoral Ministry & Leadership",
      title: "Hospital Care Visitation Case Analysis",
      dueDate: getRelativeDateString(0),
      planned: false,
      firstSeen: null,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },

    // --- THIS WEEK (+2 to +6 days) ---
    {
      id: "sample-week-1",
      courseCode: "BIBL 110",
      courseName: "Old Testament Survey",
      title: "Historical Books Essay Outline",
      dueDate: getRelativeDateString(2),
      planned: false,
      firstSeen: null,
      lastChanged: now,
      previousDueDate: getRelativeDateString(4),
      source: "sample"
    },
    {
      id: "sample-week-2",
      courseCode: "THEO 201",
      courseName: "Systematic Theology I",
      title: "Christology Paper Rough Draft",
      dueDate: getRelativeDateString(4),
      planned: false,
      firstSeen: now,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },
    {
      id: "sample-week-3",
      courseCode: "MIN 305",
      courseName: "Pastoral Ministry & Leadership",
      title: "Sermon Outline: Expository Preaching on Beatitudes",
      dueDate: getRelativeDateString(5),
      planned: false,
      firstSeen: null,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },
    {
      id: "sample-week-4",
      courseCode: "BIBL 110",
      courseName: "Old Testament Survey",
      title: "Passage Recitation & Context Analysis: Isaiah 53",
      dueDate: getRelativeDateString(6),
      planned: false,
      firstSeen: null,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },

    // --- LATER (+12 to +21 days) ---
    {
      id: "sample-later-1",
      courseCode: "THEO 201",
      courseName: "Systematic Theology I",
      title: "Theological Synthesis & Final Integrative Paper",
      dueDate: getRelativeDateString(12),
      planned: false,
      firstSeen: now,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    },
    {
      id: "sample-later-2",
      courseCode: "MIN 305",
      courseName: "Pastoral Ministry & Leadership",
      title: "Community Outreach Practicum Ministry Log",
      dueDate: getRelativeDateString(15),
      planned: false,
      firstSeen: null,
      lastChanged: now,
      previousDueDate: getRelativeDateString(10),
      source: "sample"
    },
    {
      id: "sample-later-3",
      courseCode: "BIBL 110",
      courseName: "Old Testament Survey",
      title: "Covenant Theology Research Paper",
      dueDate: getRelativeDateString(21),
      planned: false,
      firstSeen: null,
      lastChanged: null,
      previousDueDate: null,
      source: "sample"
    }
  ];
};

// Builds fresh sample class meetings for the sample courses.
window.getFreshSampleClasses = function () {
  return [
    {
      id: "sample-class-1",
      courseCode: "THEO 201",
      courseName: "Systematic Theology I",
      days: [1, 3, 5], // Monday, Wednesday, Friday
      startTime: "09:00",
      endTime: "10:15",
      location: "Chapel Hall 102",
      source: "sample"
    },
    {
      id: "sample-class-2",
      courseCode: "BIBL 110",
      courseName: "Old Testament Survey",
      days: [2, 4], // Tuesday, Thursday
      startTime: "10:30",
      endTime: "11:45",
      location: "Academic Center 204",
      source: "sample"
    },
    {
      id: "sample-class-3",
      courseCode: "MIN 305",
      courseName: "Pastoral Ministry & Leadership",
      days: [1, 3], // Monday, Wednesday (overlaps with THEO 201 from 10:00 to 10:15)
      startTime: "10:00",
      endTime: "11:15",
      location: "Ministry Wing 105",
      source: "sample",
      unscheduled: false
    },
    {
      id: "sample-class-chapel",
      courseCode: "CHAP 100",
      courseName: "College Chapel",
      days: [],
      startTime: null,
      endTime: null,
      location: "Attend 15 of 30 services per semester",
      source: "sample",
      unscheduled: true
    }
  ];
};
