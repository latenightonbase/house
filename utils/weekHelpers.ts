/**
 * Utility functions for weekly leaderboard date calculations
 */

/**
 * Get the start and end dates for a given week (Monday to Sunday)
 * @param date - The date within the week
 * @returns Object with weekStartDate and weekEndDate
 */
export const getWeekBoundaries = (date: Date = new Date()): { weekStartDate: Date; weekEndDate: Date } => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const day = d.getDay();
  
  // Calculate days to subtract to get to Monday
  const diff = day === 0 ? -6 : 1 - day;
  
  // Set to Monday of current week
  const weekStartDate = new Date(d);
  weekStartDate.setDate(d.getDate() + diff);
  
  // Set to Sunday of current week
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  
  return { weekStartDate, weekEndDate };
};

/**
 * Get ISO week number for a given date
 * @param date - The date to get week number for
 * @returns ISO week number
 */
export const getISOWeek = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

/**
 * Check if a date is within the current week
 * @param date - The date to check
 * @returns Boolean indicating if date is in current week
 */
export const isCurrentWeek = (date: Date): boolean => {
  const { weekStartDate, weekEndDate } = getWeekBoundaries();
  const checkDate = new Date(date);
  return checkDate >= weekStartDate && checkDate <= weekEndDate;
};

/**
 * Format week for display (e.g., "Nov 11 - Nov 17, 2025")
 * @param weekStartDate - Start date of the week
 * @param weekEndDate - End date of the week
 * @returns Formatted string
 */
export const formatWeekRange = (weekStartDate: Date, weekEndDate: Date): string => {
  const startMonth = weekStartDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = weekStartDate.getDate();
  const endMonth = weekEndDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = weekEndDate.getDate();
  const year = weekEndDate.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
};
