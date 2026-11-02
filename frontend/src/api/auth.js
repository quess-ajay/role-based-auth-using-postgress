
import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

export async function register(name, email, password) {
  const response = await axios.post(`${API_URL}/register`, {
    name,
    email,
    password,
  });

  return response.data;
}

export async function login(email, password) {
  const response = await axios.post(`${API_URL}/login`, {
    email,
    password,
  });

  return response.data;
}

export async function getCurrentUser(token) {
  const response = await axios.get(`${API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
