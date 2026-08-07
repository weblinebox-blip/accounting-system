import axios from 'axios';
import { API_BASE_URL } from './client.js';

const client = axios.create({ baseURL: `${API_BASE_URL}/api/sales` });

export const listSales = (params) => client.get('/', { params }).then((r) => r.data);
export const getSale = (id) => client.get(`/${id}`).then((r) => r.data);
export const createSale = (payload) => client.post('/', payload).then((r) => r.data);
export const updateSale = (id, payload) => client.put(`/${id}`, payload).then((r) => r.data);
export const deleteSale = (id) => client.delete(`/${id}`);

export const previewSalesExcel = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/import-excel/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

// دانلود فایل اکسل با فرمت اختصاصی برای یک فاکتور مشخص
export const exportSaleExcel = async (id, invoiceNumber) => {
  const response = await client.get(`/${id}/export-excel`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `sales-${invoiceNumber}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
