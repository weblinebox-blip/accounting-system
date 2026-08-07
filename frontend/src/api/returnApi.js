import axios from 'axios';
import { API_BASE_URL } from './client.js';

const client = axios.create({ baseURL: `${API_BASE_URL}/api/returns` });

export const listReturns = (params) => client.get('/', { params }).then((r) => r.data);
export const getReturn = (id) => client.get(`/${id}`).then((r) => r.data);
export const createReturn = (payload) => client.post('/', payload).then((r) => r.data);
export const updateReturn = (id, payload) => client.put(`/${id}`, payload).then((r) => r.data);
export const deleteReturn = (id) => client.delete(`/${id}`);
