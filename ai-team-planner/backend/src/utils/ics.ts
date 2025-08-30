import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CalendarEvent } from '../types';
import { config } from '../env';

dayjs.extend(utc);

/**
 * Generate ICS (iCalendar) format string from calendar events
 */
export function generateICS(events: CalendarEvent[], calendarName?: string): string {
  const now = dayjs.utc();
  const prodId = '-//AI Team Planner//Calendar Export//EN';
  const calName = calendarName || config.calendar.name;

  // ICS header
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    `X-WR-CALDESC:AI Team Planner Generated Calendar`,
    'X-WR-TIMEZONE:UTC',
  ];

  // Add each event
  events.forEach(event => {
    const eventLines = generateEventLines(event);
    lines.push(...eventLines);
  });

  // ICS footer
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate ICS event lines for a single calendar event
 */
function generateEventLines(event: CalendarEvent): string[] {
  const start = dayjs.utc(event.start);
  const end = dayjs.utc(event.end);
  const created = dayjs.utc(event.created_at);
  const modified = dayjs.utc(event.updated_at);

  // Generate unique UID
  const uid = `task-${event.task_id}-${event.id}@ai-team-planner`;

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDateTime(dayjs.utc())}`,
    `DTSTART:${formatICSDateTime(start)}`,
    `DTEND:${formatICSDateTime(end)}`,
    `CREATED:${formatICSDateTime(created)}`,
    `LAST-MODIFIED:${formatICSDateTime(modified)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  // Add optional fields
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  // Add categories for filtering
  lines.push('CATEGORIES:AI Team Planner,Task,Work');

  // Add status based on task completion (you could query task status)
  lines.push('STATUS:CONFIRMED');

  // Add transparency (show as busy)
  lines.push('TRANSP:OPAQUE');

  lines.push('END:VEVENT');

  return lines;
}

/**
 * Format datetime for ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDateTime(date: dayjs.Dayjs): string {
  return date.format('YYYYMMDD[T]HHmmss[Z]');
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')    // Escape backslashes
    .replace(/;/g, '\\;')      // Escape semicolons
    .replace(/,/g, '\\,')      // Escape commas
    .replace(/\n/g, '\\n')     // Escape newlines
    .replace(/\r/g, '')        // Remove carriage returns
    .slice(0, 998);            // Limit length per ICS spec
}

/**
 * Generate ICS for a specific date range
 */
export function generateICSForDateRange(
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date,
  calendarName?: string
): string {
  const filteredEvents = events.filter(event => {
    const eventStart = dayjs(event.start);
    const rangeStart = dayjs(startDate);
    const rangeEnd = dayjs(endDate);
    
    return eventStart.isAfter(rangeStart) && eventStart.isBefore(rangeEnd);
  });

  return generateICS(filteredEvents, calendarName);
}

/**
 * Validate ICS content for common issues
 */
export function validateICS(icsContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = icsContent.split('\r\n');

  // Check required headers
  if (!lines.includes('BEGIN:VCALENDAR')) {
    errors.push('Missing BEGIN:VCALENDAR');
  }
  if (!lines.includes('END:VCALENDAR')) {
    errors.push('Missing END:VCALENDAR');
  }
  if (!lines.find(line => line.startsWith('VERSION:'))) {
    errors.push('Missing VERSION property');
  }

  // Check event structure
  const eventBegins = lines.filter(line => line === 'BEGIN:VEVENT').length;
  const eventEnds = lines.filter(line => line === 'END:VEVENT').length;
  
  if (eventBegins !== eventEnds) {
    errors.push('Mismatched BEGIN:VEVENT and END:VEVENT count');
  }

  // Check for required event properties
  let currentEvent: string[] = [];
  let inEvent = false;
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = [];
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      
      // Validate current event has required properties
      const hasUID = currentEvent.some(l => l.startsWith('UID:'));
      const hasDTStart = currentEvent.some(l => l.startsWith('DTSTART:'));
      const hasSummary = currentEvent.some(l => l.startsWith('SUMMARY:'));
      
      if (!hasUID) errors.push('Event missing UID');
      if (!hasDTStart) errors.push('Event missing DTSTART');
      if (!hasSummary) errors.push('Event missing SUMMARY');
      
    } else if (inEvent) {
      currentEvent.push(line);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get MIME type and file extension for ICS files
 */
export function getICSMimeInfo() {
  return {
    mimeType: 'text/calendar; charset=utf-8',
    extension: '.ics',
    disposition: 'attachment',
  };
}
