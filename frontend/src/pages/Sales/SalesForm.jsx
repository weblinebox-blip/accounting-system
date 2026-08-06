import SalesInvoiceForm from '../../components/SalesInvoiceForm.jsx';

export default function SalesForm() {
  return (
    <div>
      <div className="page-header">
        <h2>ثبت فاکتور فروش جدید</h2>
      </div>
      <SalesInvoiceForm mode="create" />
    </div>
  );
}
