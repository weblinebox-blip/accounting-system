import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import PurchaseList from './pages/Purchases/PurchaseList.jsx';
import PurchaseForm from './pages/Purchases/PurchaseForm.jsx';
import PurchaseEdit from './pages/Purchases/PurchaseEdit.jsx';
import SalesList from './pages/Sales/SalesList.jsx';
import SalesForm from './pages/Sales/SalesForm.jsx';
import SalesEdit from './pages/Sales/SalesEdit.jsx';
import ExpenseList from './pages/Expenses/ExpenseList.jsx';
import ExpenseCreate from './pages/Expenses/ExpenseCreate.jsx';
import ExpenseEdit from './pages/Expenses/ExpenseEdit.jsx';
import ReturnList from './pages/Returns/ReturnList.jsx';
import ReturnCreate from './pages/Returns/ReturnCreate.jsx';
import ReturnEdit from './pages/Returns/ReturnEdit.jsx';
import ReportsPage from './pages/Reports/ReportsPage.jsx';

const navItems = [
  { to: '/purchases', label: 'فاکتور خرید' },
  { to: '/sales', label: 'فاکتور فروش' },
  { to: '/expenses', label: 'هزینه‌ها' },
  { to: '/returns', label: 'فاکتور برگشتی' },
  { to: '/reports', label: 'گزارش‌ها' },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>سامانه حسابداری</h1>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/purchases" replace />} />
          <Route path="/purchases" element={<PurchaseList />} />
          <Route path="/purchases/new" element={<PurchaseForm />} />
          <Route path="/purchases/:id/edit" element={<PurchaseEdit />} />

          <Route path="/sales" element={<SalesList />} />
          <Route path="/sales/new" element={<SalesForm />} />
          <Route path="/sales/:id/edit" element={<SalesEdit />} />

          <Route path="/expenses" element={<ExpenseList />} />
          <Route path="/expenses/new" element={<ExpenseCreate />} />
          <Route path="/expenses/:id/edit" element={<ExpenseEdit />} />

          <Route path="/returns" element={<ReturnList />} />
          <Route path="/returns/new" element={<ReturnCreate />} />
          <Route path="/returns/:id/edit" element={<ReturnEdit />} />

          <Route path="/reports" element={<ReportsPage />} />
        </Routes>
      </main>
    </div>
  );
}
