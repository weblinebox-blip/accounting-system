import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';

// تبدیل تاریخ شمسی (رشته یا DateObject) به فرمت میلادی YYYY-MM-DD برای ارسال به سرور
// نکته مهم: مقادیر year/month/day همیشه عدد استاندارد جاوااسکریپت هستند (مستقل از locale)
// پس اینجا رشته را دستی می‌سازیم تا ارقام فارسی (که فقط برای نمایش هستند) وارد آن نشوند.
export function jalaliToGregorian(value) {
  if (!value) return '';
  const dateObj = value instanceof DateObject ? value : new DateObject({ date: value, calendar: persian, locale: persian_fa });
  const g = dateObj.convert(gregorian);
  const y = g.year;
  const m = String(g.month.number).padStart(2, '0');
  const d = String(g.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// تبدیل تاریخ میلادی (از سرور) به رشته شمسی برای نمایش
export function gregorianToJalali(value) {
  if (!value) return '';
  const dateObj = new DateObject({ date: value, format: 'YYYY-MM-DD' });
  return dateObj.convert(persian, persian_fa).format('YYYY/MM/DD');
}

export { persian, persian_fa, DateObject };
