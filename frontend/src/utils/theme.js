export function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('crm-theme', isDark ? 'dark' : 'light'); } catch (_) {}
  return isDark;
}

export function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}
