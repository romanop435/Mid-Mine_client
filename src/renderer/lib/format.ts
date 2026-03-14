export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  return `${hours} ч ${rest} мин`;
}

export function formatDate(value: string | null) {
  if (!value) return 'Никогда';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function percentage(current: number, start: number, end: number) {
  if (end <= start) return 0;
  return ((current - start) / (end - start)) * 100;
}
