import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { listSales, deleteSale, exportSaleExcel, getSale } from '../../api/salesApi.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';
import JalaliDatePicker from '../../components/JalaliDatePicker.jsx';
import { printSaleInvoice } from '../../utils/printInvoice.js';

export default function SalesList() {
  const [result, setResult] = useState({ data: [], total: 0, page: 1, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customer, setCustomer] = useState('');
  const [sortBy, setSortBy] = useState('sales_date');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    listSales({ search, from, to, customer, sortBy, sortDir, page: 1, pageSize: 50 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [search, from, to, customer, sortBy, sortDir]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  async function handleDelete(id, invoiceNumber) {
    if (!window.confirm(`آیا از حذف فاکتور ${invoiceNumber} مطمئن هستید؟`)) return;
    await deleteSale(id);
    fetchData();
  }

  async function handlePrint(id) {
    const invoice = await getSale(id);
    printSaleInvoice(invoice);
  }

  function exportListToExcel() {
    const rows = result.data.map((inv) => ({
      'شماره فاکتور': inv.invoice_number,
      'تاریخ فروش': gregorianToJalali(inv.sales_date),
      'خریدار': inv.customer_name,
      'وضعیت تسویه': inv.settlement_status,
      'درصد تخفیف': inv.discount_percent,
      'مبلغ تخفیف': inv.discount_amount,
      'جمع قبل از تخفیف': inv.subtotal,
      'مبلغ نهایی': inv.final_total,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'فاکتورهای فروش');
    XLSX.writeFile(workbook, 'sales-invoices.xlsx');
  }

  function exportToPdf() {
    window.print();
  }

  return (
    <div>
      <div className="page-header">
        <h2>فاکتورهای فروش</h2>
        <Link to="/sales/new" className="btn btn-primary">+ ثبت فاکتور فروش جدید</Link>
      </div>

      <div className="toolbar">
        <input placeholder="جستجوی سریع (شماره فاکتور، خریدار)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 260 }} />
        <input placeholder="نام خریدار" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <div style={{ width: 160 }}><JalaliDatePicker value={from ? gregorianToJalali(from) : ''} onChange={setFrom} placeholder="از تاریخ" /></div>
        <div style={{ width: 160 }}><JalaliDatePicker value={to ? gregorianToJalali(to) : ''} onChange={setTo} placeholder="تا تاریخ" /></div>
        <select value={`${sortBy}:${sortDir}`} onChange={(e) => { const [b, d] = e.target.value.split(':'); setSortBy(b); setSortDir(d); }}>
          <option value="sales_date:DESC">جدیدترین تاریخ</option>
          <option value="sales_date:ASC">قدیمی‌ترین تاریخ</option>
          <option value="final_total:DESC">بیشترین مبلغ</option>
          <option value="customer_name:ASC">نام خریدار</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={exportListToExcel}>خروجی Excel (لیست)</button>
        <button className="btn btn-secondary btn-sm" onClick={exportToPdf}>خروجی PDF</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: 20 }}>در حال بارگذاری...</p>
        ) : result.data.length === 0 ? (
          <div className="empty-state">
            <h3>فاکتوری یافت نشد</h3>
            <p>یک فاکتور فروش جدید ثبت کنید یا فیلترها را تغییر دهید.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>شماره فاکتور</th>
                <th>تاریخ فروش</th>
                <th>خریدار</th>
                <th>وضعیت تسویه</th>
                <th>مبلغ نهایی</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{gregorianToJalali(inv.sales_date)}</td>
                  <td>{inv.customer_name}</td>
                  <td>
                    <span className={`badge ${inv.settlement_status === 'شده' ? 'badge-done' : 'badge-pending'}`}>
                      {inv.settlement_status}
                    </span>
                  </td>
                  <td>{Number(inv.final_total).toLocaleString()}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/sales/${inv.id}/edit`} className="btn btn-secondary btn-sm">ویرایش</Link>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportSaleExcel(inv.id, inv.invoice_number)}>خروجی فاکتور</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(inv.id)}>چاپ / PDF</button>
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
