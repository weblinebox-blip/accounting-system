import ReturnInvoiceForm from '../../components/ReturnInvoiceForm.jsx';

export default function ReturnCreate() {
  return (
    <div>
      <div className="page-header">
        <h2>ثبت فاکتور برگشتی جدید</h2>
      </div>
      <ReturnInvoiceForm mode="create" />
    </div>
  );
}
