// آدرس پایه بک‌اند.
// در Production باید متغیر محیطی VITE_API_BASE_URL در Vercel تنظیم شود
// (مثلاً https://accounting-system-api-gnzz.onrender.com).
// در محالت توسعه (dev) اگر این متغیر تنظیم نشده باشد، آدرس نسبی استفاده می‌شود
// که توسط پراکسی vite.config.js به http://localhost:4000 هدایت می‌شود.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function apiUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path; // از قبل کامل است
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
