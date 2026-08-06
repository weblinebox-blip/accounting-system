import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReturnInvoiceForm from '../../components/ReturnInvoiceForm.jsx';
import { getReturn } from '../../api/returnApi.js';

export default function ReturnEdit() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReturn(id).then((data) => {
      setInvoice(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>در حال بارگذاری...</p>;
  if (!invoice) return <p>فاکتور یافت نشد.</p>;

  return (
    <div>
      <div className="page-header">
        <h2>ویرایش فاکتور برگشتی — {invoice.invoice_number}</h2>
      </div>
      <ReturnInvoiceForm mode="edit" initialData={invoice} />
    </div>
  );
}
