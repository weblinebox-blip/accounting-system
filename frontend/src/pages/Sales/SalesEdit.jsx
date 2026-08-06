import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SalesInvoiceForm from '../../components/SalesInvoiceForm.jsx';
import { getSale } from '../../api/salesApi.js';

export default function SalesEdit() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSale(id).then((data) => {
      setInvoice(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>در حال بارگذاری...</p>;
  if (!invoice) return <p>فاکتور یافت نشد.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>ویرایش فاکتور فروش — {invoice.invoice_number}</h2>
      </div>
      <SalesInvoiceForm mode="edit" initialData={invoice} />
    </div>
  );
}
