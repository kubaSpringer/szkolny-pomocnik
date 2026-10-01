export const SUBJECTS: Record<string, string> = {
  'Język polski': '📖',
  Matematyka: '🔢',
  Przyroda: '🌿',
  Historia: '🏰',
  'Język angielski': '🇬🇧',
  Muzyka: '🎵',
  Plastyka: '🎨',
  Technika: '🔧',
  Informatyka: '💻',
  Religia: '🕊️',
  'Wychowanie fizyczne': '⚽',
};

export const GRADES = ['6', '6-', '5+', '5', '5-', '4+', '4', '4-', '3+', '3', '3-', '2+', '2', '2-', '1+', '1'];

export function subjectIcon(subject: string): string {
  return SUBJECTS[subject] ?? '📚';
}

/** Polish school convention: "+" adds 0.5, "-" subtracts 0.25. */
export function gradeValue(grade: string): number {
  const base = parseInt(grade, 10);
  if (grade.endsWith('+')) return base + 0.5;
  if (grade.endsWith('-')) return base - 0.25;
  return base;
}

export function gradeColor(grade: string): string {
  const v = gradeValue(grade);
  if (v >= 5) return 'var(--green)';
  if (v >= 4) return 'var(--blue)';
  if (v >= 3) return 'var(--yellow)';
  return 'var(--red)';
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function daysLabel(days: number): string {
  if (days < 0) return 'Termin minął';
  if (days === 0) return 'Dziś!';
  if (days === 1) return 'Jutro';
  return `Za ${days} dni`;
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

/** How many study-plan items to do today so that everything is ready the day before the exam. */
export function tasksForToday(remaining: number, days: number): number {
  if (remaining <= 0) return 0;
  const studyDays = Math.max(days, 1);
  return Math.ceil(remaining / studyDays);
}

const CHEERS = ['Dasz radę! 💪', 'Super Ci idzie! ⭐', 'Krok po kroku! 🚀', 'Jesteś mistrzynią! 🏆', 'Brawo! 🎉'];

export function randomCheer(): string {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)];
}
