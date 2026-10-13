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

// Builds the DOM preview table and collapsible raw details section strictly using textContent.
function buildCalendarPreviewDOM(parseResult) {
  const container = document.createElement("div");
  container.className = "ics-preview-container";

  // 1. Overall Summary Line
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

  // 2. Events Preview Table
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "ics-table-scroll";

  const table = document.createElement("table");
  table.className = "ics-preview-table";

  // Table Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const thTitle = document.createElement("th");
  thTitle.textContent = "Title";
  headerRow.appendChild(thTitle);

  const thWhen = document.createElement("th");
  thWhen.textContent = "When";
  headerRow.appendChild(thWhen);

  const thType = document.createElement("th");
  thType.textContent = "Type";
  headerRow.appendChild(thType);

  const thLocation = document.createElement("th");
  thLocation.textContent = "Location";
  headerRow.appendChild(thLocation);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table Body
  const tbody = document.createElement("tbody");

  parseResult.events.forEach(item => {
    const tr = document.createElement("tr");

    // Title cell with optional shift warning or unsupported reason
    const tdTitle = document.createElement("td");
    const titleText = document.createElement("div");
    titleText.className = "ics-cell-title";
    titleText.textContent = item.summary;
    tdTitle.appendChild(titleText);

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

    // Type badge cell
    const tdType = document.createElement("td");
    const typeBadge = document.createElement("span");
    if (item.eventType === "repeating") {
      typeBadge.className = "ics-badge ics-badge-repeating";
      typeBadge.textContent = "Repeating";
    } else if (item.eventType === "one-time") {
      typeBadge.className = "ics-badge ics-badge-onetime";
      typeBadge.textContent = item.componentType === "VTODO" ? "One-time (Todo)" : "One-time";
    } else {
      typeBadge.className = "ics-badge ics-badge-unsupported";
      typeBadge.textContent = item.status === "CANCELLED" ? "Cancelled" : "Unsupported";
    }
    tdType.appendChild(typeBadge);
    tr.appendChild(tdType);

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

  // 3. Collapsible "Show raw details (first 5 events)" Accordion
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
      // Show first 150 characters of description safely without following links
      const cleanDesc = item.description.replace(/[\r\n]+/g, " ").slice(0, 150);
      lines.push(`Description preview: ${cleanDesc}${item.description.length > 150 ? "..." : ""}`);
    }

    pre.textContent = lines.join("\n");
    rawBox.appendChild(pre);
    rawContainer.appendChild(rawBox);
  });

  details.appendChild(rawContainer);
  container.appendChild(details);

  return container;
}
