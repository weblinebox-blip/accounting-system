import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JalaliDatePicker from './JalaliDatePicker.jsx';
import SettlementStatusToggle from './SettlementStatusToggle.jsx';
import { gregorianToJalali, jalaliToGregorian } from '../utils/jalaliDate.js';
import { toEnglishDigits } from '../utils/normalizeDigits.js';
import { createSale, updateSale, previewSalesExcel } from '../api/salesApi.js';

const emptyItem = () => ({ product_code: '', quantity: '', unit_price_toman: '' });

export default function SalesInvoiceForm({ mode = 'create', initialData = null }) {
  const navigate = useNavigate();
  const [salesDate, setSalesDate] = useState(initialData?.sales_date || '');
  const [customerName, setCustomerName] = useState(initialData?.customer_name || '');
  const [discountPercent, setDiscountPercent] = useState(initialData?.discount_percent || '');
  const [discountAmount, setDiscountAmount] = useState(initialData?.discount_amount || '');
  const [shippingCost, setShippingCost] = useState(initialData?.shipping_cost || '');
  const [settlementStatus, setSettlementStatus] = useState(initialData?.settlement_status || 'نشده');
  const [items, setItems] = useState(initialData?.items?.length ? initialData.items : [emptyItem()]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [excelErrors, setExcelErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const totals = useMemo(() => {
    let subtotal = 0;
    items.forEach((it) => {
      subtotal += Number(it.quantity || 0) * Number(it.unit_price_toman || 0);
    });
    const percentDiscount = subtotal * (Number(discountPercent) || 0) / 100;
    const totalDiscount = percentDiscount + (Number(discountAmount) || 0);
    const finalTotal = Math.max(0, subtotal - totalDiscount + (Number(shippingCost) || 0));
    return { subtotal, finalTotal };
  }, [items, discountPercent, discountAmount, shippingCost]);

  function updateItem(index, field, value) {
    const numericFields = ['quantity', 'unit_price_toman'];
    const cleanValue = numericFields.includes(field) ? toEnglishDigits(value) : value;
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: cleanValue } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeRow(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    try {
      const result = await previewSalesExcel(file);
      setExcelErrors(result.errors || []);
      if (result.items?.length) {
        setItems(result.items.map((it) => ({
          product_code: it.product_code,
          quantity: toEnglishDigits(it.quantity),
          unit_price_toman: toEnglishDigits(it.unit_price_toman),
        })));
        setShowPreview(true);
      }
      if (result.customerName) {
        setCustomerName(result.customerName);
      }
      if (result.invoiceDate) {
        try {
          setSalesDate(jalaliToGregorian(result.invoiceDate));
        } catch {
          // اگر فرمت تاریخ فایل قابل تشخیص نبود، کاربر می‌تواند دستی وارد کند
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در خواندن فایل اکسل.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!salesDate || !customerName) {
      setError('تاریخ فروش و نام خریدار الزامی است.');
      return;
    }
    const cleanItems = items.filter((it) => it.product_code && it.quantity);
    if (cleanItems.length === 0) {
      setError('حداقل یک قلم کالای معتبر لازم است.');
      return;
    }

    const payload = {
      sales_date: salesDate,
      customer_name: customerName,
      discount_percent: discountPercent || 0,
      discount_amount: discountAmount || 0,
      shipping_cost: shippingCost || 0,
      settlement_status: settlementStatus,
      items: cleanItems,
      source_type: mode === 'edit' ? initialData.source_type : 'manual',
    };

    setSaving(true);
    try {
      if (mode === 'edit') {
        await updateSale(initialData.id, payload);
        setSuccess('فاکتور فروش با موفقیت ویرایش شد.');
      } else {
        await createSale(payload);
        setSuccess('فاکتور فروش با موفقیت ثبت شد.');
        setSalesDate('');
        setCustomerName('');
        setDiscountPercent('');
        setDiscountAmount('');
        setShippingCost('');
        setSettlementStatus('نشده');
        setItems([emptyItem()]);
      }
      setTimeout(() => navigate('/sales'), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ذخیره فاکتور.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {excelErrors.length > 0 && (
        <div className="alert alert-error">
          <strong>خطاهای فایل اکسل:</strong>
          <ul style={{ margin: '6px 0 0', paddingRight: 18 }}>
            {excelErrors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label>تاریخ فروش</label>
            <JalaliDatePicker
              value={salesDate ? gregorianToJalali(salesDate) : ''}
              onChange={setSalesDate}
            />
          </div>
          <div className="field">
            <label>نام خریدار</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="مثلا: فروشگاه رضایی" />
          </div>
          <div className="field">
            <label>وضعیت تسویه</label>
            <SettlementStatusToggle value={settlementStatus} onChange={setSettlementStatus} />
          </div>
          <div className="field">
            <label>درصد تخفیف کل فاکتور</label>
            <input type="text" inputMode="decimal" value={discountPercent} onChange={(e) => setDiscountPercent(toEnglishDigits(e.target.value))} placeholder="مثلا: 5" />
          </div>
          <div className="field">
            <label>مبلغ تخفیف کل فاکتور (تومان)</label>
            <input type="text" inputMode="decimal" value={discountAmount} onChange={(e) => setDiscountAmount(toEnglishDigits(e.target.value))} placeholder="مثلا: 50000" />
          </div>
          <div className="field">
            <label>هزینه حمل (تومان)</label>
            <input type="text" inputMode="decimal" value={shippingCost} onChange={(e) => setShippingCost(toEnglishDigits(e.target.value))} placeholder="مثلا: 80000" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <h2 style={{ fontSize: 16 }}>اقلام کالا</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              ایمپورت از اکسل
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{ display: 'none' }} />
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>افزودن ردیف</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? 'بستن پیش‌نمایش' : 'پیش‌نمایش فاکتور'}
            </button>
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>کد محصول</th>
              <th>تعداد</th>
              <th>قیمت فروش تومان</th>
              <th>جمع قیمت فروش</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, index) => (
              <tr key={index}>
                <td><input value={it.product_code} onChange={(e) => updateItem(index, 'product_code', e.target.value)} /></td>
                <td><input type="text" inputMode="numeric" value={it.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></td>
                <td><input type="text" inputMode="decimal" value={it.unit_price_toman} onChange={(e) => updateItem(index, 'unit_price_toman', e.target.value)} /></td>
                <td>{(Number(it.quantity || 0) * Number(it.unit_price_toman || 0)).toLocaleString()}</td>
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(index)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary-row">
          <span>جمع قبل از تخفیف: <strong>{totals.subtotal.toLocaleString()}</strong></span>
          {Number(shippingCost) > 0 && <span>هزینه حمل: <strong>{Number(shippingCost).toLocaleString()}</strong></span>}
          <span>مبلغ نهایی (بعد از تخفیف و حمل): <strong>{totals.finalTotal.toLocaleString()}</strong></span>
        </div>
      </div>

      {showPreview && (
        <div className="card">
          <div className="invoice-preview">
            <h3>{customerName ? `فاکتور فروش — ${customerName}` : 'فاکتور فروش'}</h3>
            <div className="invoice-meta">
              <span>تاریخ: {salesDate ? gregorianToJalali(salesDate) : '—'}</span>
              <span>خریدار: {customerName || '—'}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ردیف</th>
                  <th>شرح کالا</th>
                  <th>تعداد</th>
                  <th>قیمت واحد</th>
                  <th>قیمت کل</th>
                </tr>
              </thead>
              <tbody>
                {items.filter((it) => it.product_code && it.quantity).map((it, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{it.product_code}</td>
                    <td>{Number(it.quantity).toLocaleString()}</td>
                    <td>{Number(it.unit_price_toman || 0).toLocaleString()}</td>
                    <td>{(Number(it.quantity) * Number(it.unit_price_toman || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4}>جمع</td><td>{totals.subtotal.toLocaleString()}</td></tr>
                {(Number(discountPercent) > 0 || Number(discountAmount) > 0) && (
                  <tr><td colSpan={4}>تخفیف</td><td>{(totals.subtotal - totals.finalTotal + (Number(shippingCost) || 0)).toLocaleString()}</td></tr>
                )}
                {Number(shippingCost) > 0 && (
                  <tr><td colSpan={4}>هزینه حمل</td><td>{Number(shippingCost).toLocaleString()}</td></tr>
                )}
                <tr><td colSpan={4}>نهایی</td><td>{totals.finalTotal.toLocaleString()}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'در حال ذخیره...' : mode === 'edit' ? 'ذخیره تغییرات' : 'ثبت فاکتور فروش'}
      </button>
    </form>
  );
}
