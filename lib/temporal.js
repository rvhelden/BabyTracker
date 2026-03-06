import { Temporal } from "@js-temporal/polyfill";

export const timeZone = Temporal.Now.timeZoneId();

export function todayPlainDate() {
  return Temporal.Now.plainDateISO(timeZone);
}

export function nowZoned() {
  return Temporal.Now.zonedDateTimeISO(timeZone);
}

export function nowInstant() {
  return Temporal.Now.instant();
}

export function parsePlainDate(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  try {
    return Temporal.PlainDate.from(raw);
  } catch {
    const normalized = raw.includes(" ") ? raw.replace(" ", "T") : raw;
    try {
      return Temporal.PlainDateTime.from(normalized).toPlainDate();
    } catch {
      const datePart = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (!datePart) {
        return null;
      }
      try {
        return Temporal.PlainDate.from(datePart);
      } catch {
        return null;
      }
    }
  }
}

export function parsePlainDateTime(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).includes("T") ? String(value) : String(value).replace(" ", "T");
  try {
    return Temporal.PlainDateTime.from(normalized);
  } catch {
    return null;
  }
}

export function parseZonedDateTime(value) {
  if (!value) {
    return null;
  }
  try {
    return Temporal.ZonedDateTime.from(String(value));
  } catch {
    return null;
  }
}

export function parseInstant(value) {
  if (!value) {
    return null;
  }
  try {
    return Temporal.Instant.from(String(value));
  } catch {
    return null;
  }
}

export function toLocalDateInput(value) {
  const date = value || todayPlainDate();
  return date.toString();
}

export function toLocalDateTimeInput(value) {
  const dateTime = value || nowZoned().toPlainDateTime();
  return dateTime.toString({ smallestUnit: "minute" });
}

export function formatLocalDate(date) {
  if (!date) {
    return "";
  }
  return date.toLocaleString(undefined, { dateStyle: "medium" });
}

export function formatWeekdayShort(dateTime) {
  if (!dateTime) {
    return "";
  }
  if (dateTime instanceof Temporal.PlainDate) {
    const zoned = dateTime.toZonedDateTime({
      timeZone,
      plainTime: Temporal.PlainTime.from("00:00"),
    });
    return zoned.toLocaleString(undefined, { weekday: "short" });
  }
  if (dateTime instanceof Temporal.PlainDateTime) {
    return dateTime.toZonedDateTime(timeZone).toLocaleString(undefined, { weekday: "short" });
  }
  if (dateTime instanceof Temporal.ZonedDateTime) {
    return dateTime.toLocaleString(undefined, { weekday: "short" });
  }
  return String(dateTime);
}

export function formatLocalDateTime(dateTime) {
  if (!dateTime) {
    return "";
  }
  if (dateTime instanceof Temporal.PlainDateTime) {
    return dateTime
      .toZonedDateTime(timeZone)
      .toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  if (dateTime instanceof Temporal.ZonedDateTime) {
    return dateTime.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  return String(dateTime);
}

export function formatLocalTime(dateTime) {
  if (!dateTime) {
    return "";
  }
  if (dateTime instanceof Temporal.PlainDateTime) {
    return dateTime.toZonedDateTime(timeZone).toLocaleString(undefined, { timeStyle: "short" });
  }
  if (dateTime instanceof Temporal.ZonedDateTime) {
    return dateTime.toLocaleString(undefined, { timeStyle: "short" });
  }
  return String(dateTime);
}

export function startOfDay(date) {
  if (!date) {
    return null;
  }
  return date.toPlainDateTime({ hour: 0, minute: 0, second: 0, millisecond: 0 });
}

export function addMinutes(dateTime, minutes) {
  if (!dateTime) {
    return null;
  }
  return dateTime.add({ minutes });
}

export function addHours(dateTime, hours) {
  if (!dateTime) {
    return null;
  }
  return dateTime.add({ hours });
}

export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }
  return endDate.since(startDate, { largestUnit: "days" }).days;
}

export function durationMinutes(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime) {
    return null;
  }
  const diff = endDateTime.since(startDateTime, { largestUnit: "minutes" });
  return Math.max(0, Math.round(diff.total({ unit: "minutes" })));
}

export function diffMinutes(startInstant, endInstant) {
  if (!startInstant || !endInstant) {
    return null;
  }
  const diff = endInstant.since(startInstant, { largestUnit: "minutes" });
  return Math.max(0, Math.round(diff.total({ unit: "minutes" })));
}

export function diffMilliseconds(startInstant, endInstant) {
  if (!startInstant || !endInstant) {
    return null;
  }
  return endInstant.epochMilliseconds - startInstant.epochMilliseconds;
}

export function formatDayKey(date) {
  if (!date) {
    return "";
  }
  return date.toString();
}

export function zonedFromPlainDateTime(dateTime) {
  if (!dateTime) {
    return null;
  }
  if (dateTime instanceof Temporal.ZonedDateTime) {
    return dateTime;
  }
  if (dateTime instanceof Temporal.PlainDateTime) {
    return dateTime.toZonedDateTime(timeZone);
  }
  return null;
}

export function plainDateFromString(value) {
  return parsePlainDate(value);
}

export function plainDateTimeFromString(value) {
  return parsePlainDateTime(value);
}

export function instantFromString(value) {
  return parseInstant(value);
}

export { Temporal };
