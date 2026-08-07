import { useEffect, useState } from 'react';
import { getTopProducts, getBottomProducts, getInventory, getLastSalePerProduct } from '../../api/reportApi.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';

export default function ProductsTab() {
  const [top, setTop] = useState([]);
  const [bottom, setBottom] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lastSale, setLastSale] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTopProducts({ limit: 10 }),
      getBottomProducts({ limit: 10 }),
      getInventory(),
      getLastSalePerProduct(),
    ])
      .then(([t, b, inv, ls]) => {
        setTop(Array.isArray(t) ? t : []);
        setBottom(Array.isArray(b) ? b : []);
        setInventory(Array.isArray(inv) ? inv : []);
        setLastSale(Array.isArray(ls) ? ls : []);
      })
      .catch((error) => {
        console.error('خطا در دریافت گزارش محصولات:', error);
        setTop([]);
        setBottom([]);
        setInventory([]);
        setLastSale([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>در حال بارگذاری گزارش...</p>;

  const lastSaleMap = Object.fromEntries(lastSale.map((r) => [r.productCode, r.lastSaleDate]));

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <h3 style={{ fontSize: 15, marginTop: 0 }}>کالاهای پرفروش</h3>
          <table>
            <thead><tr><th></th><th>کد محصول</th><th>تعداد فروخته‌شده</th><th>جمع فروش</th></tr></thead>
            <tbody>
              {top.map((r, i) => (
                <tr key={r.productCode}>
                  <td><span className={`row-index c${(i % 5) + 1}`}>{i + 1}</span></td>
                  <td>{r.productCode}</td>
                  <td>{r.totalQuantity}</td>
                  <td style={{ color: 'var(--sage-dark)', fontWeight: 700 }}>{r.totalRevenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <h3 style={{ fontSize: 15, marginTop: 0 }}>کالاهای کم‌فروش</h3>
          <table>
            <thead><tr><th></th><th>کد محصول</th><th>تعداد فروخته‌شده</th><th>جمع فروش</th></tr></thead>
            <tbody>
              {bottom.map((r, i) => (
                <tr key={r.productCode}>
                  <td><span className={`row-index c${(i % 5) + 1}`}>{i + 1}</span></td>
                  <td>{r.productCode}</td>
                  <td>{r.totalQuantity}</td>
                  <td style={{ color: 'var(--tan-dark)', fontWeight: 700 }}>{r.totalRevenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginTop: 0 }}>موجودی کالا</h3>
        {inventory.length === 0 ? <p style={{ color: 'var(--ink-soft)' }}>محصولی ثبت نشده.</p> : (
          <table>
            <thead>
              <tr>
                <th>کد محصول</th>
                <th>موجودی فعلی</th>
                <th>تعداد خریداری‌شده</th>
                <th>تعداد فروخته‌شده</th>
                <th>جمع کل فروخته‌شده</th>
                <th>آخرین تاریخ فروش</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((r) => (
                <tr key={r.productCode}>
                  <td>{r.productCode}</td>
                  <td style={{ color: r.currentStock <= 0 ? 'var(--danger)' : undefined, fontWeight: r.currentStock <= 0 ? 700 : 400 }}>
                    {r.currentStock.toLocaleString()}
                  </td>
                  <td>{r.totalPurchased.toLocaleString()}</td>
                  <td>{r.totalSoldQty.toLocaleString()}</td>
                  <td>{r.totalSoldAmount.toLocaleString()}</td>
                  <td>{lastSaleMap[r.productCode] ? gregorianToJalali(lastSaleMap[r.productCode]) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
