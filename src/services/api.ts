import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://attandance-management-payroll-1.onrender.com/api/v1';

export const api = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  getTodaySummary: async () => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/today-summary`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getEmployees: async () => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/employees`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getPayroll: async () => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/payroll`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },

  getAttendance: async (date: string) => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/attendance?date=${date}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return response.json();
  },
};