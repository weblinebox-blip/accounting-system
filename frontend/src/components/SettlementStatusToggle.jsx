export default function SettlementStatusToggle({ value, onChange }) {
  return (
    <div className="status-toggle">
      <button
        type="button"
        className={`status-btn ${value === 'نشده' ? 'active-unpaid' : ''}`}
        onClick={() => onChange('نشده')}
      >
        نشده
      </button>
      <button
        type="button"
        className={`status-btn ${value === 'شده' ? 'active-paid' : ''}`}
        onClick={() => onChange('شده')}
      >
        شده
      </button>
    </div>
  );
}
