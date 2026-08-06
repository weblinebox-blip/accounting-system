import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { listPurchases, deletePurchase } from '../../api/purchaseApi.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';
import JalaliDatePicker from '../../components/JalaliDatePicker.jsx';

export default function PurchaseList() {
  const [result, setResult] = useState({ data: [], total: 0, page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sortBy, setSortBy] = useState('purchase_date');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    listPurchases({ search, from, to, supplier, sortBy, sortDir, page: 1, pageSize: 50 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [search, from, to, supplier, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300); // debounce برای جستجوی سریع
    return () => clearTimeout(timer);
  }, [fetchData]);

  async function handleDelete(id, invoiceNumber) {
    if (!window.confirm(`آیا از حذف فاکتور ${invoiceNumber} مطمئن هستید؟`)) return;
    await deletePurchase(id);
    fetchData();
  }

  function exportToExcel() {
    const rows = result.data.map((inv) => ({
      'شماره فاکتور': inv.invoice_number,
      'تاریخ خرید': gregorianToJalali(inv.purchase_date),
      'تامین‌کننده': inv.supplier_name,
      'وضعیت تسویه': inv.settlement_status,
      'جمع یوان': inv.total_yuan,
      'جمع تومان': inv.total_toman,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'فاکتورهای خرید');
    XLSX.writeFile(workbook, 'purchase-invoices.xlsx');
  }

  function exportToPdf() {
    window.print(); // نسخه ساده — چاپ/ذخیره PDF از طریق مرورگر
  }

  return (
    <div>
      <div className="page-header">
        <h2>فاکتورهای خرید</h2>
        <Link to="/purchases/new" className="btn btn-primary">+ ثبت فاکتور خرید جدید</Link>
      </div>

      <div className="toolbar">
        <input placeholder="جستجوی سریع (شماره فاکتور، تامین‌کننده)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        <input placeholder="نام تامین‌کننده" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
        <div style={{ width: 160 }}><JalaliDatePicker value={from ? gregorianToJalali(from) : ''} onChange={setFrom} placeholder="از تاریخ" /></div>
        <div style={{ width: 160 }}><JalaliDatePicker value={to ? gregorianToJalali(to) : ''} onChange={setTo} placeholder="تا تاریخ" /></div>
        <select value={`${sortBy}:${sortDir}`} onChange={(e) => { const [b, d] = e.target.value.split(':'); setSortBy(b); setSortDir(d); }}>
          <option value="purchase_date:DESC">جدیدترین تاریخ</option>
          <option value="purchase_date:ASC">قدیمی‌ترین تاریخ</option>
          <option value="total_toman:DESC">بیشترین مبلغ</option>
          <option value="supplier_name:ASC">نام تامین‌کننده</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportToExcel}>خروجی Excel</button>
        <button className="btn btn-secondary btn-sm" onClick={exportToPdf}>خروجی PDF</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 20 }}>در حال بارگذاری...</p>
        ) : result.data.length === 0 ? (
          <div className="empty-state">
            <h3>فاکتوری یافت نشد</h3>
            <p>یک فاکتور خرید جدید ثبت کنید یا فیلترها را تغییر دهید.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>تاریخ خرید</th>
                <th>تامین‌کننده</th>
                <th>وضعیت تسویه</th>
                <th>جمع یوان</th>
                <th>جمع تومان</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{gregorianToJalali(inv.purchase_date)}</td>
                  <td>{inv.supplier_name}</td>
                  <td>
                    <span className={`badge ${inv.settlement_status === 'شده' ? 'badge-done' : 'badge-pending'}`}>
                      {inv.settlement_status}
                    </span>
                  </td>
                  <td>{Number(inv.total_yuan).toLocaleString()}</td>
                  <td>{Number(inv.total_toman).toLocaleString()}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/purchases/${inv.id}/edit`} className="btn btn-secondary btn-sm">ویرایش</Link>
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
