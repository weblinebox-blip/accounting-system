import DatePicker from 'react-multi-date-picker';
import { persian, persian_fa, jalaliToGregorian } from '../utils/jalaliDate.js';

/**
 * انتخاب‌گر تاریخ شمسی با امکان تایپ دستی
 * onChange مقدار میلادی (YYYY-MM-DD) را برمی‌گرداند تا مستقیم برای سرور آماده باشد
 */
export default function JalaliDatePicker({ value, onChange, placeholder = 'انتخاب تاریخ' }) {
  return (
    <DatePicker
      calendar={persian}
      locale={persian_fa}
      value={value}
      onChange={(dateObj) => onChange(dateObj ? jalaliToGregorian(dateObj) : '')}
      editable={true}
      inputClass="jalali-input"
      placeholder={placeholder}
      style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}
    />
  );
}
