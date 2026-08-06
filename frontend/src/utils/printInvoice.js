import { gregorianToJalali } from './jalaliDate.js';

/**
 * باز کردن یک پنجره‌ی جدید با نسخه‌ی چاپی و تمیز فاکتور فروش (بدون سایدبار و بقیه‌ی رابط کاربری)
 * و فراخوانی خودکار دیالوگ چاپ مرورگر (که کاربر می‌تواند از آن برای ذخیره PDF هم استفاده کند).
 */
export function printSaleInvoice(invoice) {
  const itemsHtml = invoice.items
    .map(
      (it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.product_code}</td>
        <td>${Number(it.quantity).toLocaleString()}</td>
        <td>${Number(it.unit_price_toman).toLocaleString()}</td>
        <td>${Number(it.total_price).toLocaleString()}</td>
      </tr>`
    )
    .join('');

  const discountAmount = Number(invoice.subtotal) - Number(invoice.final_total) + Number(invoice.shipping_cost || 0);
  const shippingCost = Number(invoice.shipping_cost || 0);

  const html = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>فاکتور فروش ${invoice.invoice_number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Tahoma, sans-serif; padding: 32px; color: #3B3A36; direction: rtl; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 4px; color: #5C7A6E; }
  .meta { display: flex; justify-content: space-between; font-size: 13px; color: #8D8B82; border-bottom: 1px dashed #E4E1D6; padding-bottom: 10px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #E4E1D6; padding: 8px 10px; text-align: center; }
  th { background: #E4EBE6; color: #5C7A6E; }
  tfoot td { font-weight: bold; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; }
  .status.paid { background: #E4EBE6; color: #4E6B5E; }
  .status.pending { background: #F6E4DE; color: #9C4E3A; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>فاکتور فروش</h1>
  <div class="meta">
    <span>شماره فاکتور: ${invoice.invoice_number}</span>
    <span>تاریخ: ${gregorianToJalali(invoice.sales_date)}</span>
    <span>خریدار: ${invoice.customer_name}</span>
    <span class="status ${invoice.settlement_status === 'شده' ? 'paid' : 'pending'}">
      وضعیت تسویه: ${invoice.settlement_status}
    </span>
  </div>
  <table>
    <thead>
      <tr><th>ردیف</th><th>شرح کالا</th><th>تعداد</th><th>قیمت واحد</th><th>قیمت کل</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
    <tfoot>
      <tr><td colspan="4">جمع</td><td>${Number(invoice.subtotal).toLocaleString()}</td></tr>
      ${discountAmount > 0 ? `<tr><td colspan="4">تخفیف</td><td>${discountAmount.toLocaleString()}</td></tr>` : ''}
      ${shippingCost > 0 ? `<tr><td colspan="4">هزینه حمل</td><td>${shippingCost.toLocaleString()}</td></tr>` : ''}
      <tr><td colspan="4">مبلغ نهایی</td><td>${Number(invoice.final_total).toLocaleString()}</td></tr>
    </tfoot>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('مرورگر اجازه‌ی باز کردن پنجره‌ی جدید را نداد. لطفاً popup blocker را برای این سایت غیرفعال کنید.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
