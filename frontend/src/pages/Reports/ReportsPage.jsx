import { useState } from 'react';
import OverviewTab from './OverviewTab.jsx';
import CustomersTab from './CustomersTab.jsx';
import SuppliersTab from './SuppliersTab.jsx';
import ProductsTab from './ProductsTab.jsx';
import JalaliDatePicker from '../../components/JalaliDatePicker.jsx';
import { gregorianToJalali } from '../../utils/jalaliDate.js';

const TABS = [
  { key: 'overview', label: 'نمای کلی' },
  { key: 'customers', label: 'مشتریان' },
  { key: 'suppliers', label: 'تامین‌کنندگان' },
  { key: 'products', label: 'محصولات و موجودی' },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <div>
      <div className="page-header">
        <h2>گزارش‌های مدیریتی</h2>
      </div>

      <div className="toolbar" style={{ marginBottom: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="toolbar">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">روزانه</option>
            <option value="weekly">هفتگی</option>
            <option value="monthly">ماهانه</option>
            <option value="yearly">سالانه</option>
          </select>
          <div style={{ width: 160 }}><JalaliDatePicker value={from ? gregorianToJalali(from) : ''} onChange={setFrom} placeholder="از تاریخ" /></div>
          <div style={{ width: 160 }}><JalaliDatePicker value={to ? gregorianToJalali(to) : ''} onChange={setTo} placeholder="تا تاریخ" /></div>
        </div>
      )}

      {tab === 'overview' && <OverviewTab period={period} from={from} to={to} />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'products' && <ProductsTab />}
    </div>
  );
}
