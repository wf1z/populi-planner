// ==========================================================================
// POPULI PLANNER - CALENDAR (.ICS) PARSER & PREVIEW GENERATOR (STAGE 1)
// Handles RFC 5545 VEVENT and VTODO parsing strictly using local date/time parts.
// ==========================================================================

// Maximum file size (2 MB) and event count thresholds for safety.
const ICS_MAX_FILE_BYTES = 2 * 1024 * 1024;
const ICS_MAX_EVENT_COUNT = 2000;
const ICS_MAX_OCCURRENCE_EXPANSION = 60;

// Mapping of RFC 5545 two-letter day codes to 0-6 index (Sunday = 0).
const ICS_WEEKDAY_MAP = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6
};

// Reverse mapping for display labels.
const ICS_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Unfolds lines wrapped with CRLF/LF followed by a space or tab (RFC 5545 §3.1).
function unfoldICS(rawText) {
  if (!rawText) return "";
  return rawText.replace(/\r\n[ \t]|\n[ \t]|\r[ \t]/g, "");
}

// Unescapes text values according to RFC 5545 escaping rules (\n, \N, \,, \;, \\).
function unescapeICSText(str) {
  if (!str) return "";
  return str
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// Formats a numeric month and day into a friendly string like "Oct 15".
function formatShortMonthDay(year, monthNum, dayNum) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = monthNames[monthNum - 1] || `M${monthNum}`;
  return `${m} ${dayNum}`;
}

// Parses a single RFC 5545 content line into name, parameters, and unescaped value.
function parseICSLine(line) {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const leftPart = line.slice(0, colonIndex);
  const rawValue = line.slice(colonIndex + 1);

  // Parse property name and parameters
  const semiTokens = [];
  let currentToken = "";
  let insideQuotes = false;

  for (let i = 0; i < leftPart.length; i++) {
    const char = leftPart[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentToken += char;
    } else if (char === ";" && !insideQuotes) {
      semiTokens.push(currentToken);
      currentToken = "";
    } else {
      currentToken += char;
    }
  }
  if (currentToken) {
    semiTokens.push(currentToken);
  }

  const propName = (semiTokens[0] || "").trim().toUpperCase();
  const params = {};

  for (let i = 1; i < semiTokens.length; i++) {
    const eqIdx = semiTokens[i].indexOf("=");
    if (eqIdx !== -1) {
      const pKey = semiTokens[i].slice(0, eqIdx).trim().toUpperCase();
      let pVal = semiTokens[i].slice(eqIdx + 1).trim();
      // Remove enclosing quotes if present
      if (pVal.startsWith('"') && pVal.endsWith('"')) {
        pVal = pVal.slice(1, -1);
      }
      params[pKey] = pVal;
    }
  }

  return {
    name: propName,
    params: params,
    value: rawValue
  };
}

// Parses RFC 5545 date/time strings strictly into local date and time parts.
// Supports: All-day (YYYYMMDD), Floating (YYYYMMDDTHHMMSS), UTC (YYYYMMDDTHHMMSSZ), and TZID.
function parseICSDateTime(rawValue, params = {}) {
  if (!rawValue) return null;
  const str = rawValue.trim();

  // 1. All-day date (YYYYMMDD or VALUE=DATE)
  const allDayMatch = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (allDayMatch || params.VALUE === "DATE") {
    const match = str.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return {
      isAllDay: true,
      year: year,
      month: month,
      day: day,
      dateKey: dateKey,
      timeStr: null,
      minutes: null,
      tzid: params.TZID || null,
      isUTC: false,
      utcTimestamp: null
    };
  }

  // 2. Date-time with optional trailing Z (UTC)
  const dtMatch = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i);
  if (!dtMatch) {
    return null;
  }

  const rawY = Number(dtMatch[1]);
  const rawM = Number(dtMatch[2]);
  const rawD = Number(dtMatch[3]);
  const rawH = Number(dtMatch[4]);
  const rawMin = Number(dtMatch[5]);
  const rawSec = dtMatch[6] ? Number(dtMatch[6]) : 0;
  const isUTC = Boolean(dtMatch[7]);

  if (isUTC) {
    // Decode UTC timestamp into browser's local time parts
    const utcDate = new Date(Date.UTC(rawY, rawM - 1, rawD, rawH, rawMin, rawSec));
    const locY = utcDate.getFullYear();
    const locM = utcDate.getMonth() + 1;
    const locD = utcDate.getDate();
    const locH = utcDate.getHours();
    const locMin = utcDate.getMinutes();

    const dateKey = `${locY}-${String(locM).padStart(2, "0")}-${String(locD).padStart(2, "0")}`;
    const timeStr = `${String(locH).padStart(2, "0")}:${String(locMin).padStart(2, "0")}`;
    return {
      isAllDay: false,
      year: locY,
      month: locM,
      day: locD,
      hours: locH,
      minutes: locMin,
      dateKey: dateKey,
      timeStr: timeStr,
      minuteOfDay: locH * 60 + locMin,
      tzid: null,
      isUTC: true,
      utcTimestamp: utcDate.getTime()
    };
  }

  // Floating or TZID date-time: extract wall-clock values directly
  const dateKey = `${rawY}-${String(rawM).padStart(2, "0")}-${String(rawD).padStart(2, "0")}`;
  const timeStr = `${String(rawH).padStart(2, "0")}:${String(rawMin).padStart(2, "0")}`;
  return {
    isAllDay: false,
    year: rawY,
    month: rawM,
    day: rawD,
    hours: rawH,
    minutes: rawMin,
    dateKey: dateKey,
    timeStr: timeStr,
    minuteOfDay: rawH * 60 + rawMin,
    tzid: params.TZID || null,
    isUTC: false,
    utcTimestamp: null
  };
}

// Parses an RRULE line into its components, identifying unsupported recurrence rules.
function parseRRULE(rruleStr, dtStart) {
  if (!rruleStr) return null;

  const parts = rruleStr.split(";");
  const rule = {
    freq: null,
    byDay: null,
    interval: 1,
    until: null,
    count: null,
    isUnsupported: false,
    unsupportedReason: null
  };

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim().toUpperCase();
    const val = part.slice(eqIdx + 1).trim();

    if (key === "FREQ") {
      rule.freq = val.toUpperCase();
      if (rule.freq !== "WEEKLY") {
        rule.isUnsupported = true;
        rule.unsupportedReason = `Recurrence frequency \"${rule.freq}\" is unsupported (only WEEKLY is supported).`;
      }
    } else if (key === "INTERVAL") {
      const parsedInterval = parseInt(val, 10);
      if (!isNaN(parsedInterval) && parsedInterval > 0) {
        rule.interval = parsedInterval;
      }
    } else if (key === "COUNT") {
      const parsedCount = parseInt(val, 10);
      if (!isNaN(parsedCount) && parsedCount > 0) {
        rule.count = parsedCount;
      }
    } else if (key === "UNTIL") {
      rule.until = parseICSDateTime(val);
    } else if (key === "BYDAY") {
      const rawDays = val.split(",").map(d => d.trim().toUpperCase());
      const cleanDays = [];
      for (const d of rawDays) {
        // Reject number-prefixed days like 1MO or -1FR
        if (/^[+-]?\d+/.test(d)) {
          rule.isUnsupported = true;
          rule.unsupportedReason = `Numbered recurrence day \"${d}\" is unsupported.`;
          break;
        }
        if (ICS_WEEKDAY_MAP[d] !== undefined) {
          cleanDays.push(ICS_WEEKDAY_MAP[d]);
        }
      }
      rule.byDay = cleanDays.sort((a, b) => a - b);
    }
  }

  // If BYDAY is missing for a weekly event, default to the start day
  if (!rule.byDay && dtStart) {
    const startJsDate = new Date(dtStart.year, dtStart.month - 1, dtStart.day);
    rule.byDay = [startJsDate.getDay()];
  }

  return rule;
}

// Expands weekly recurring occurrences up to 60 occurrences or 1 year from today.
// Detects clock shifts across the first 12 occurrences and computes series end date.
function evaluateWeeklyRecurrence(dtStart, dtEnd, rrule, exdates) {
  if (!dtStart || !rrule || rrule.isUnsupported || !rrule.byDay || rrule.byDay.length === 0) {
    return {
      occurrences: [],
      seriesEndLabel: null,
      isCapped: false,
      timesShiftAfterClockChange: false,
      firstMeetingDays: [],
      firstStartTime: dtStart ? dtStart.timeStr : null,
      firstEndTime: dtEnd ? dtEnd.timeStr : null
    };
  }

  const occurrences = [];
  const exdateSet = new Set(exdates || []);

  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  // First occurrence day & times
  const firstStartTime = dtStart.timeStr;
  const firstEndTime = dtEnd ? dtEnd.timeStr : null;
  const firstMeetingDays = [...rrule.byDay];

  // We track whether any of the first 12 occurrences shift start time
  let timesShiftAfterClockChange = false;
  let isCapped = false;

  // Track weeks starting from the week of dtStart
  const startJsDate = new Date(dtStart.year, dtStart.month - 1, dtStart.day);
  const startDayOfWeek = startJsDate.getDay();
  // Find Sunday of the start week
  const sundayOfStartWeek = new Date(dtStart.year, dtStart.month - 1, dtStart.day - startDayOfWeek);

  let currentWeekSunday = new Date(sundayOfStartWeek.getTime());
  let countProduced = 0;
  let weekIndex = 0;

  // Safety loop cap
  while (countProduced < (rrule.count || ICS_MAX_OCCURRENCE_EXPANSION) && weekIndex < 60) {
    for (const targetDayNum of rrule.byDay) {
      const candidateDate = new Date(currentWeekSunday.getFullYear(), currentWeekSunday.getMonth(), currentWeekSunday.getDate() + targetDayNum);

      // Candidate must be on or after start date
      if (candidateDate < startJsDate) {
        continue;
      }

      // Check UNTIL
      if (rrule.until) {
        const untilDate = new Date(rrule.until.year, rrule.until.month - 1, rrule.until.day, 23, 59, 59);
        if (candidateDate > untilDate) {
          break;
        }
      }

      // Check 1-year cap
      if (candidateDate > oneYearFromNow) {
        isCapped = true;
        break;
      }

      const candY = candidateDate.getFullYear();
      const candM = candidateDate.getMonth() + 1;
      const candD = candidateDate.getDate();
      const dateKey = `${candY}-${String(candM).padStart(2, "0")}-${String(candD).padStart(2, "0")}`;

      if (!exdateSet.has(dateKey)) {
        // If UTC, check whether local time shifts due to daylight saving change
        if (dtStart.isUTC && dtStart.utcTimestamp) {
          // Calculate UTC offset for this occurrence (approx weekly advance in ms)
          const dayDiff = Math.round((candidateDate.getTime() - startJsDate.getTime()) / (24 * 60 * 60 * 1000));
          const candUtcTime = new Date(dtStart.utcTimestamp + dayDiff * 86400000);
          const candLocH = candUtcTime.getHours();
          const candLocM = candUtcTime.getMinutes();
          const candTimeStr = `${String(candLocH).padStart(2, "0")}:${String(candLocM).padStart(2, "0")}`;

          if (countProduced > 0 && countProduced <= 12 && candTimeStr !== firstStartTime) {
            timesShiftAfterClockChange = true;
          }
        }

        occurrences.push({
          dateKey: dateKey,
          year: candY,
          month: candM,
          day: candD,
          dayOfWeek: targetDayNum,
          label: formatShortMonthDay(candY, candM, candD)
        });

        countProduced++;

        if (rrule.count && countProduced >= rrule.count) {
          break;
        }

        if (countProduced >= ICS_MAX_OCCURRENCE_EXPANSION) {
          isCapped = true;
          break;
        }
      }
    }

    if (rrule.count && countProduced >= rrule.count) {
      break;
    }
    if (isCapped) {
      break;
    }

    // Step forward by INTERVAL weeks
    currentWeekSunday.setDate(currentWeekSunday.getDate() + (rrule.interval * 7));
    weekIndex += rrule.interval;
  }

  // Determine series end label
  let seriesEndLabel = null;
  if (rrule.until) {
    seriesEndLabel = `ends ${formatShortMonthDay(rrule.until.year, rrule.until.month, rrule.until.day)}`;
  } else if (rrule.count && occurrences.length > 0) {
    const lastOcc = occurrences[occurrences.length - 1];
    seriesEndLabel = `ends ${formatShortMonthDay(lastOcc.year, lastOcc.month, lastOcc.day)}`;
  } else if (occurrences.length > 0) {
    const lastOcc = occurrences[occurrences.length - 1];
    seriesEndLabel = `ends ${formatShortMonthDay(lastOcc.year, lastOcc.month, lastOcc.day)}`;
  }

  return {
    occurrences: occurrences,
    seriesEndLabel: seriesEndLabel,
    isCapped: isCapped,
    timesShiftAfterClockChange: timesShiftAfterClockChange,
    firstMeetingDays: firstMeetingDays,
    firstStartTime: firstStartTime,
    firstEndTime: firstEndTime
  };
}

// Parses the full unfolded ICS text into an event preview object.
// Returns an object containing component counts, event items, and parse errors if any.
function parseICSText(rawText) {
  // Check file size safety limit (2 MB)
  const byteLength = new Blob([rawText]).size;
  if (byteLength > ICS_MAX_FILE_BYTES) {
    const mb = (byteLength / (1024 * 1024)).toFixed(1);
    throw new Error(`The calendar file is too large (${mb} MB). The maximum allowed file size is 2 MB.`);
  }

  const unfolded = unfoldICS(rawText);
  const lines = unfolded.split(/\r\n|\n|\r/);

  // Track counts of EVERY component type found (e.g. VEVENT, VTODO, VTIMEZONE)
  const componentCounts = {};

  const events = [];
  let currentComponent = null;
  let currentProps = [];
  const parentStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.toUpperCase().startsWith("BEGIN:")) {
      const type = line.slice(6).trim().toUpperCase();
      componentCounts[type] = (componentCounts[type] || 0) + 1;

      if (currentComponent) {
        parentStack.push(currentComponent);
      }
      currentComponent = type;
      currentProps = [];
      continue;
    }

    if (line.toUpperCase().startsWith("END:")) {
      const endedType = line.slice(4).trim().toUpperCase();

      if (endedType === "VEVENT" || endedType === "VTODO") {
        events.push({
          componentType: endedType,
          props: currentProps
        });
      }

      currentComponent = parentStack.pop() || null;
      currentProps = [];
      continue;
    }

    if (currentComponent === "VEVENT" || currentComponent === "VTODO") {
      const parsedLine = parseICSLine(line);
      if (parsedLine) {
        currentProps.push(parsedLine);
      }
    }
  }

  // Check event count safety limit (2,000 events)
  if (events.length > ICS_MAX_EVENT_COUNT) {
    throw new Error(`The calendar file contains ${events.length.toLocaleString()} events. The maximum allowed limit is ${ICS_MAX_EVENT_COUNT.toLocaleString()} events.`);
  }

  // Process raw components into structured event objects
  const parsedItems = [];

  for (let idx = 0; idx < events.length; idx++) {
    const comp = events[idx];
    const props = comp.props;

    let uid = null;
    let summary = "";
    let location = "";
    let description = "";
    let status = "";
    let recurrenceId = null;
    let rruleStr = null;
    let dtStart = null;
    let dtEnd = null;
    let due = null;
    let lastModified = null;
    const exdates = [];
    let tzidUsed = null;

    for (const p of props) {
      if (p.name === "UID") {
        uid = p.value.trim();
      } else if (p.name === "SUMMARY") {
        summary = unescapeICSText(p.value.trim());
      } else if (p.name === "LOCATION") {
        location = unescapeICSText(p.value.trim());
      } else if (p.name === "DESCRIPTION") {
        description = unescapeICSText(p.value.trim());
      } else if (p.name === "STATUS") {
        status = p.value.trim().toUpperCase();
      } else if (p.name === "RECURRENCE-ID") {
        recurrenceId = p.value.trim();
      } else if (p.name === "RRULE") {
        rruleStr = p.value.trim();
      } else if (p.name === "DTSTART") {
        dtStart = parseICSDateTime(p.value, p.params);
        if (p.params && p.params.TZID) tzidUsed = p.params.TZID;
      } else if (p.name === "DTEND") {
        dtEnd = parseICSDateTime(p.value, p.params);
        if (p.params && p.params.TZID && !tzidUsed) tzidUsed = p.params.TZID;
      } else if (p.name === "DUE") {
        due = parseICSDateTime(p.value, p.params);
        if (p.params && p.params.TZID && !tzidUsed) tzidUsed = p.params.TZID;
      } else if (p.name === "LAST-MODIFIED" || p.name === "DTSTAMP") {
        lastModified = p.value.trim();
      } else if (p.name === "EXDATE") {
        // EXDATE can contain multiple comma-separated dates
        const dateTokens = p.value.split(",");
        for (const token of dateTokens) {
          const parsedEx = parseICSDateTime(token.trim(), p.params);
          if (parsedEx && parsedEx.dateKey) {
            exdates.push(parsedEx.dateKey);
          }
        }
      }
    }

    // For VTODO, date defaults to DUE or DTSTART
    if (comp.componentType === "VTODO") {
      if (!dtStart && due) {
        dtStart = due;
      }
    }

    // Fallback ID if UID was omitted
    if (!uid) {
      uid = `ics-event-${idx + 1}-${Date.now()}`;
    }

    // Determine event classification
    let eventType = "one-time";
    let unsupportedReason = null;

    if (status === "CANCELLED") {
      eventType = "unsupported";
      unsupportedReason = "Cancelled event (STATUS:CANCELLED).";
    } else if (recurrenceId) {
      eventType = "unsupported";
      unsupportedReason = "Changed single occurrence of a series (RECURRENCE-ID).";
    } else if (rruleStr) {
      const parsedRrule = parseRRULE(rruleStr, dtStart);
      if (parsedRrule.isUnsupported) {
        eventType = "unsupported";
        unsupportedReason = parsedRrule.unsupportedReason;
      } else {
        eventType = "repeating";
      }
    }

    // Recurrence expansion & daylight saving verification
    let recurrenceInfo = null;
    if (eventType === "repeating") {
      const parsedRrule = parseRRULE(rruleStr, dtStart);
      recurrenceInfo = evaluateWeeklyRecurrence(dtStart, dtEnd, parsedRrule, exdates);
    }

    parsedItems.push({
      index: idx + 1,
      componentType: comp.componentType,
      uid: uid,
      summary: summary || "(Untitled event)",
      location: location || "",
      description: description || "",
      status: status,
      hasRecurrenceId: Boolean(recurrenceId),
      rruleRaw: rruleStr,
      dtStart: dtStart,
      dtEnd: dtEnd,
      due: due,
      tzid: tzidUsed,
      exdates: exdates,
      eventType: eventType,
      unsupportedReason: unsupportedReason,
      recurrenceInfo: recurrenceInfo,
      rawProps: props
    });
  }

  return {
    componentCounts: componentCounts,
    totalEvents: parsedItems.length,
    events: parsedItems
  };
}

// Formats a summary string of all discovered components (e.g. "40 VEVENT, 3 VTODO, 1 VTIMEZONE").
function formatComponentCountsString(countsMap) {
  const parts = [];
  const priorityKeys = ["VEVENT", "VTODO", "VTIMEZONE", "VALARM", "VCALENDAR"];
  const seen = new Set();

  for (const k of priorityKeys) {
    if (countsMap[k]) {
      parts.push(`${countsMap[k]} ${k}`);
      seen.add(k);
    }
  }

  for (const [k, count] of Object.entries(countsMap)) {
    if (!seen.has(k) && k !== "STANDARD" && k !== "DAYLIGHT") {
      parts.push(`${count} ${k}`);
    }
  }

  return parts.length > 0 ? parts.join(", ") : "0 components";
}

// Formats a user-friendly "When" description string for an event row.
function formatEventWhen(item) {
  if (item.eventType === "repeating" && item.recurrenceInfo) {
    const days = (item.recurrenceInfo.firstMeetingDays || []).map(d => ICS_DAY_NAMES[d]).join(", ");
    let timeSpan = "";
    if (item.recurrenceInfo.firstStartTime) {
      timeSpan = ` ${item.recurrenceInfo.firstStartTime}`;
      if (item.recurrenceInfo.firstEndTime) {
        timeSpan += ` - ${item.recurrenceInfo.firstEndTime}`;
      }
    }
    const endStr = item.recurrenceInfo.seriesEndLabel ? ` (${item.recurrenceInfo.seriesEndLabel})` : "";
    return `${days || "Weekly"}${timeSpan}${endStr}`;
  }

  if (item.dtStart) {
    const dateFormatted = formatShortMonthDay(item.dtStart.year, item.dtStart.month, item.dtStart.day);
    if (item.dtStart.isAllDay) {
      return `${dateFormatted} (All day)`;
    }
    let timeStr = item.dtStart.timeStr || "";
    if (item.dtEnd && item.dtEnd.timeStr) {
      timeStr += ` - ${item.dtEnd.timeStr}`;
    }
    return `${dateFormatted} ${timeStr}`.trim();
  }

  return "No date specified";
}

// --------------------------------------------------------------------------
// STAGE 2: COURSE GUESSING, DUPLICATE DETECTION & IMPORT MAPPING
// --------------------------------------------------------------------------

// Guesses a course code from an event summary (e.g. "THEO 201" from "THEO 201: Systematic Theology I").
function guessCourseCode(summary) {
  if (!summary) return null;

  // Match prefix pattern like "THEO 201" or "THEO201" or "BIBL 110"
  const prefixMatch = summary.match(/^\s*([A-Za-z]{2,5})\s*(\d{3,4}[A-Za-z]?)\b/);
  if (prefixMatch) {
    return `${prefixMatch[1].toUpperCase()} ${prefixMatch[2].toUpperCase()}`;
  }

  // Look for any standard course code inside the title
  const anyMatch = summary.match(/\b([A-Za-z]{2,5})\s*(\d{3,4}[A-Za-z]?)\b/);
  if (anyMatch) {
    return `${anyMatch[1].toUpperCase()} ${anyMatch[2].toUpperCase()}`;
  }

  return null;
}

// Strips the guessed course code prefix from an assignment title for clean duplicate comparison.
function stripCoursePrefix(summary, guessedCode) {
  if (!summary) return "";
  if (!guessedCode) return summary.trim();
  const pattern = new RegExp(`^\\s*${guessedCode.replace(/\s+/g, "\\s*")}\\s*[:\\-\\–]?\\s*`, "i");
  const stripped = summary.replace(pattern, "").trim();
  return stripped || summary.trim();
}

// Normalizes a title string for loose duplicate comparison (lowercase alphanumeric).
function normalizeTitle(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Checks if an event matches an existing assignment in the planner.
function findExistingAssignmentDuplicate(event, guessedCode, existingAssignments, existingCourses) {
  if (!event || !event.dtStart || !event.dtStart.dateKey) return null;

  // 1. Direct match on externalId
  const byExternalId = existingAssignments.find(a => a.externalId === event.uid);
  if (byExternalId) {
    return byExternalId;
  }

  // 2. Fuzzy match on normalized course, due date, and normalized title
  if (!guessedCode) return null;

  const normalizedGuessed = normalizeCourseCode(guessedCode);
  const matchingCourses = existingCourses.filter(c => normalizeCourseCode(c.code) === normalizedGuessed);
  if (matchingCourses.length === 0) return null;

  const matchingCourseIds = new Set(matchingCourses.map(c => c.id));
  const eventDateKey = event.dtStart.dateKey;
  const cleanSummary = normalizeTitle(event.summary);
  const cleanStripped = normalizeTitle(stripCoursePrefix(event.summary, guessedCode));

  for (const a of existingAssignments) {
    if (matchingCourseIds.has(a.courseId) && a.dueDate === eventDateKey) {
      const cleanExisting = normalizeTitle(a.title);
      if (cleanExisting === cleanSummary || cleanExisting === cleanStripped) {
        return a;
      }
    }
  }

  return null;
}

// Checks whether an event date falls before a specified cutoff date key (YYYY-MM-DD).
function isEventBeforeCutoff(event, cutoffDate) {
  if (!cutoffDate || !event) return false;
  const eventDateKey = (event.dtStart && event.dtStart.dateKey) || (event.due && event.due.dateKey) || null;
  if (!eventDateKey) return false;
  return eventDateKey < cutoffDate;
}

// Builds the DOM preview table, course mappings, group toggles, and review import action.
function buildCalendarPreviewDOM(
  parseResult,
  onReviewImport,
  savedCourseMappings,
  savedRowActions,
  savedCutoffDate,
  savedUserModifiedRows
) {
  const container = document.createElement("div");
  container.className = "ics-preview-container";

  const existingAssignments = typeof getStoredAssignments === "function" ? getStoredAssignments() : [];
  const existingCourses = typeof getStoredCourses === "function" ? getStoredCourses() : [];
  const ignoredUIDs = typeof getIgnoredUIDs === "function" ? new Set(getIgnoredUIDs()) : new Set();

  const cutoffInput = document.getElementById("calendar-cutoff-date");
  const cutoffTodayBtn = document.getElementById("calendar-cutoff-today-btn");
  const userModifiedRows = savedUserModifiedRows ? new Set(savedUserModifiedRows) : new Set();
  let cutoffDate = (savedCutoffDate !== undefined)
    ? savedCutoffDate
    : (cutoffInput ? cutoffInput.value : "");

  if (cutoffInput && savedCutoffDate !== undefined) {
    cutoffInput.value = savedCutoffDate;
  }

  // 1. Prepare course mapping state per unique detected code
  const uniqueGuessedCodes = [];
  const guessedCodeSet = new Set();

  parseResult.events.forEach(item => {
    item.guessedCode = guessCourseCode(item.summary) || "GENERAL";
    if (!guessedCodeSet.has(item.guessedCode)) {
      guessedCodeSet.add(item.guessedCode);
      uniqueGuessedCodes.push(item.guessedCode);
    }

    // Check duplicate against existing assignments
    const duplicateMatch = findExistingAssignmentDuplicate(item, item.guessedCode, existingAssignments, existingCourses);
    if (duplicateMatch) {
      item.isDuplicate = true;
      item.matchedAssignmentId = duplicateMatch.id;
    } else {
      item.isDuplicate = false;
      item.matchedAssignmentId = null;
    }

    item.isPreviouslyIgnored = ignoredUIDs.has(item.uid);
  });

  // Course mappings dictionary: code -> courseId (existing id or __NEW__:CODE)
  const courseMappings = savedCourseMappings ? { ...savedCourseMappings } : {};
  uniqueGuessedCodes.forEach(code => {
    if (!courseMappings[code]) {
      const matchedCourse = existingCourses.find(c => normalizeCourseCode(c.code) === normalizeCourseCode(code));
      if (matchedCourse) {
        courseMappings[code] = matchedCourse.id;
      } else {
        courseMappings[code] = `__NEW__:${code}`;
      }
    }
  });

  // Default row action choices (considering cutoff date)
  const rowActionChoices = savedRowActions ? [...savedRowActions] : parseResult.events.map(item => {
    if (item.isDuplicate || item.isPreviouslyIgnored) {
      return "skip";
    }
    if (item.eventType === "repeating") {
      return "class";
    }
    if (item.eventType === "one-time") {
      if (isEventBeforeCutoff(item, cutoffDate)) {
        return "skip";
      }
      return "assignment";
    }
    return "skip";
  });

  // 2. Overall Summary Line
  const counts = {
    repeating: 0,
    oneTime: 0,
    unsupported: 0
  };

  parseResult.events.forEach(e => {
    if (e.eventType === "repeating") counts.repeating++;
    else if (e.eventType === "one-time") counts.oneTime++;
    else counts.unsupported++;
  });

  const summaryHeader = document.createElement("div");
  summaryHeader.className = "ics-summary-banner";

  const mainStat = document.createElement("div");
  mainStat.className = "ics-summary-stat";
  mainStat.textContent = `${parseResult.totalEvents} events found: ${counts.repeating} repeating, ${counts.oneTime} one-time, ${counts.unsupported} unsupported`;
  summaryHeader.appendChild(mainStat);

  const componentNote = document.createElement("div");
  componentNote.className = "ics-summary-components";
  componentNote.textContent = `Components in file: ${formatComponentCountsString(parseResult.componentCounts)}`;
  summaryHeader.appendChild(componentNote);

  container.appendChild(summaryHeader);

  // 3. Course Mappings Section
  if (uniqueGuessedCodes.length > 0) {
    const mappingBox = document.createElement("div");
    mappingBox.className = "ics-course-mappings-box";

    const mappingTitle = document.createElement("h3");
    mappingTitle.className = "ics-section-subtitle";
    mappingTitle.textContent = "Course Mappings";
    mappingBox.appendChild(mappingTitle);

    const mappingDesc = document.createElement("p");
    mappingDesc.className = "form-hint";
    mappingDesc.textContent = "We detected the following courses in your calendar file. Choose an existing course or create a new one:";
    mappingBox.appendChild(mappingDesc);

    const mappingGrid = document.createElement("div");
    mappingGrid.className = "ics-course-mappings-grid";

    uniqueGuessedCodes.forEach(code => {
      const row = document.createElement("div");
      row.className = "ics-course-mapping-row";

      const label = document.createElement("span");
      label.className = "course-tag";
      label.textContent = code;
      row.appendChild(label);

      const arrow = document.createElement("span");
      arrow.className = "ics-mapping-arrow";
      arrow.textContent = "→";
      row.appendChild(arrow);

      const select = document.createElement("select");
      select.className = "form-select ics-course-select";

      // Populate existing courses
      existingCourses.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.code} - ${c.name}`;
        if (c.id === courseMappings[code]) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      // New course creation option
      const newOpt = document.createElement("option");
      newOpt.value = `__NEW__:${code}`;
      newOpt.textContent = `+ Create new course: ${code}`;
      if (courseMappings[code] === `__NEW__:${code}`) {
        newOpt.selected = true;
      }
      select.appendChild(newOpt);

      select.addEventListener("change", function () {
        courseMappings[code] = select.value;
      });

      row.appendChild(select);
      mappingGrid.appendChild(row);
    });

    mappingBox.appendChild(mappingGrid);
    container.appendChild(mappingBox);
  }

  // 4. Quick Group Action Controls
  const groupActionsBox = document.createElement("div");
  groupActionsBox.className = "ics-group-actions";

  const groupLabel = document.createElement("span");
  groupLabel.className = "ics-group-label";
  groupLabel.textContent = "Quick select all in group:";
  groupActionsBox.appendChild(groupLabel);

  const btnGroupWrap = document.createElement("div");
  btnGroupWrap.className = "ics-group-buttons";

  // Repeating group actions
  const btnAllRepeatingClass = document.createElement("button");
  btnAllRepeatingClass.type = "button";
  btnAllRepeatingClass.className = "btn-secondary btn-sm";
  btnAllRepeatingClass.textContent = "Repeating → Class meeting";
  btnAllRepeatingClass.addEventListener("click", () => setAllGroupAction("repeating", "class"));
  btnGroupWrap.appendChild(btnAllRepeatingClass);

  const btnAllRepeatingAssign = document.createElement("button");
  btnAllRepeatingAssign.type = "button";
  btnAllRepeatingAssign.className = "btn-secondary btn-sm";
  btnAllRepeatingAssign.textContent = "Repeating → Assignment";
  btnAllRepeatingAssign.addEventListener("click", () => setAllGroupAction("repeating", "assignment"));
  btnGroupWrap.appendChild(btnAllRepeatingAssign);

  // One-time group actions
  const btnAllOnetimeAssign = document.createElement("button");
  btnAllOnetimeAssign.type = "button";
  btnAllOnetimeAssign.className = "btn-secondary btn-sm";
  btnAllOnetimeAssign.textContent = "One-time → Assignment";
  btnAllOnetimeAssign.addEventListener("click", () => setAllGroupAction("one-time", "assignment"));
  btnGroupWrap.appendChild(btnAllOnetimeAssign);

  const btnAllSkip = document.createElement("button");
  btnAllSkip.type = "button";
  btnAllSkip.className = "btn-secondary btn-sm";
  btnAllSkip.textContent = "Skip all unsupported";
  btnAllSkip.addEventListener("click", () => setAllGroupAction("unsupported", "skip"));
  btnGroupWrap.appendChild(btnAllSkip);

  groupActionsBox.appendChild(btnGroupWrap);
  container.appendChild(groupActionsBox);

  // Helper to bulk-change row actions
  function setAllGroupAction(groupType, newAction) {
    parseResult.events.forEach((item, idx) => {
      if (item.eventType === groupType) {
        userModifiedRows.add(idx);
        rowActionChoices[idx] = newAction;
        const select = table.querySelector(`select[data-row-idx="${idx}"]`);
        if (select) {
          select.value = newAction;
        }
      }
    });
  }

  // 5. Events Preview Table with Action Selector
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "ics-table-scroll";

  const table = document.createElement("table");
  table.className = "ics-preview-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const thTitle = document.createElement("th");
  thTitle.textContent = "Title & Course";
  headerRow.appendChild(thTitle);

  const thWhen = document.createElement("th");
  thWhen.textContent = "When";
  headerRow.appendChild(thWhen);

  const thAction = document.createElement("th");
  thAction.textContent = "Action";
  headerRow.appendChild(thAction);

  const thLocation = document.createElement("th");
  thLocation.textContent = "Location";
  headerRow.appendChild(thLocation);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  parseResult.events.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.eventIdx = idx;

    // Title cell
    const tdTitle = document.createElement("td");
    const titleHeader = document.createElement("div");
    titleHeader.className = "ics-title-header";

    const tag = document.createElement("span");
    tag.className = "course-tag";
    tag.textContent = item.guessedCode;
    titleHeader.appendChild(tag);

    const titleText = document.createElement("span");
    titleText.className = "ics-cell-title";
    titleText.textContent = item.summary;
    titleHeader.appendChild(titleText);
    tdTitle.appendChild(titleHeader);

    // Badges & Notices
    if (item.isDuplicate) {
      const dupBadge = document.createElement("span");
      dupBadge.className = "ics-pill ics-pill-duplicate";
      dupBadge.textContent = "Already in your planner";
      tdTitle.appendChild(dupBadge);
    }

    // Cutoff indicator pill for assignment rows
    if ((item.eventType === "one-time" || item.componentType === "VTODO") && isEventBeforeCutoff(item, cutoffDate)) {
      const cutoffPill = document.createElement("span");
      cutoffPill.className = "ics-pill ics-pill-warning ics-cutoff-pill";
      cutoffPill.dataset.rowIdx = idx;
      cutoffPill.textContent = "Before cutoff";
      tdTitle.appendChild(cutoffPill);
    }

    if (item.eventType === "repeating" && item.recurrenceInfo) {
      if (item.recurrenceInfo.timesShiftAfterClockChange) {
        const warn = document.createElement("span");
        warn.className = "ics-pill ics-pill-warning";
        warn.textContent = "⚠️ times shift after clock change";
        tdTitle.appendChild(warn);
      }
      if (item.recurrenceInfo.isCapped) {
        const capNotice = document.createElement("span");
        capNotice.className = "ics-pill ics-pill-info";
        capNotice.textContent = "Series continues past 60 occurrences / 1 year";
        tdTitle.appendChild(capNotice);
      }
    }

    if (item.tzid) {
      const tzidNotice = document.createElement("div");
      tzidNotice.className = "ics-tzid-note";
      tzidNotice.textContent = `Times as written in ${item.tzid}.`;
      tdTitle.appendChild(tzidNotice);
    }

    if (item.eventType === "unsupported" && item.unsupportedReason) {
      const unsupp = document.createElement("div");
      unsupp.className = "ics-unsupported-reason";
      unsupp.textContent = item.unsupportedReason;
      tdTitle.appendChild(unsupp);
    }

    tr.appendChild(tdTitle);

    // When cell
    const tdWhen = document.createElement("td");
    tdWhen.className = "ics-cell-when";
    tdWhen.textContent = formatEventWhen(item);
    tr.appendChild(tdWhen);

    // Action select cell
    const tdAction = document.createElement("td");
    const actionSelect = document.createElement("select");
    actionSelect.className = "form-select ics-row-action";
    actionSelect.dataset.rowIdx = idx;

    const optClass = document.createElement("option");
    optClass.value = "class";
    optClass.textContent = "Class meeting";
    actionSelect.appendChild(optClass);

    const optAssign = document.createElement("option");
    optAssign.value = "assignment";
    optAssign.textContent = "Assignment / due date";
    actionSelect.appendChild(optAssign);

    const optSkip = document.createElement("option");
    optSkip.value = "skip";
    optSkip.textContent = "Skip";
    actionSelect.appendChild(optSkip);

    actionSelect.value = rowActionChoices[idx];
    actionSelect.addEventListener("change", function () {
      userModifiedRows.add(idx);
      rowActionChoices[idx] = actionSelect.value;
    });

    tdAction.appendChild(actionSelect);
    tr.appendChild(tdAction);

    // Location cell
    const tdLoc = document.createElement("td");
    tdLoc.className = "ics-cell-location";
    tdLoc.textContent = item.location || "—";
    tr.appendChild(tdLoc);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);

  // Function to re-evaluate rows when cutoff date changes
  function updateCutoffRows(newCutoff) {
    cutoffDate = newCutoff;
    parseResult.events.forEach((item, idx) => {
      // Affects assignment rows only, never class meetings!
      if (item.eventType === "one-time" || item.componentType === "VTODO") {
        const rowTr = table.querySelector(`tr[data-event-idx="${idx}"]`);
        const tdTitle = rowTr ? rowTr.querySelector("td:first-child") : null;
        const select = table.querySelector(`select[data-row-idx="${idx}"]`);
        const isCutoff = isEventBeforeCutoff(item, newCutoff);

        // Update Before cutoff pill
        const existingPill = tdTitle ? tdTitle.querySelector(`.ics-cutoff-pill[data-row-idx="${idx}"]`) : null;
        if (isCutoff) {
          if (!existingPill && tdTitle) {
            const pill = document.createElement("span");
            pill.className = "ics-pill ics-pill-warning ics-cutoff-pill";
            pill.dataset.rowIdx = idx;
            pill.textContent = "Before cutoff";
            tdTitle.appendChild(pill);
          }
        } else if (existingPill) {
          existingPill.remove();
        }

        // Update default action ONLY IF not changed by hand
        if (!userModifiedRows.has(idx)) {
          if (isCutoff) {
            rowActionChoices[idx] = "skip";
            if (select) select.value = "skip";
          } else if (!item.isDuplicate && !item.isPreviouslyIgnored) {
            rowActionChoices[idx] = "assignment";
            if (select) select.value = "assignment";
          }
        }
      }
    });
  }

  if (cutoffInput) {
    cutoffInput.oninput = function () {
      updateCutoffRows(cutoffInput.value);
    };
  }
  if (cutoffTodayBtn) {
    cutoffTodayBtn.onclick = function () {
      const todayStr = formatLocalYYYYMMDD(new Date());
      cutoffInput.value = todayStr;
      updateCutoffRows(todayStr);
    };
  }

  // 6. Collapsible Raw Details (first 5 events)
  const details = document.createElement("details");
  details.className = "ics-raw-details";

  const summary = document.createElement("summary");
  summary.textContent = "Show raw details (first 5 events)";
  details.appendChild(summary);

  const rawContainer = document.createElement("div");
  rawContainer.className = "ics-raw-list";

  const first5 = parseResult.events.slice(0, 5);
  first5.forEach((item, i) => {
    const rawBox = document.createElement("div");
    rawBox.className = "ics-raw-item";

    const itemHeading = document.createElement("h4");
    itemHeading.textContent = `Event #${i + 1}: ${item.summary}`;
    rawBox.appendChild(itemHeading);

    const pre = document.createElement("pre");
    const lines = [
      `Component: ${item.componentType}`,
      `UID: ${item.uid}`,
      `Guessed Course: ${item.guessedCode}`,
      `Type: ${item.eventType}`,
      `Location: ${item.location || "(none)"}`,
      `DTSTART: ${item.dtStart ? `${item.dtStart.dateKey} ${item.dtStart.timeStr || "(all-day)"}${item.dtStart.isUTC ? " (UTC decoded)" : ""}` : "(none)"}`,
      `DTEND: ${item.dtEnd ? `${item.dtEnd.dateKey} ${item.dtEnd.timeStr || ""}` : "(none)"}`,
      `RRULE: ${item.rruleRaw || "(none)"}`,
      `EXDATES: ${item.exdates.length > 0 ? item.exdates.join(", ") : "(none)"}`,
      `TZID: ${item.tzid || "(none)"}`
    ];

    if (item.eventType === "repeating" && item.recurrenceInfo) {
      const first3Occurrences = (item.recurrenceInfo.occurrences || []).slice(0, 3).map(o => `${o.label} (${ICS_DAY_NAMES[o.dayOfWeek]})`);
      lines.push(`First 3 occurrences: ${first3Occurrences.length > 0 ? first3Occurrences.join(", ") : "(none calculated)"}`);
    }

    if (item.description) {
      const cleanDesc = item.description.replace(/[\r\n]+/g, " ").slice(0, 150);
      lines.push(`Description preview: ${cleanDesc}${item.description.length > 150 ? "..." : ""}`);
    }

    pre.textContent = lines.join("\n");
    rawBox.appendChild(pre);
    rawContainer.appendChild(rawBox);
  });

  details.appendChild(rawContainer);
  container.appendChild(details);

  // 7. Review & Import Action Bar
  const bottomBar = document.createElement("div");
  bottomBar.className = "ics-preview-actions";

  const btnReview = document.createElement("button");
  btnReview.type = "button";
  btnReview.className = "btn-primary";
  btnReview.textContent = "Review & Import...";
  btnReview.addEventListener("click", function () {
    if (typeof onReviewImport === "function") {
      onReviewImport(parseResult, courseMappings, rowActionChoices, cutoffDate, Array.from(userModifiedRows));
    }
  });

  bottomBar.appendChild(btnReview);
  container.appendChild(bottomBar);

  return container;
}

// Prepares the full import plan comparing against existing stored items.
function prepareImportPlan(parseResult, courseMappings, rowActions, cutoffDate) {
  const existingAssignments = typeof getStoredAssignments === "function" ? getStoredAssignments() : [];
  const existingClasses = typeof getStoredClasses === "function" ? getStoredClasses() : [];
  const existingCourses = typeof getStoredCourses === "function" ? getStoredCourses() : [];

  // 0. Ensure guessedCode, isDuplicate, and matchedAssignmentId are evaluated on all events
  parseResult.events.forEach(item => {
    if (!item.guessedCode) {
      item.guessedCode = guessCourseCode(item.summary) || "GENERAL";
    }
    if (item.isDuplicate === undefined) {
      const dupMatch = findExistingAssignmentDuplicate(item, item.guessedCode, existingAssignments, existingCourses);
      if (dupMatch) {
        item.isDuplicate = true;
        item.matchedAssignmentId = dupMatch.id;
      } else {
        item.isDuplicate = false;
        item.matchedAssignmentId = null;
      }
    }
  });

  const coursesToCreate = [];
  const resolvedCourseIdMap = {}; // code -> real courseId

  // 1. Resolve course IDs and identify new courses to create
  const mappings = courseMappings || {};
  const createdCodes = new Set();
  for (const [code, mappedVal] of Object.entries(mappings)) {
    if (mappedVal && typeof mappedVal === "string" && mappedVal.startsWith("__NEW__:")) {
      const cleanCode = normalizeCourseCode(code);
      if (!createdCodes.has(cleanCode)) {
        createdCodes.add(cleanCode);
        const tempId = generateUniqueId("course");
        const nextColor = typeof allocateColorNumber === "function"
          ? allocateColorNumber([...existingCourses, ...coursesToCreate])
          : 1;
        coursesToCreate.push({
          id: tempId,
          code: cleanCode,
          name: cleanCode,
          colorNumber: nextColor,
          source: "ics"
        });
        resolvedCourseIdMap[code] = tempId;
      }
    } else if (mappedVal) {
      resolvedCourseIdMap[code] = mappedVal;
    }
  }

  // Ensure any guessedCode present in events has a mapped courseId
  parseResult.events.forEach(item => {
    const code = item.guessedCode;
    if (!resolvedCourseIdMap[code]) {
      const matchedCourse = existingCourses.find(c => normalizeCourseCode(c.code) === normalizeCourseCode(code));
      if (matchedCourse) {
        resolvedCourseIdMap[code] = matchedCourse.id;
      } else {
        const cleanCode = normalizeCourseCode(code);
        if (!createdCodes.has(cleanCode)) {
          createdCodes.add(cleanCode);
          const tempId = generateUniqueId("course");
          const nextColor = typeof allocateColorNumber === "function"
            ? allocateColorNumber([...existingCourses, ...coursesToCreate])
            : 1;
          coursesToCreate.push({
            id: tempId,
            code: cleanCode,
            name: cleanCode,
            colorNumber: nextColor,
            source: "ics"
          });
          resolvedCourseIdMap[code] = tempId;
        }
      }
    }
  });

  const newAssignments = [];
  const updatedAssignments = [];
  const matchedExistingAssignments = [];
  const meetingsToGroup = [];
  const skippedUIDs = [];
  let cutoffSkippedCount = 0;

  // Track all external IDs present in this imported file
  const fileExternalIds = new Set();

  parseResult.events.forEach((item, idx) => {
    const action = rowActions[idx] || "skip";
    const courseId = resolvedCourseIdMap[item.guessedCode];

    if (action === "skip") {
      skippedUIDs.push(item.uid);
      if (cutoffDate && isEventBeforeCutoff(item, cutoffDate)) {
        cutoffSkippedCount++;
      }
      if (item.isDuplicate && item.matchedAssignmentId) {
        matchedExistingAssignments.push({
          id: item.matchedAssignmentId,
          externalId: item.uid
        });
      }
      return;
    }

    if (action === "assignment") {
      // If repeating event mapped to assignment, expand each occurrence
      if (item.eventType === "repeating" && item.recurrenceInfo && item.recurrenceInfo.occurrences.length > 0) {
        item.recurrenceInfo.occurrences.forEach(occ => {
          const occExternalId = `${item.uid}#${occ.dateKey}`;
          if (cutoffDate && occ.dateKey < cutoffDate) {
            cutoffSkippedCount++;
            skippedUIDs.push(occExternalId);
            return;
          }
          fileExternalIds.add(occExternalId);

          const existing = existingAssignments.find(a => a.externalId === occExternalId);
          if (existing) {
            if (existing.dueDate !== occ.dateKey) {
              updatedAssignments.push({
                existing: existing,
                oldDueDate: existing.dueDate,
                newDueDate: occ.dateKey,
                title: existing.title
              });
            }
          } else {
            newAssignments.push({
              title: item.summary,
              dueDate: occ.dateKey,
              courseId: courseId,
              source: "ics",
              externalId: occExternalId
            });
          }
        });
      } else if (item.dtStart && item.dtStart.dateKey) {
        fileExternalIds.add(item.uid);

        const existing = existingAssignments.find(a => a.externalId === item.uid);
        if (existing) {
          if (existing.dueDate !== item.dtStart.dateKey) {
            updatedAssignments.push({
              existing: existing,
              oldDueDate: existing.dueDate,
              newDueDate: item.dtStart.dateKey,
              title: existing.title
            });
          }
        } else if (item.isDuplicate && item.matchedAssignmentId) {
          matchedExistingAssignments.push({
            id: item.matchedAssignmentId,
            externalId: item.uid
          });
        } else {
          newAssignments.push({
            title: item.summary,
            dueDate: item.dtStart.dateKey,
            courseId: courseId,
            source: "ics",
            externalId: item.uid
          });
        }
      }
      return;
    }

    if (action === "class") {
      fileExternalIds.add(item.uid);

      let days = [];
      let startTime = null;
      let endTime = null;

      if (item.eventType === "repeating" && item.recurrenceInfo) {
        days = [...(item.recurrenceInfo.firstMeetingDays || [])];
        startTime = item.recurrenceInfo.firstStartTime;
        endTime = item.recurrenceInfo.firstEndTime;
      } else if (item.dtStart) {
        const jsDate = new Date(item.dtStart.year, item.dtStart.month - 1, item.dtStart.day);
        days = [jsDate.getDay()];
        startTime = item.dtStart.timeStr;
        endTime = item.dtEnd ? item.dtEnd.timeStr : null;
      }

      meetingsToGroup.push({
        courseId: courseId,
        days: days,
        startTime: startTime,
        endTime: endTime,
        location: item.location || "",
        uid: item.uid,
        summary: item.summary
      });
    }
  });

  // 2. Merge identical class meetings per course by time and location
  const meetingGroups = {};
  meetingsToGroup.forEach(m => {
    const key = `${m.courseId}|${m.startTime || ""}|${m.endTime || ""}|${(m.location || "").toLowerCase().trim()}`;
    if (!meetingGroups[key]) {
      meetingGroups[key] = {
        courseId: m.courseId,
        startTime: m.startTime,
        endTime: m.endTime,
        location: m.location,
        daysSet: new Set(),
        uids: []
      };
    }
    (m.days || []).forEach(d => meetingGroups[key].daysSet.add(d));
    meetingGroups[key].uids.push(m.uid);
  });

  const newClasses = [];
  const updatedClasses = [];

  for (const group of Object.values(meetingGroups)) {
    const mergedDays = Array.from(group.daysSet).sort((a, b) => a - b);
    const primaryUID = group.uids[0];
    const isUnscheduled = !group.startTime || !group.endTime || mergedDays.length === 0;

    // Check if existing class matches externalId
    const existing = existingClasses.find(c => group.uids.includes(c.externalId));
    if (existing) {
      const daysChanged = JSON.stringify(existing.days) !== JSON.stringify(mergedDays);
      const timeChanged = existing.startTime !== group.startTime || existing.endTime !== group.endTime;
      const locChanged = (existing.location || "").trim() !== (group.location || "").trim();

      if (daysChanged || timeChanged || locChanged) {
        updatedClasses.push({
          existing: existing,
          oldMeeting: { ...existing },
          newDays: mergedDays,
          newStartTime: group.startTime,
          newEndTime: group.endTime,
          newLocation: group.location,
          isUnscheduled: isUnscheduled,
          externalId: primaryUID
        });
      }
    } else {
      newClasses.push({
        courseId: group.courseId,
        days: mergedDays,
        startTime: isUnscheduled ? null : group.startTime,
        endTime: isUnscheduled ? null : group.endTime,
        location: group.location,
        unscheduled: isUnscheduled,
        source: "ics",
        externalId: primaryUID
      });
    }
  }

  // 3. Count disappeared items (present in planner as ics, but missing in new file)
  let disappearedCount = 0;
  existingAssignments.forEach(a => {
    if (a.source === "ics" && a.externalId && !fileExternalIds.has(a.externalId)) {
      disappearedCount++;
    }
  });

  // 4. Headline summary
  const headlineParts = [];
  if (newClasses.length > 0 || updatedClasses.length > 0) {
    const classCount = newClasses.length + updatedClasses.length;
    headlineParts.push(`${classCount} class meeting${classCount !== 1 ? "s" : ""}`);
  }
  if (newAssignments.length > 0 || updatedAssignments.length > 0) {
    const assignCount = newAssignments.length + updatedAssignments.length;
    headlineParts.push(`${assignCount} assignment${assignCount !== 1 ? "s" : ""}`);
  }
  if (coursesToCreate.length > 0) {
    headlineParts.push(`create ${coursesToCreate.length} course${coursesToCreate.length !== 1 ? "s" : ""}`);
  }

  const summaryHeadline = headlineParts.length > 0
    ? `Import ${headlineParts.join(" and ")}`
    : "No new items to import";

  return {
    coursesToCreate: coursesToCreate,
    newAssignments: newAssignments,
    updatedAssignments: updatedAssignments,
    matchedExistingAssignments: matchedExistingAssignments,
    newClasses: newClasses,
    updatedClasses: updatedClasses,
    skippedUIDs: skippedUIDs,
    disappearedCount: disappearedCount,
    cutoffSkippedCount: cutoffSkippedCount,
    cutoffDate: cutoffDate || null,
    summaryHeadline: summaryHeadline
  };
}

// Builds the confirmation summary DOM view before committing any changes to storage.
function buildConfirmSummaryDOM(importPlan, onConfirm, onBack, onCancel) {
  const container = document.createElement("div");
  container.className = "ics-confirm-container";

  // Headline Banner
  const headlineBox = document.createElement("div");
  headlineBox.className = "ics-summary-banner";

  const hTitle = document.createElement("h3");
  hTitle.className = "ics-confirm-heading";
  hTitle.textContent = "Review & Confirm Import";
  headlineBox.appendChild(hTitle);

  const headline = document.createElement("p");
  headline.className = "ics-confirm-headline";
  headline.textContent = importPlan.summaryHeadline;
  headlineBox.appendChild(headline);

  container.appendChild(headlineBox);

  const listContainer = document.createElement("div");
  listContainer.className = "ics-confirm-sections";

  // Section: Courses to Create
  if (importPlan.coursesToCreate.length > 0) {
    const sec = document.createElement("div");
    sec.className = "ics-confirm-section";

    const title = document.createElement("h4");
    title.textContent = `New Courses to Create (${importPlan.coursesToCreate.length})`;
    sec.appendChild(title);

    const ul = document.createElement("ul");
    importPlan.coursesToCreate.forEach(c => {
      const li = document.createElement("li");
      li.textContent = `${c.code} (Color ${c.colorNumber})`;
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    listContainer.appendChild(sec);
  }

  // Section: Class Meetings
  if (importPlan.newClasses.length > 0 || importPlan.updatedClasses.length > 0) {
    const sec = document.createElement("div");
    sec.className = "ics-confirm-section";

    const title = document.createElement("h4");
    title.textContent = `Class Meetings (${importPlan.newClasses.length} new, ${importPlan.updatedClasses.length} updated)`;
    sec.appendChild(title);

    const ul = document.createElement("ul");
    importPlan.newClasses.forEach(m => {
      const li = document.createElement("li");
      const dayStr = (m.days || []).map(d => ICS_DAY_NAMES[d]).join(", ") || "No set days";
      const timeStr = m.startTime && m.endTime ? `${m.startTime} - ${m.endTime}` : "No set time";
      li.textContent = `Add meeting: ${dayStr} ${timeStr}${m.location ? ` (${m.location})` : ""}`;
      ul.appendChild(li);
    });

    importPlan.updatedClasses.forEach(u => {
      const li = document.createElement("li");
      const dayStr = (u.newDays || []).map(d => ICS_DAY_NAMES[d]).join(", ");
      li.textContent = `Update meeting: changed to ${dayStr} ${u.newStartTime || ""} - ${u.newEndTime || ""}`;
      ul.appendChild(li);
    });

    sec.appendChild(ul);
    listContainer.appendChild(sec);
  }

  // Section: Assignments
  if (importPlan.newAssignments.length > 0 || importPlan.updatedAssignments.length > 0) {
    const sec = document.createElement("div");
    sec.className = "ics-confirm-section";

    const title = document.createElement("h4");
    title.textContent = `Assignments (${importPlan.newAssignments.length} new, ${importPlan.updatedAssignments.length} updated)`;
    sec.appendChild(title);

    const ul = document.createElement("ul");

    // Show updated assignments first
    importPlan.updatedAssignments.forEach(u => {
      const li = document.createElement("li");
      li.className = "ics-confirm-change-item";
      li.textContent = `Changed due date: "${u.title}" was ${u.oldDueDate} → now ${u.newDueDate}`;
      ul.appendChild(li);
    });

    // Sample of new assignments (first 6)
    const sampleNew = importPlan.newAssignments.slice(0, 6);
    sampleNew.forEach(a => {
      const li = document.createElement("li");
      li.textContent = `Add: "${a.title}" (Due: ${a.dueDate})`;
      ul.appendChild(li);
    });

    if (importPlan.newAssignments.length > 6) {
      const liMore = document.createElement("li");
      liMore.className = "form-hint";
      liMore.textContent = `... and ${importPlan.newAssignments.length - 6} more new assignments`;
      ul.appendChild(liMore);
    }

    sec.appendChild(ul);
    listContainer.appendChild(sec);
  }

  // Section: Preserved Items & Skipped Items
  const noteSec = document.createElement("div");
  noteSec.className = "ics-confirm-section";

  const noteTitle = document.createElement("h4");
  noteTitle.textContent = "Safety & Preservation";
  noteSec.appendChild(noteTitle);

  const noteUl = document.createElement("ul");

  if (importPlan.matchedExistingAssignments.length > 0) {
    const li = document.createElement("li");
    li.textContent = `${importPlan.matchedExistingAssignments.length} assignment(s) already in your planner were linked to calendar IDs without creating duplicates.`;
    noteUl.appendChild(li);
  }

  if (importPlan.disappearedCount > 0) {
    const li = document.createElement("li");
    li.textContent = `${importPlan.disappearedCount} existing planner item(s) no longer in this calendar file will remain safely untouched.`;
    noteUl.appendChild(li);
  }

  if (importPlan.cutoffSkippedCount > 0) {
    const li = document.createElement("li");
    li.textContent = `${importPlan.cutoffSkippedCount} assignment(s) due before ${importPlan.cutoffDate} were skipped by the cutoff date and will be remembered.`;
    noteUl.appendChild(li);
  }

  if (importPlan.skippedUIDs.length > 0) {
    const li = document.createElement("li");
    li.textContent = `${importPlan.skippedUIDs.length} event(s) were skipped and remembered so they won't appear as new on future re-imports.`;
    noteUl.appendChild(li);
  }

  noteSec.appendChild(noteUl);
  listContainer.appendChild(noteSec);

  container.appendChild(listContainer);

  // Confirmation Footer Actions
  const footerActions = document.createElement("div");
  footerActions.className = "dialog-footer";

  const btnCancel = document.createElement("button");
  btnCancel.type = "button";
  btnCancel.className = "btn-secondary";
  btnCancel.textContent = "Cancel";
  btnCancel.addEventListener("click", onCancel);
  footerActions.appendChild(btnCancel);

  const btnBack = document.createElement("button");
  btnBack.type = "button";
  btnBack.className = "btn-secondary";
  btnBack.textContent = "Back to Preview";
  btnBack.addEventListener("click", onBack);
  footerActions.appendChild(btnBack);

  const btnConfirm = document.createElement("button");
  btnConfirm.type = "button";
  btnConfirm.className = "btn-primary";
  btnConfirm.textContent = "Confirm and Save";
  btnConfirm.addEventListener("click", onConfirm);
  footerActions.appendChild(btnConfirm);

  container.appendChild(footerActions);

  return container;
}

// Commits the verified import plan to localStorage and updates history/badges.
function executeImportPlan(importPlan) {
  const isBaseline = typeof isCalendarBaseline === "function" ? isCalendarBaseline() : false;

  // 1. Save new courses
  if (importPlan.coursesToCreate.length > 0) {
    const courses = getStoredCourses();
    importPlan.coursesToCreate.forEach(c => {
      courses.push(c);
    });
    saveStoredCourses(courses);
  }

  // 2. Add new assignments
  if (importPlan.newAssignments.length > 0) {
    const assignments = getStoredAssignments();
    importPlan.newAssignments.forEach(a => {
      assignments.push({
        id: generateUniqueId("assign"),
        courseId: a.courseId,
        title: a.title.trim(),
        dueDate: a.dueDate,
        planned: false,
        firstSeen: isBaseline ? null : Date.now(),
        lastChanged: null,
        previousDueDate: null,
        source: "ics",
        externalId: a.externalId
      });
    });
    saveStoredAssignments(assignments);
  }

  // 3. Update changed assignments (due date changes)
  if (importPlan.updatedAssignments.length > 0) {
    const assignments = getStoredAssignments();
    importPlan.updatedAssignments.forEach(u => {
      const idx = assignments.findIndex(item => item.id === u.existing.id);
      if (idx !== -1) {
        assignments[idx].previousDueDate = assignments[idx].dueDate;
        assignments[idx].dueDate = u.newDueDate;
        assignments[idx].lastChanged = Date.now();
      }
    });
    saveStoredAssignments(assignments);
  }

  // 4. Attach externalId to matched duplicates
  if (importPlan.matchedExistingAssignments.length > 0) {
    const assignments = getStoredAssignments();
    importPlan.matchedExistingAssignments.forEach(m => {
      const idx = assignments.findIndex(item => item.id === m.id);
      if (idx !== -1 && !assignments[idx].externalId) {
        assignments[idx].externalId = m.externalId;
      }
    });
    saveStoredAssignments(assignments);
  }

  // 5. Save new class meetings
  if (importPlan.newClasses.length > 0) {
    const classes = getStoredClasses();
    importPlan.newClasses.forEach(c => {
      classes.push({
        id: generateUniqueId("meeting"),
        courseId: c.courseId,
        days: c.days || [],
        startTime: c.startTime || null,
        endTime: c.endTime || null,
        location: (c.location || "").trim(),
        source: "ics",
        unscheduled: Boolean(c.unscheduled),
        externalId: c.externalId || null
      });
    });
    saveStoredClasses(classes);
  }

  // 6. Update changed class meetings
  if (importPlan.updatedClasses.length > 0) {
    const classes = getStoredClasses();
    importPlan.updatedClasses.forEach(u => {
      const idx = classes.findIndex(item => item.id === u.existing.id);
      if (idx !== -1) {
        classes[idx].days = u.newDays || [];
        classes[idx].startTime = u.newStartTime || null;
        classes[idx].endTime = u.newEndTime || null;
        classes[idx].location = (u.newLocation || "").trim();
        classes[idx].unscheduled = Boolean(u.isUnscheduled);
      }
    });
    saveStoredClasses(classes);
  }

  // 7. Store skipped UIDs in ignored list
  if (importPlan.skippedUIDs.length > 0 && typeof addIgnoredUIDs === "function") {
    addIgnoredUIDs(importPlan.skippedUIDs);
  }
}
