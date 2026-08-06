import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JalaliDatePicker from './JalaliDatePicker.jsx';
import SettlementStatusToggle from './SettlementStatusToggle.jsx';
import { gregorianToJalali } from '../utils/jalaliDate.js';
import { toEnglishDigits } from '../utils/normalizeDigits.js';
import { createPurchase, updatePurchase, previewExcel } from '../api/purchaseApi.js';

const emptyItem = () => ({
  product_code: '', quantity: '', unit_price_yuan: '', unit_price_toman: '',
});

export default function PurchaseInvoiceForm({ mode = 'create', initialData = null }) {
  const navigate = useNavigate();
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchase_date || '');
  const [supplierName, setSupplierName] = useState(initialData?.supplier_name || '');
  const [settlementStatus, setSettlementStatus] = useState(initialData?.settlement_status || 'نشده');
  const [items, setItems] = useState(initialData?.items?.length ? initialData.items : [emptyItem()]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [excelErrors, setExcelErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    let yuan = 0, toman = 0;
    items.forEach((it) => {
      yuan += Number(it.quantity || 0) * Number(it.unit_price_yuan || 0);
      toman += Number(it.quantity || 0) * Number(it.unit_price_toman || 0);
    });
    return { yuan, toman };
  }, [items]);

  function updateItem(index, field, value) {
    const numericFields = ['quantity', 'unit_price_yuan', 'unit_price_toman'];
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
      const result = await previewExcel(file);
      setExcelErrors(result.errors || []);
      if (result.items?.length) {
        setItems(result.items.map((it) => ({
          product_code: it.product_code,
          quantity: toEnglishDigits(it.quantity),
          unit_price_yuan: toEnglishDigits(it.unit_price_yuan),
          unit_price_toman: toEnglishDigits(it.unit_price_toman),
        })));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در خواندن فایل اکسل.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!purchaseDate || !supplierName) {
      setError('تاریخ خرید و نام تامین‌کننده الزامی است.');
      return;
    }
    const cleanItems = items.filter((it) => it.product_code && it.quantity);
    if (cleanItems.length === 0) {
      setError('حداقل یک قلم کالای معتبر لازم است.');
      return;
    }

    const payload = {
      purchase_date: purchaseDate,
      supplier_name: supplierName,
      settlement_status: settlementStatus,
      items: cleanItems,
    };

    setSaving(true);
    try {
      if (mode === 'edit') {
        await updatePurchase(initialData.id, payload);
        setSuccess('فاکتور خرید با موفقیت ویرایش شد.');
      } else {
        await createPurchase(payload);
        setSuccess('فاکتور خرید با موفقیت ثبت شد.');
        setPurchaseDate('');
        setSupplierName('');
        setSettlementStatus('نشده');
        setItems([emptyItem()]);
      }
      setTimeout(() => navigate('/purchases'), 900);
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
            <label>تاریخ خرید</label>
            <JalaliDatePicker
              value={purchaseDate ? gregorianToJalali(purchaseDate) : ''}
              onChange={setPurchaseDate}
            />
          </div>
          <div className="field">
            <label>نام فروشنده (تامین‌کننده)</label>
            <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="مثلا: بازرگانی پارس" />
          </div>
          <div className="field">
            <label>وضعیت تسویه</label>
            <SettlementStatusToggle value={settlementStatus} onChange={setSettlementStatus} />
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
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>کد محصول</th>
              <th>تعداد</th>
              <th>قیمت خرید یوان</th>
              <th>قیمت خرید تومان</th>
              <th>جمع یوان</th>
              <th>جمع تومان</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, index) => (
              <tr key={index}>
                <td><input value={it.product_code} onChange={(e) => updateItem(index, 'product_code', e.target.value)} /></td>
                <td><input type="text" inputMode="numeric" value={it.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></td>
                <td><input type="text" inputMode="decimal" value={it.unit_price_yuan} onChange={(e) => updateItem(index, 'unit_price_yuan', e.target.value)} /></td>
                <td><input type="text" inputMode="decimal" value={it.unit_price_toman} onChange={(e) => updateItem(index, 'unit_price_toman', e.target.value)} /></td>
                <td>{(Number(it.quantity || 0) * Number(it.unit_price_yuan || 0)).toLocaleString()}</td>
                <td>{(Number(it.quantity || 0) * Number(it.unit_price_toman || 0)).toLocaleString()}</td>
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(index)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary-row">
          <span>جمع یوان: <strong>{totals.yuan.toLocaleString()}</strong></span>
          <span>جمع تومان: <strong>{totals.toman.toLocaleString()}</strong></span>
        </div>
      </div>

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'در حال ذخیره...' : mode === 'edit' ? 'ذخیره تغییرات' : 'ثبت فاکتور خرید'}
      </button>
    </form>
  );
}
