import ExpenseForm from '../../components/ExpenseForm.jsx';

export default function ExpenseCreate() {
  return (
    <div>
      <div className="page-header">
        <h2>ثبت هزینه جدید</h2>
      </div>
      <ExpenseForm mode="create" />
    </div>
  );
}
