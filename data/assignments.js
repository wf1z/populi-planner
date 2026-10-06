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

// Sample course blueprint definitions.
window.getSampleCourseDefinitions = function () {
  return [
    { code: "THEO 201", name: "Systematic Theology I", defaultColor: 1 },
    { code: "BIBL 110", name: "Old Testament Survey", defaultColor: 2 },
    { code: "MIN 305", name: "Pastoral Ministry & Leadership", defaultColor: 3 },
    { code: "CHAP 100", name: "College Chapel", defaultColor: 4 }
  ];
};

// Reuses existing course records when codes match, or creates new course records.
window.ensureSampleCourses = function () {
  const currentCourses = getStoredCourses();
  const sampleDefs = window.getSampleCourseDefinitions();
  const codeToCourseMap = {};

  sampleDefs.forEach(def => {
    const cleanCode = normalizeCourseCode(def.code);
    let match = currentCourses.find(c => normalizeCourseCode(c.code) === cleanCode);
    if (!match) {
      match = {
        id: generateUniqueId("course"),
        code: cleanCode,
        name: def.name,
        colorNumber: allocateColorNumber(currentCourses),
        source: "sample"
      };
      currentCourses.push(match);
    }
    codeToCourseMap[cleanCode] = match;
  });

  saveStoredCourses(currentCourses);
  return codeToCourseMap;
};

// Builds fresh sample assignments relative to today's date linked via courseId.
window.getFreshSampleAssignments = function (courseMap = null) {
  const map = courseMap || window.ensureSampleCourses();
  const now = Date.now();

  const theoId = map["THEO 201"].id;
  const biblId = map["BIBL 110"].id;
  const minId = map["MIN 305"].id;

  return [
    // --- OVERDUE (-2 days) ---
    {
      id: "sample-overdue-1",
      courseId: theoId,
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
      courseId: theoId,
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
      courseId: biblId,
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
      courseId: minId,
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
      courseId: biblId,
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
      courseId: theoId,
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
      courseId: minId,
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
      courseId: biblId,
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
      courseId: theoId,
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
      courseId: minId,
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
      courseId: biblId,
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

// Builds fresh sample class meetings for the sample courses linked via courseId.
window.getFreshSampleClasses = function (courseMap = null) {
  const map = courseMap || window.ensureSampleCourses();

  const theoId = map["THEO 201"].id;
  const biblId = map["BIBL 110"].id;
  const minId = map["MIN 305"].id;
  const chapelId = map["CHAP 100"].id;

  return [
    {
      id: "sample-class-1",
      courseId: theoId,
      days: [1, 3, 5], // Monday, Wednesday, Friday
      startTime: "09:00",
      endTime: "10:15",
      location: "Chapel Hall 102",
      source: "sample",
      unscheduled: false
    },
    {
      id: "sample-class-2",
      courseId: biblId,
      days: [2, 4], // Tuesday, Thursday
      startTime: "10:30",
      endTime: "11:45",
      location: "Academic Center 204",
      source: "sample",
      unscheduled: false
    },
    {
      id: "sample-class-3",
      courseId: minId,
      days: [1, 3], // Monday, Wednesday (overlaps with THEO 201 from 10:00 to 10:15)
      startTime: "10:00",
      endTime: "11:15",
      location: "Ministry Wing 105",
      source: "sample",
      unscheduled: false
    },
    {
      id: "sample-class-chapel",
      courseId: chapelId,
      days: [],
      startTime: null,
      endTime: null,
      location: "Attend 15 of 30 services per semester",
      source: "sample",
      unscheduled: true
    }
  ];
};
