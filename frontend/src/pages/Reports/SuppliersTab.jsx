import { useEffect, useState } from 'react';
import { getSupplierBalance } from '../../api/reportApi.js';

export default function SuppliersTab() {
  const [balance, setBalance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupplierBalance().then((data) => {
      setBalance(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>در حال بارگذاری گزارش...</p>;

  return (
    <div className="card">
      <h3 style={{ fontSize: 15, marginTop: 0 }}>مانده حساب تامین‌کنندگان (فاکتورهای خرید تسویه‌نشده)</h3>
      {balance.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>موردی یافت نشد.</p> : (
        <table>
          <thead><tr><th>تامین‌کننده</th><th>تعداد فاکتور تسویه‌نشده</th><th>مانده (تومان)</th></tr></thead>
          <tbody>
            {balance.map((r) => (
              <tr key={r.supplierName}>
                <td>{r.supplierName}</td>
                <td>{r.unsettledCount}</td>
                <td style={{ fontWeight: 700 }}>{r.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
