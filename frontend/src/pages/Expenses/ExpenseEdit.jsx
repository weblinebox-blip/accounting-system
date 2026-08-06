import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ExpenseForm from '../../components/ExpenseForm.jsx';
import { getExpense } from '../../api/expenseApi.js';

export default function ExpenseEdit() {
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExpense(id).then((data) => {
      setExpense(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>در حال بارگذاری...</p>;
  if (!expense) return <p>هزینه یافت نشد.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>ویرایش هزینه — {expense.expense_number}</h2>
      </div>
      <ExpenseForm mode="edit" initialData={expense} />
    </div>
  );
}
