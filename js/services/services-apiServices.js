/**
 * API Services Module
 * Centralized HTTP request handling with Axios
 */

const API_BASE_URL = '../../api';

class ApiService {
    constructor() {
        this.csrfToken = this.getCSRFToken();
        this.setupAxiosDefaults();
    }

    setupAxiosDefaults() {
        axios.defaults.baseURL = API_BASE_URL;
        axios.defaults.headers.common['Content-Type'] = 'application/json';
        axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        axios.defaults.withCredentials = true;

        // Response interceptor for handling errors
        axios.interceptors.response.use(
            (response) => {
                // Update CSRF token if provided
                if (response.data?.csrf_token) {
                    this.setCSRFToken(response.data.csrf_token);
                }
                return response;
            },
            (error) => {
                if (error.response?.status === 401 && error.response?.data?.expired) {
                    window.location.href = '../../views/auth/login.html?expired=1';
                }
                return Promise.reject(error);
            }
        );
    }

    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    }

    setCSRFToken(token) {
        this.csrfToken = token;
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            meta.setAttribute('content', token);
        }
        axios.defaults.headers.common['X-CSRF-Token'] = token;
    }

    async get(endpoint) {
        try {
            const response = await axios.get(endpoint);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async post(endpoint, data = {}) {
        try {
            const response = await axios.post(endpoint, {
                ...data,
                csrf_token: this.csrfToken
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async put(endpoint, data = {}) {
        try {
            const response = await axios.put(endpoint, {
                ...data,
                csrf_token: this.csrfToken
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(endpoint) {
        try {
            const response = await axios.delete(endpoint, {
                data: { csrf_token: this.csrfToken }
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    handleError(error) {
        const errorData = {
            status: error.response?.status || 500,
            message: error.response?.data?.message || 'An error occurred',
            data: error.response?.data || {}
        };
        return errorData;
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
