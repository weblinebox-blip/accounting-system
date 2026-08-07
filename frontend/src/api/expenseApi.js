import axios from 'axios';
import { API_BASE_URL } from './client.js';

const client = axios.create({ baseURL: `${API_BASE_URL}/api/expenses` });

export const listExpenses = (params) => client.get('/', { params }).then((r) => r.data);
export const getExpense = (id) => client.get(`/${id}`).then((r) => r.data);
export const getExpenseCategories = () => client.get('/categories').then((r) => r.data);
export const deleteExpense = (id) => client.delete(`/${id}`);

function buildFormData(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'receipt_file') {
      if (value) formData.append('receipt', value);
    } else if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
}

export const createExpense = (payload) =>
  client.post('/', buildFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const updateExpense = (id, payload) =>
  client.put(`/${id}`, buildFormData(payload), { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
