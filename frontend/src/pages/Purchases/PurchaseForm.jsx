import PurchaseInvoiceForm from '../../components/PurchaseInvoiceForm.jsx';

export default function PurchaseForm() {
  return (
    <div>
      <div className="page-header">
        <h2>ثبت فاکتور خرید جدید</h2>
      </div>
      <PurchaseInvoiceForm mode="create" />
    </div>
  );
}
