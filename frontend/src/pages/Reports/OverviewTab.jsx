import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getProfitLoss, getPurchaseTotals, getExpensesTotal, getSalesChart, getExpensesChart, getProfitChart } from '../../api/reportApi.js';
import { gregorianToJalali } from '../../utils/jalaliDate.js';

function formatPeriodLabel(period) {
  return gregorianToJalali(String(period).slice(0, 10));
}

function SummaryCard({ label, value, tone = 'default' }) {
  const colorMap = { default: 'var(--ink)', danger: 'var(--danger)', primary: 'var(--primary)' };
  return (
    <div className="card" style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: colorMap[tone] }}>{value.toLocaleString()}</div>
    </div>
  );
}

export default function OverviewTab({ period, from, to }) {
  const [profitLoss, setProfitLoss] = useState(null);
  const [purchaseTotals, setPurchaseTotals] = useState(null);
  const [expensesTotal, setExpensesTotal] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [expensesChart, setExpensesChart] = useState([]);
  const [profitChart, setProfitChart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { period, from, to };
    Promise.all([
      getProfitLoss({ from, to }),
      getPurchaseTotals({ from, to }),
      getExpensesTotal({ from, to }),
      getSalesChart(params),
      getExpensesChart(params),
      getProfitChart(params),
    ])
      .then(([pl, pt, et, sc, ec, pc]) => {
        setProfitLoss({
          totalSales: 0,
          totalPurchases: 0,
          totalExpenses: 0,
          totalLoss: 0,
          netProfit: 0,
          ...pl,
        });
        setPurchaseTotals(pt);
        setExpensesTotal(et);
        setSalesChart(Array.isArray(sc) ? sc.map((r) => ({ ...r, label: formatPeriodLabel(r.period) })) : []);
        setExpensesChart(Array.isArray(ec) ? ec.map((r) => ({ ...r, label: formatPeriodLabel(r.period) })) : []);
        setProfitChart(Array.isArray(pc) ? pc.map((r) => ({ ...r, label: formatPeriodLabel(r.period) })) : []);
      })
      .catch((error) => {
        console.error('خطا در دریافت گزارش کلی:', error);
        setProfitLoss({ totalSales: 0, totalPurchases: 0, totalExpenses: 0, totalLoss: 0, netProfit: 0 });
        setPurchaseTotals(null);
        setExpensesTotal(null);
        setSalesChart([]);
        setExpensesChart([]);
        setProfitChart([]);
      })
      .finally(() => setLoading(false));
  }, [period, from, to]);

  if (loading || !profitLoss) return <p>در حال بارگذاری گزارش...</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <SummaryCard label="جمع فروش" value={profitLoss.totalSales} tone="primary" />
        <SummaryCard label="جمع خرید (تومان)" value={profitLoss.totalPurchases} />
        <SummaryCard label="جمع هزینه‌ها" value={profitLoss.totalExpenses} />
        <SummaryCard label="جمع ضرر (کالای مرجوعی خراب)" value={profitLoss.totalLoss} tone="danger" />
        <SummaryCard label="سود خالص" value={profitLoss.netProfit} tone={profitLoss.netProfit >= 0 ? 'primary' : 'danger'} />
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>جمع خرید یوان</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{purchaseTotals.totalYuan.toLocaleString()}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>تعداد فاکتور خرید</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{purchaseTotals.invoiceCount.toLocaleString()}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>بیشترین دسته هزینه</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {expensesTotal.byCategory[0]?.category || '—'}
            {expensesTotal.byCategory[0] && <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}> ({expensesTotal.byCategory[0].total.toLocaleString()})</span>}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginTop: 0 }}>نمودار فروش</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={salesChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Line type="monotone" dataKey="total" name="جمع فروش" stroke="#7C9A8D" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginTop: 0 }}>نمودار هزینه‌ها</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={expensesChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Bar dataKey="total" name="جمع هزینه" fill="#C98F55" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginTop: 0 }}>نمودار سود</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={profitChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(v) => Number(v).toLocaleString()} />
            <Legend />
            <Line type="monotone" dataKey="profit" name="سود خالص" stroke="#7C9A8D" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sales" name="فروش" stroke="#C98F55" strokeWidth={1} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
