export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const fromNow = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return formatDate(date);
};

export const typeIcon = (type) =>
  ({ task: '✓', bug: '🐞', story: '📗', epic: '⚡' }[type] || '✓');

export const priorityClass = (p) => `badge badge--${p || 'medium'}`;

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TYPES = ['task', 'bug', 'story', 'epic'];

export const CHART_COLORS = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#db2777'];
