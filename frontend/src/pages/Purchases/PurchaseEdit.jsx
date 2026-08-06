import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PurchaseInvoiceForm from '../../components/PurchaseInvoiceForm.jsx';
import { getPurchase } from '../../api/purchaseApi.js';

export default function PurchaseEdit() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPurchase(id).then((data) => {
      setInvoice(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>در حال بارگذاری...</p>;
  if (!invoice) return <p>فاکتور یافت نشد.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>ویرایش فاکتور خرید — {invoice.invoice_number}</h2>
      </div>
      <PurchaseInvoiceForm mode="edit" initialData={invoice} />
    </div>
  );
}
