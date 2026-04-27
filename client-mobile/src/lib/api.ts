import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = 'http://10.0.2.2:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      try {
        const token = await import('@react-native-async-storage/async-storage').then(m => 
          m.default.getItem('token')
        );
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          try {
            await import('@react-native-async-storage/async-storage').then(m => 
              m.default.removeItem('token')
            );
          } catch {}
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  async uploadFile<T>(file: FormData): Promise<T> {
    const response = await this.client.post<T>('/media/upload', file, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async setToken(token: string): Promise<void> {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('token', token);
  }

  async clearToken(): Promise<void> {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem('token');
  }

  async getToken(): Promise<string | null> {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    return AsyncStorage.getItem('token');
  }
}

export const api = new ApiClient();