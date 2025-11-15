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

  async makeRequest<T>(
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
        message: (response.data as any)?.message || 'Request successful',
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

  async verifyOtp(verifyData: {
    email: string;
    otp: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-auth/verify', verifyData);
  }

  async resendOtp(email: string): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-auth/resend-otp', { email });
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

  // Service Time APIs
  async getServiceTime(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/partner/service-time');
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
    workingDays?: string[];
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', '/partner/service-time', timeData);
  }

  async getAvailableSlots(date: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/partner/available-slots?date=${date}`);
  }

  // Partner Service Slots Management APIs
  async toggleActiveOnline(isActive: boolean): Promise<ApiResponse> {
    return this.makeRequest('PATCH', '/partner-slots/active-status', {
      is_active_online: isActive
    });
  }

  async createPartnerSlots(slotData: {
    slot_date: string;
    start_time: string;
    end_time: string;
    slot_duration: number;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-slots/slots', slotData);
  }

  async generateBulkSlots(slotData: {
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    slot_duration: number;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/partner-slots/generate-bulk', slotData);
  }

  async getPartnerSlots(params?: {
    from_date?: string;
    to_date?: string;
    is_available?: boolean;
    limit?: number;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/partner-slots/slots', undefined, config);
  }

  async getSlotsByDate(date: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/partner-slots/slots/by-date?date=${date}`);
  }

  async updatePartnerSlot(slotId: number, updates: {
    slot_date?: string;
    start_time?: string;
    end_time?: string;
    slot_duration?: number;
    is_available?: boolean;
  }): Promise<ApiResponse> {
    return this.makeRequest('PATCH', `/partner-slots/slots/${slotId}`, updates);
  }

  async deletePartnerSlot(slotId: number): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/partner-slots/slots/${slotId}`);
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

  // Orders APIs (for pharmacy & essentials partners)
  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    order_type?: 'all' | 'pharmacy' | 'product';
  }): Promise<ApiResponse> {
    try {
      // Get partnerId from stored partnerData
      const partnerDataStr = await AsyncStorage.getItem('partnerData');
      if (!partnerDataStr) {
        return { success: false, error: 'Partner data not found' };
      }
      const partnerData = JSON.parse(partnerDataStr);
      const partnerId = partnerData.id;

      const queryParams = {
        limit: params?.limit || 50,
        offset: params?.page ? (params.page - 1) * (params?.limit || 50) : 0,
        status: params?.status,
        order_type: params?.order_type || 'all'
      };

      return this.makeRequest('GET', `/partner-orders/partner/${partnerId}`, undefined, { params: queryParams });
    } catch (error) {
      console.error('Error in getOrders:', error);
      return { success: false, error: 'Failed to fetch orders' };
    }
  }

  async getOrder(id: string, orderType: 'pharmacy' | 'product'): Promise<ApiResponse> {
    return this.makeRequest('GET', `/partner-orders/${id}`, undefined, { params: { order_type: orderType } });
  }

  async updateOrderStatus(id: string, orderType: 'pharmacy' | 'product', status: string, notes?: string, location?: string): Promise<ApiResponse> {
    return this.makeRequest('PATCH', `/partner-orders/${id}/status`, {
      order_type: orderType,
      status,
      notes,
      location
    });
  }

  // Review APIs
  async getPartnerReviews(params?: {
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: string;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/reviews/partner/reviews', undefined, config);
  }

  async getPartnerReviewStats(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/reviews/partner/stats');
  }

  async createReviewReply(reviewId: string, replyText: string): Promise<ApiResponse> {
    return this.makeRequest('POST', `/reviews/partner/reply/${reviewId}`, { comment: replyText });
  }

  async getPartnerReplies(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/reviews/partner/replies', undefined, config);
  }

  async updateReviewReply(replyId: string, replyText: string): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/reviews/partner/reply/${replyId}`, { comment: replyText });
  }

  async deleteReviewReply(replyId: string): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/reviews/partner/reply/${replyId}`);
  }

  // Medicine Request APIs (for pharmacy partners)
  async getMedicineRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/medicine-request/active', undefined, config);
  }

  async getMedicineRequest(id: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/medicine-request/${id}`);
  }

  async getNearbyMedicineRequests(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return this.makeRequest('GET', '/medicine-request/nearby', undefined, { params });
  }

  // Quote APIs (for pharmacy partners)
  async createQuote(quoteData: {
    request_id: string;
    quoted_medicines: Array<{
      name: string;
      price: number;
      quantity: number;
      available: boolean;
      notes?: string;
    }>;
    total_amount: number;
    estimated_delivery_time: string;
    additional_notes?: string;
    availability_status?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/quote', quoteData);
  }

  async getPartnerQuotes(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const config = params ? { params } : {};
    return this.makeRequest('GET', '/quote/partner/me', undefined, config);
  }

  async getQuote(id: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/quote/${id}`);
  }

  async updateQuote(id: string, quoteData: any): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/quote/${id}`, quoteData);
  }

  async deleteQuote(id: string): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/quote/${id}`);
  }

  async getPartnerQuoteStats(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/quote/partner/me/stats');
  }

  // Image Upload APIs
  async uploadImage(imageUri: string, bucketName: string = 'partners', folderPath: string = 'profiles'): Promise<ApiResponse> {
    try {
      const formData = new FormData();

      // Convert image URI to blob for upload
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
      } as any);

      formData.append('bucketName', bucketName);
      formData.append('folderPath', folderPath);

      const response = await this.api.post('/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } catch (error) {
      console.error('Upload image error:', error);
      if (error instanceof AxiosError) {
        return {
          success: false,
          error: error.response?.data?.error || 'Failed to upload image',
        };
      }
      return {
        success: false,
        error: 'Failed to upload image',
      };
    }
  }

  async updatePartnerPhoto(photoUrl: string): Promise<ApiResponse> {
    return this.makeRequest('PUT', '/partner-auth/profile/photo', { photoUrl });
  }

  async updatePartnerProfile(profileData: {
    name?: string;
    phone?: string;
    address?: string;
    description?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', '/partner-auth/profile', profileData);
  }

  // Service Category Management APIs
  async getCategoriesForService(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/service-categories');
  }

  async createCategory(categoryData: {
    name: string;
    description?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/service-categories', categoryData);
  }

  async getSubcategoriesForCategory(categoryId: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/service-categories/${categoryId}/subcategories`);
  }

  async createSubcategory(subcategoryData: {
    name: string;
    description?: string;
    categoryId: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/service-categories/subcategories', subcategoryData);
  }
}

export default new ApiService();
