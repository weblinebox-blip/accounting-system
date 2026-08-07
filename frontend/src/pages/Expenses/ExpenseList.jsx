import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { listExpenses, deleteExpense, getExpenseCategories } from '../../api/expenseApi.js';
import { apiUrl } from '../../api/client.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';
import JalaliDatePicker from '../../components/JalaliDatePicker.jsx';

export default function ExpenseList() {
  const [result, setResult] = useState({ data: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('expense_date');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExpenseCategories().then(setCategories).catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    listExpenses({ search, from, to, category, sortBy, sortDir, page: 1, pageSize: 50 })
      .then((response) => {
        setResult({
          data: Array.isArray(response?.data) ? response.data : [],
          total: Number(response?.total || 0),
          page: Number(response?.page || 1),
          pageSize: Number(response?.pageSize || 50),
        });
      })
      .catch((error) => {
        console.error('خطا در دریافت هزینه‌ها:', error);
        setResult({ data: [], total: 0, page: 1, pageSize: 50 });
      })
      .finally(() => setLoading(false));
  }, [search, from, to, category, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  async function handleDelete(id, num) {
    if (!window.confirm(`آیا از حذف هزینه ${num} مطمئن هستید؟`)) return;
    await deleteExpense(id);
    fetchData();
  }

  function exportToExcel() {
    const rows = result.data.map((exp) => ({
      'شماره سند': exp.expense_number,
      'تاریخ': gregorianToJalali(exp.expense_date),
      'مبلغ': exp.amount,
      'دسته‌بندی': exp.category,
      'توضیحات': exp.description || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'هزینه‌ها');
    XLSX.writeFile(workbook, 'expenses.xlsx');
  }

  function exportToPdf() {
    window.print();
  }

  const totalAmount = result.data.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="page-header">
        <h2>هزینه‌ها</h2>
        <Link to="/expenses/new" className="btn btn-primary">+ ثبت هزینه جدید</Link>
      </div>

      <div className="toolbar">
        <input placeholder="جستجوی سریع (شماره سند، توضیحات)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">همه دسته‌بندی‌ها</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ width: 160 }}><JalaliDatePicker value={from ? gregorianToJalali(from) : ''} onChange={setFrom} placeholder="از تاریخ" /></div>
        <div style={{ width: 160 }}><JalaliDatePicker value={to ? gregorianToJalali(to) : ''} onChange={setTo} placeholder="تا تاریخ" /></div>
        <select value={`${sortBy}:${sortDir}`} onChange={(e) => { const [b, d] = e.target.value.split(':'); setSortBy(b); setSortDir(d); }}>
          <option value="expense_date:DESC">جدیدترین تاریخ</option>
          <option value="expense_date:ASC">قدیمی‌ترین تاریخ</option>
          <option value="amount:DESC">بیشترین مبلغ</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportToExcel}>خروجی Excel</button>
        <button className="btn btn-secondary btn-sm" onClick={exportToPdf}>خروجی PDF</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 20 }}>در حال بارگذاری...</p>
        ) : result.data.length === 0 ? (
          <div className="empty-state">
            <h3>هزینه‌ای یافت نشد</h3>
            <p>یک هزینه جدید ثبت کنید یا فیلترها را تغییر دهید.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>شماره سند</th>
                <th>تاریخ</th>
                <th>دسته‌بندی</th>
                <th>مبلغ (تومان)</th>
                <th>توضیحات</th>
                <th>فیش</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.expense_number}</td>
                  <td>{gregorianToJalali(exp.expense_date)}</td>
                  <td>{exp.category}</td>
                  <td>{Number(exp.amount).toLocaleString()}</td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                  <td>
                    {exp.receipt_image_path ? (
                      <a href={apiUrl(exp.receipt_image_path)} target="_blank" rel="noreferrer">مشاهده</a>
                    ) : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/expenses/${exp.id}/edit`} className="btn btn-secondary btn-sm">ویرایش</Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(exp.id, exp.expense_number)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>جمع کل</td>
                <td style={{ fontWeight: 700 }}>{totalAmount.toLocaleString()}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
