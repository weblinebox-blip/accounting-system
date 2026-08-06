import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import JalaliDatePicker from './JalaliDatePicker.jsx';
import { gregorianToJalali } from '../utils/jalaliDate.js';
import { toEnglishDigits } from '../utils/normalizeDigits.js';
import { createReturn, updateReturn } from '../api/returnApi.js';

const emptyItem = () => ({ product_code: '', quantity: '', unit_price_toman: '', item_condition: 'سالم' });

export default function ReturnInvoiceForm({ mode = 'create', initialData = null }) {
  const navigate = useNavigate();
  const [returnDate, setReturnDate] = useState(initialData?.return_date || '');
  const [customerName, setCustomerName] = useState(initialData?.customer_name || '');
  const [relatedInvoiceNumber, setRelatedInvoiceNumber] = useState(initialData?.related_invoice_number || '');
  const [items, setItems] = useState(initialData?.items?.length ? initialData.items : [emptyItem()]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    let amount = 0, loss = 0;
    items.forEach((it) => {
      const lineTotal = Number(it.quantity || 0) * Number(it.unit_price_toman || 0);
      amount += lineTotal;
      if (it.item_condition === 'خراب') loss += lineTotal;
    });
    return { amount, loss };
  }, [items]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!returnDate || !customerName) {
      setError('تاریخ برگشت و نام مشتری الزامی است.');
      return;
    }
    const cleanItems = items.filter((it) => it.product_code && it.quantity);
    if (cleanItems.length === 0) {
      setError('حداقل یک قلم کالای مرجوعی معتبر لازم است.');
      return;
    }

    const payload = {
      return_date: returnDate,
      customer_name: customerName,
      related_invoice_number: relatedInvoiceNumber || null,
      items: cleanItems,
    };

    setSaving(true);
    try {
      if (mode === 'edit') {
        await updateReturn(initialData.id, payload);
        setSuccess('فاکتور برگشتی با موفقیت ویرایش شد.');
      } else {
        await createReturn(payload);
        setSuccess('فاکتور برگشتی با موفقیت ثبت شد.');
        setReturnDate('');
        setCustomerName('');
        setRelatedInvoiceNumber('');
        setItems([emptyItem()]);
      }
      setTimeout(() => navigate('/returns'), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ذخیره فاکتور برگشتی.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="form-grid">
          <div className="field">
            <label>تاریخ برگشت</label>
            <JalaliDatePicker
              value={returnDate ? gregorianToJalali(returnDate) : ''}
              onChange={setReturnDate}
            />
          </div>
          <div className="field">
            <label>نام مشتری</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="مثلا: فروشگاه رضایی" />
          </div>
          <div className="field">
            <label>شماره فاکتور فروش مرتبط (اختیاری)</label>
            <input value={relatedInvoiceNumber} onChange={(e) => setRelatedInvoiceNumber(toEnglishDigits(e.target.value))} placeholder="مثلا: 48213" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-header">
          <h2 style={{ fontSize: 16 }}>اقلام مرجوعی</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>افزودن ردیف</button>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>کد محصول</th>
              <th>تعداد</th>
              <th>قیمت تومان</th>
              <th>جمع مبلغ</th>
              <th>وضعیت کالا</th>
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
                  <select value={it.item_condition} onChange={(e) => updateItem(index, 'item_condition', e.target.value)}>
                    <option value="سالم">سالم</option>
                    <option value="خراب">خراب</option>
                  </select>
                </td>
                <td>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(index)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary-row">
          <span>جمع مبلغ مرجوعی: <strong>{totals.amount.toLocaleString()}</strong></span>
          <span style={{ color: totals.loss > 0 ? 'var(--danger)' : undefined }}>
            جمع ضرر (کالای خراب): <strong>{totals.loss.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'در حال ذخیره...' : mode === 'edit' ? 'ذخیره تغییرات' : 'ثبت فاکتور برگشتی'}
      </button>
    </form>
  );
}
