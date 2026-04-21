// Hebrew date formatting for lesson lists / detail screens.
// - Today: "היום, HH:MM"
// - Yesterday: "אתמול"
// - This year: "21 באפריל"
// - Older: "21.4.2024"

const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDateHe(date: Date, now: Date = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    return `היום, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  if (isSameDay(date, yesterday)) {
    return 'אתמול';
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getDate()} ב${MONTHS_HE[date.getMonth()]}`;
  }
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}
