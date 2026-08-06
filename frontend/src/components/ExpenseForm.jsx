import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import JalaliDatePicker from './JalaliDatePicker.jsx';
import { gregorianToJalali } from '../utils/jalaliDate.js';
import { toEnglishDigits } from '../utils/normalizeDigits.js';
import { createExpense, updateExpense, getExpenseCategories } from '../api/expenseApi.js';

export default function ExpenseForm({ mode = 'create', initialData = null }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [expenseDate, setExpenseDate] = useState(initialData?.expense_date || '');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialData?.receipt_image_path || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExpenseCategories().then(setCategories).catch(() => {});
  }, []);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!expenseDate || !amount || !category) {
      setError('تاریخ، مبلغ و دسته‌بندی هزینه الزامی است.');
      return;
    }

    const payload = {
      expense_date: expenseDate,
      amount,
      category,
      description,
      receipt_file: receiptFile,
    };

    setSaving(true);
    try {
      if (mode === 'edit') {
        await updateExpense(initialData.id, payload);
        setSuccess('هزینه با موفقیت ویرایش شد.');
      } else {
        await createExpense(payload);
        setSuccess('هزینه با موفقیت ثبت شد.');
        setExpenseDate('');
        setAmount('');
        setCategory('');
        setDescription('');
        setReceiptFile(null);
        setPreviewUrl('');
      }
      setTimeout(() => navigate('/expenses'), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ذخیره هزینه.');
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
            <label>تاریخ هزینه</label>
            <JalaliDatePicker
              value={expenseDate ? gregorianToJalali(expenseDate) : ''}
              onChange={setExpenseDate}
            />
          </div>
          <div className="field">
            <label>مبلغ هزینه (تومان)</label>
            <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(toEnglishDigits(e.target.value))} placeholder="مثلا: 1500000" />
          </div>
          <div className="field">
            <label>دسته‌بندی هزینه</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">انتخاب کنید</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>توضیحات</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح کوتاه درباره‌ی این هزینه..." />
          </div>
          <div className="field">
            <label>عکس فیش پرداختی</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          {previewUrl && (
            <div className="field">
              <label>پیش‌نمایش</label>
              <img src={previewUrl} alt="فیش پرداختی" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, border: '1px solid var(--border)' }} />
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'در حال ذخیره...' : mode === 'edit' ? 'ذخیره تغییرات' : 'ثبت هزینه'}
      </button>
    </form>
  );
}
