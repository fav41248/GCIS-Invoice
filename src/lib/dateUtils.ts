/**
 * Date and Week Utilities for Weekly Audit & Commission Clearance
 */

export interface WeekInfo {
  weekKey: string;     // e.g. '2026-W42'
  weekNum: number;     // e.g. 42
  year: number;        // e.g. 2026
  startStr: string;    // e.g. '2026-10-12' (Monday)
  endStr: string;      // e.g. '2026-10-18' (Sunday)
  mondayDate: Date;
  sundayDate: Date;
  label: string;       // e.g. 'Week 42 (Oct 12 – Oct 18, 2026)'
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const getWeekInfo = (dateInput: Date | string = new Date()): WeekInfo => {
  let d: Date;
  if (typeof dateInput === 'string') {
    // If string is YYYY-MM-DD, parse as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, day] = dateInput.split('-').map(Number);
      d = new Date(y, m - 1, day, 12, 0, 0);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  // Find Monday as start of week
  const day = d.getDay();
  // If Sunday (0), distance is -6; else distance is 1 - day
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);

  // ISO week calculation
  const tempDate = new Date(monday.getTime());
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

  const startY = monday.getFullYear();
  const startM = String(monday.getMonth() + 1).padStart(2, '0');
  const startD = String(monday.getDate()).padStart(2, '0');
  const startStr = `${startY}-${startM}-${startD}`;

  const endY = sunday.getFullYear();
  const endM = String(sunday.getMonth() + 1).padStart(2, '0');
  const endD = String(sunday.getDate()).padStart(2, '0');
  const endStr = `${endY}-${endM}-${endD}`;

  const weekKey = `${startY}-W${String(weekNum).padStart(2, '0')}`;
  
  const startMonthName = MONTH_NAMES[monday.getMonth()];
  const endMonthName = MONTH_NAMES[sunday.getMonth()];
  const label = startMonthName === endMonthName
    ? `Week ${weekNum} (${startMonthName} ${monday.getDate()} – ${sunday.getDate()}, ${startY})`
    : `Week ${weekNum} (${startMonthName} ${monday.getDate()} – ${endMonthName} ${sunday.getDate()}, ${startY})`;

  return {
    weekKey,
    weekNum,
    year: startY,
    startStr,
    endStr,
    mondayDate: monday,
    sundayDate: sunday,
    label
  };
};

/**
 * Extracts weekKey from an invoice's issueDate or createdAt
 */
export const getWeekKeyFromInvoiceDate = (dateStr?: string): string => {
  if (!dateStr) return getWeekInfo().weekKey;
  return getWeekInfo(dateStr).weekKey;
};

/**
 * Checks if a given date string falls within a week
 */
export const isDateInWeek = (dateStr: string, week: WeekInfo): boolean => {
  if (!dateStr) return false;
  const target = dateStr.slice(0, 10);
  return target >= week.startStr && target <= week.endStr;
};

/**
 * Shifts week forward or backward by N weeks
 */
export const shiftWeek = (baseMondayDate: Date, offsetWeeks: number): WeekInfo => {
  const newDate = new Date(baseMondayDate.getTime());
  newDate.setDate(newDate.getDate() + offsetWeeks * 7);
  return getWeekInfo(newDate);
};

/**
 * Generates an array of the last N weeks from today for dropdown selection
 */
export const getRecentWeeksList = (count = 12): WeekInfo[] => {
  const weeks: WeekInfo[] = [];
  const current = getWeekInfo();
  for (let i = 0; i < count; i++) {
    weeks.push(shiftWeek(current.mondayDate, -i));
  }
  return weeks;
};
