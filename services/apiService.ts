import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentApiConfig } from '../config/api';

const API_BASE_URL = getCurrentApiConfig();

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('partnerToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for unified error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await AsyncStorage.multiRemove(['partnerToken', 'partnerData']);
        }
        return Promise.reject(error);
      }
    );
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.api.request({
        method,
        url: endpoint,
        data,
        ...config,
      });

      return {
        success: true,
        data: response.data,
        message: 'Request successful',
      };
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Network request failed';
        
        return {
          success: false,
          error: errorMessage,
          data: error.response?.data,
        };
      }

      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }

  // Authentication APIs
  async login(email: string, password: string): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-auth/login', { email, password });
  }

  async register(partnerData: {
    businessName: string;
    email: string;
    phone: string;
    password: string;
    partnerType: string;
    address: string;
    storeLocation?: any;
    openingTime?: string;
    closingTime?: string;
    registrationDocument?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-auth/register', partnerData);
  }

  async logout(): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-auth/logout');
  }

  async getCurrentPartner(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/partner-auth/me');
  }

  // Profile APIs
  async getProfile(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/partner-auth/me');
  }

  async updateProfile(partnerId: string, profileData: {
    name: string;
    contactInfo: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/partner/${partnerId}`, profileData);
  }

  async getProfileStats(): Promise<ApiResponse> {
    console.warn('Profile stats API not implemented in backend');
    return { success: false, error: 'Profile stats API not implemented' };
  }

  // Services APIs
  async getServices(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/services', undefined, config);
  }

  async getService(id: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/services/${id}`);
  }

  async createService(serviceData: {
    name: string;
    description?: string;
    duration?: number;
    price: number;
    category: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/services', serviceData);
  }

  async updateService(id: string, serviceData: {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    category?: string;
    isActive?: boolean;
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/services/${id}`, serviceData);
  }

  async deleteService(id: string): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/services/${id}`);
  }

  async getServiceCategories(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/services/categories');
  }

  // Appointments APIs
  async getAppointments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
    search?: string;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/partner-appointments', undefined, config);
  }

  async getAppointment(id: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/partner-appointments/${id}`);
  }

  async updateAppointmentStatus(id: string, status: string, notes?: string): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/partner-appointments/${id}/status`, { status, notes });
  }

  async cancelAppointment(id: string, reason?: string): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/partner-appointments/${id}/cancel`, { reason });
  }

  async getAppointmentStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/partner-appointments/stats', undefined, config);
  }

  // Service Time APIs - Note: Backend doesn't have dedicated service time routes
  async getServiceTime(): Promise<ApiResponse> {
    console.warn('Service Time API not implemented in backend');
    return { success: false, error: 'Service Time API not implemented' };
  }

  async updateServiceTime(timeData: {
    isActiveOnline?: boolean;
    openingTime?: string;
    closingTime?: string;
    timezone?: string;
    breakStartTime?: string;
    breakEndTime?: string;
    advanceBookingDays?: number;
    slotDuration?: number;
    bufferTime?: number;
  }): Promise<ApiResponse> {
    console.warn('Service Time API not implemented in backend');
    return { success: false, error: 'Service Time API not implemented' };
  }

  async getAvailableSlots(date: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/appointment/getAvailableSlots?date=${date}`);
  }

  // Products APIs (for pharmacy partners)
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/partner-products', undefined, config);
  }

  async createProduct(productData: {
    title: string;
    description: string;
    price: number;
    category: string;
    subCategory?: string;
    inventoryQuantity: number;
    discount?: number;
    images?: string[];
    video?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-products', productData);
  }

  async updateProduct(id: string, productData: {
    title?: string;
    description?: string;
    price?: number;
    category?: string;
    subCategory?: string;
    inventoryQuantity?: number;
    discount?: number;
    images?: string[];
    video?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/partner-products/${id}`, productData);
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/partner-products/${id}`);
  }

  async getProductStats(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/partner-products/stats');
  }

  // Orders APIs (for pharmacy partners) - Note: Backend doesn't have order routes
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse> {
    console.warn('Orders API not implemented in backend');
    return { success: false, error: 'Orders API not implemented' };
  }

  async getOrder(id: string): Promise<ApiResponse> {
    console.warn('Orders API not implemented in backend');
    return { success: false, error: 'Orders API not implemented' };
  }

  async updateOrderStatus(id: string, status: string, notes?: string): Promise<ApiResponse> {
    console.warn('Orders API not implemented in backend');
    return { success: false, error: 'Orders API not implemented' };
  }
}

export default new ApiService();