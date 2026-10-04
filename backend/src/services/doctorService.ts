import { prisma } from '../lib/prisma';

export function listDoctors() {
  return prisma.doctor.findMany({ orderBy: { id: 'asc' } });
}

export function findDoctorById(id: number) {
  return prisma.doctor.findUnique({ where: { id }, select: { id: true, availability: true } });
}

const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function weekdayIndex(value: string): number {
  return weekdays.findIndex((weekday) => weekday.startsWith(value.toLowerCase()));
}

function parseClock(value: string): number | null {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return hour * 60 + Number(match[2] ?? 0);
}

export function isWithinAvailability(availability: string, preferredTime: Date): boolean {
  const timeRange = availability.match(/(\d{1,2}(?::\d{2})?\s*[AP]M)\s*-\s*(\d{1,2}(?::\d{2})?\s*[AP]M)\s*$/i);
  if (!timeRange || timeRange.index === undefined) return false;

  const startMinutes = parseClock(timeRange[1]);
  const endMinutes = parseClock(timeRange[2]);
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) return false;

  const dayText = availability
    .slice(0, timeRange.index)
    .replace(/^Every\s+/i, '')
    .replace(/,\s*$/, '');
  const availableDays = new Set<number>();

  for (const item of dayText.split(/\s*(?:&|,|\band\b)\s*/i)) {
    const range = item.match(/^([a-z]+)\s+(?:to|through|-)\s+([a-z]+)$/i);
    if (range) {
      const firstDay = weekdayIndex(range[1]);
      const lastDay = weekdayIndex(range[2]);
      if (firstDay < 0 || lastDay < 0) return false;
      for (let day = firstDay; ; day = (day + 1) % weekdays.length) {
        availableDays.add(day);
        if (day === lastDay) break;
      }
      continue;
    }

    const day = weekdayIndex(item.trim());
    if (day < 0) return false;
    availableDays.add(day);
  }

  const requestedMinutes = preferredTime.getHours() * 60 + preferredTime.getMinutes();
  return availableDays.has(preferredTime.getDay()) && requestedMinutes >= startMinutes && requestedMinutes < endMinutes;
}