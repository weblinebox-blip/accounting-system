import axios from 'axios';

const client = axios.create({ baseURL: '/api/purchases' });

export const listPurchases = (params) => client.get('/', { params }).then((r) => r.data);
export const getPurchase = (id) => client.get(`/${id}`).then((r) => r.data);
export const createPurchase = (payload) => client.post('/', payload).then((r) => r.data);
export const updatePurchase = (id, payload) => client.put(`/${id}`, payload).then((r) => r.data);
export const deletePurchase = (id) => client.delete(`/${id}`);

export const previewExcel = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return client
    .post('/import-excel/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};
