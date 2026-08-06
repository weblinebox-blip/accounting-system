import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { listReturns, deleteReturn } from '../../api/returnApi.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';
import JalaliDatePicker from '../../components/JalaliDatePicker.jsx';

export default function ReturnList() {
  const [result, setResult] = useState({ data: [], total: 0 });
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customer, setCustomer] = useState('');
  const [sortBy, setSortBy] = useState('return_date');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    listReturns({ search, from, to, customer, sortBy, sortDir, page: 1, pageSize: 50 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [search, from, to, customer, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  async function handleDelete(id, num) {
    if (!window.confirm(`آیا از حذف فاکتور برگشتی ${num} مطمئن هستید؟`)) return;
    await deleteReturn(id);
    fetchData();
  }

  function exportToExcel() {
    const rows = result.data.map((inv) => ({
      'شماره فاکتور': inv.invoice_number,
      'تاریخ برگشت': gregorianToJalali(inv.return_date),
      'مشتری': inv.customer_name,
      'جمع مبلغ': inv.total_amount,
      'جمع ضرر (خراب)': inv.total_loss,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'فاکتورهای برگشتی');
    XLSX.writeFile(workbook, 'return-invoices.xlsx');
  }

  function exportToPdf() {
    window.print();
  }

  const totalLoss = result.data.reduce((sum, inv) => sum + Number(inv.total_loss || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h2>فاکتورهای برگشتی</h2>
        <Link to="/returns/new" className="btn btn-primary">+ ثبت فاکتور برگشتی جدید</Link>
      </div>

      <div className="toolbar">
        <input placeholder="جستجوی سریع (شماره فاکتور، مشتری)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        <input placeholder="نام مشتری" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <div style={{ width: 160 }}><JalaliDatePicker value={from ? gregorianToJalali(from) : ''} onChange={setFrom} placeholder="از تاریخ" /></div>
        <div style={{ width: 160 }}><JalaliDatePicker value={to ? gregorianToJalali(to) : ''} onChange={setTo} placeholder="تا تاریخ" /></div>
        <select value={`${sortBy}:${sortDir}`} onChange={(e) => { const [b, d] = e.target.value.split(':'); setSortBy(b); setSortDir(d); }}>
          <option value="return_date:DESC">جدیدترین تاریخ</option>
          <option value="return_date:ASC">قدیمی‌ترین تاریخ</option>
          <option value="customer_name:ASC">نام مشتری</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportToExcel}>خروجی Excel</button>
        <button className="btn btn-secondary btn-sm" onClick={exportToPdf}>خروجی PDF</button>
      </div>

      {totalLoss > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          جمع ضرر ناشی از کالای خراب در این لیست: <strong>{totalLoss.toLocaleString()}</strong> تومان
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 20 }}>در حال بارگذاری...</p>
        ) : result.data.length === 0 ? (
          <div className="empty-state">
            <h3>فاکتور برگشتی‌ای یافت نشد</h3>
            <p>یک فاکتور برگشتی جدید ثبت کنید یا فیلترها را تغییر دهید.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>تاریخ برگشت</th>
                <th>مشتری</th>
                <th>جمع مبلغ</th>
                <th>جمع ضرر</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{gregorianToJalali(inv.return_date)}</td>
                  <td>{inv.customer_name}</td>
                  <td>{Number(inv.total_amount).toLocaleString()}</td>
                  <td style={{ color: inv.total_loss > 0 ? 'var(--danger)' : undefined, fontWeight: inv.total_loss > 0 ? 700 : 400 }}>
                    {Number(inv.total_loss).toLocaleString()}
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/returns/${inv.id}/edit`} className="btn btn-secondary btn-sm">ویرایش</Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv.id, inv.invoice_number)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
