import { useEffect, useState, useMemo, useRef } from 'react';
import { getCustomerBalance, getSalesByCustomer, getCustomerLifetime, getUnsettledInvoices, getCustomerNames, searchInvoiceNumbers } from '../../api/reportApi.js';
import { listSales, exportSaleExcel, getSale } from '../../api/salesApi.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';
import { printSaleInvoice } from '../../utils/printInvoice.js';

function CustomerSearch({ onSelect, onClear }) {
  const [allNames, setAllNames] = useState([]);
  const [invoiceMatches, setInvoiceMatches] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    getCustomerNames().then(setAllNames).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setInvoiceMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      searchInvoiceNumbers(query.trim()).then(setInvoiceMatches).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const customerMatches = useMemo(() => {
    if (!query.trim()) return [];
    return allNames.filter((n) => n.includes(query.trim())).slice(0, 8);
  }, [query, allNames]);

  function handleClear() {
    setQuery('');
    setInvoiceMatches([]);
    setOpen(false);
    onClear();
  }

  const hasResults = customerMatches.length > 0 || invoiceMatches.length > 0;

  return (
    <div className="autocomplete-wrap" ref={wrapRef} style={{ maxWidth: 360 }}>
      <div style={{ position: 'relative' }}>
        <input
          placeholder="جستجو بر اساس نام مشتری یا شماره فاکتور..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ width: '100%', paddingLeft: 32 }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            title="پاک کردن جستجو"
            style={{
              position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1, padding: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {open && hasResults && (
        <div className="autocomplete-list">
          {customerMatches.length > 0 && (
            <>
              <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700 }}>مشتریان</div>
              {customerMatches.map((name) => (
                <div
                  key={`customer-${name}`}
                  className="autocomplete-item"
                  onClick={() => { onSelect({ type: 'customer', value: name, label: name }); setQuery(name); setOpen(false); }}
                >
                  {name}
                </div>
              ))}
            </>
          )}
          {invoiceMatches.length > 0 && (
            <>
              <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700 }}>شماره فاکتور</div>
              {invoiceMatches.map((inv) => (
                <div
                  key={`invoice-${inv.invoiceNumber}`}
                  className="autocomplete-item"
                  onClick={() => {
                    onSelect({ type: 'invoice', value: inv.invoiceNumber, label: `فاکتور ${inv.invoiceNumber} — ${inv.customerName}` });
                    setQuery(inv.invoiceNumber);
                    setOpen(false);
                  }}
                >
                  فاکتور {inv.invoiceNumber} — {inv.customerName}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerInvoiceList({ filter }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = filter.type === 'invoice'
      ? { search: filter.value, sortBy: 'sales_date', sortDir: 'DESC', page: 1, pageSize: 100 }
      : { customer: filter.value, sortBy: 'sales_date', sortDir: 'DESC', page: 1, pageSize: 100 };
    listSales(params)
      .then((res) => setInvoices(res.data))
      .finally(() => setLoading(false));
  }, [filter]);

  async function handlePrint(id) {
    const invoice = await getSale(id);
    printSaleInvoice(invoice);
  }

  if (loading) return <p style={{ color: 'var(--ink-soft)' }}>در حال بارگذاری...</p>;
  if (invoices.length === 0) return <p style={{ color: 'var(--ink-soft)' }}>فاکتوری یافت نشد.</p>;

  return (
    <table>
      <thead>
        <tr><th>شماره فاکتور</th><th>تاریخ</th><th>خریدار</th><th>وضعیت تسویه</th><th>مبلغ نهایی</th><th>عملیات</th></tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
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
            <td style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => exportSaleExcel(inv.id, inv.invoice_number)}>Excel</button>
              <button className="btn btn-secondary btn-sm" onClick={() => handlePrint(inv.id)}>چاپ / PDF</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CustomersTab() {
  const [balance, setBalance] = useState([]);
  const [byCustomer, setByCustomer] = useState([]);
  const [lifetime, setLifetime] = useState([]);
  const [unsettled, setUnsettled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(null); // { type, value, label }

  useEffect(() => {
    Promise.all([getCustomerBalance(), getSalesByCustomer({}), getCustomerLifetime(), getUnsettledInvoices()])
      .then(([b, s, l, u]) => {
        setBalance(Array.isArray(b) ? b : []);
        setByCustomer(Array.isArray(s) ? s : []);
        setLifetime(Array.isArray(l) ? l : []);
        setUnsettled(Array.isArray(u) ? u : []);
      })
      .catch((error) => {
        console.error('خطا در دریافت گزارش مشتریان:', error);
        setBalance([]);
        setByCustomer([]);
        setLifetime([]);
        setUnsettled([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="card">
        <h3 style={{ fontSize: 15, marginTop: 0 }}>جستجوی مشتری یا شماره فاکتور</h3>
        <CustomerSearch onSelect={setSelectedFilter} onClear={() => setSelectedFilter(null)} />
        {selectedFilter && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>
              {selectedFilter.type === 'customer' ? `فاکتورهای ${selectedFilter.label}` : selectedFilter.label}
            </h4>
            <CustomerInvoiceList filter={selectedFilter} />
          </div>
        )}
      </div>

      {loading ? <p>در حال بارگذاری گزارش...</p> : (
        <>
          <div className="card">
            <h3 style={{ fontSize: 15, marginTop: 0 }}>مانده حساب مشتریان (فاکتورهای تسویه‌نشده)</h3>
            {balance.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>موردی یافت نشد.</p> : (
              <table>
                <thead><tr><th>مشتری</th><th>تعداد فاکتور تسویه‌نشده</th><th>مانده (تومان)</th></tr></thead>
                <tbody>
                  {balance.map((r) => (
                    <tr key={r.customerName}>
                      <td>{r.customerName}</td>
                      <td>{r.unsettledCount}</td>
                      <td style={{ fontWeight: 700 }}>{r.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginTop: 0 }}>فاکتورهای تسویه‌نشده مشتریان</h3>
            {unsettled.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>فاکتور تسویه‌نشده‌ای وجود ندارد.</p> : (
              <table>
                <thead><tr><th>شماره فاکتور</th><th>تاریخ فروش</th><th>مشتری</th><th>مبلغ</th></tr></thead>
                <tbody>
                  {unsettled.map((inv) => (
                    <tr key={inv.invoice_number}>
                      <td>{inv.invoice_number}</td>
                      <td>{gregorianToJalali(inv.sales_date)}</td>
                      <td>{inv.customer_name}</td>
                      <td>{Number(inv.final_total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginTop: 0 }}>گزارش فروش بر اساس مشتری</h3>
            <table>
              <thead><tr><th>مشتری</th><th>تعداد فاکتور</th><th>جمع فروش</th></tr></thead>
              <tbody>
                {byCustomer.map((r) => (
                  <tr key={r.customerName}>
                    <td>{r.customerName}</td>
                    <td>{r.invoiceCount}</td>
                    <td>{r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginTop: 0 }}>طول عمر مشتری</h3>
            <table>
              <thead>
                <tr>
                  <th>مشتری</th><th>اولین خرید</th><th>آخرین خرید</th><th>طول عمر (روز)</th><th>تعداد فاکتور</th><th>جمع خرید</th>
                </tr>
              </thead>
              <tbody>
                {lifetime.map((r) => (
                  <tr key={r.customerName}>
                    <td>{r.customerName}</td>
                    <td>{gregorianToJalali(r.firstPurchase)}</td>
                    <td>{gregorianToJalali(r.lastPurchase)}</td>
                    <td>{r.lifetimeDays}</td>
                    <td>{r.invoiceCount}</td>
                    <td>{r.totalSpent.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
