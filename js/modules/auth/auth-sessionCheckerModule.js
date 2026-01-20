/**
 * Session Checker Module
 * Validates user session and handles authentication state
 */

import { apiService } from '../../services/services-apiServices.js';

class SessionCheckerModule {
    constructor() {
        this.checkInterval = null;
        this.sessionCheckIntervalMs = 60000; // Check every 1 minute
        this.user = null;
    }

    async init(options = {}) {
        const { redirectIfNotAuth = true, requiredLevel = 0 } = options;

        try {
            const response = await this.checkSession();

            if (!response.authenticated) {
                if (redirectIfNotAuth) {
                    this.redirectToLogin(response.expired ? 'expired' : 'unauthorized');
                }
                return null;
            }

            // Check user level if required
            if (requiredLevel > 0 && response.user.level < requiredLevel) {
                this.redirectToLogin('unauthorized');
                return null;
            }

            this.user = response.user;
            this.startSessionMonitor();
            
            return response.user;
        } catch (error) {
            console.error('Session check failed:', error);
            if (redirectIfNotAuth) {
                this.redirectToLogin('error');
            }
            return null;
        }
    }

    async checkSession() {
        return await apiService.get('/auth/auth-check-session.php');
    }

    startSessionMonitor() {
        // Clear existing interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Periodic session check
        this.checkInterval = setInterval(async () => {
            try {
                const response = await this.checkSession();
                if (!response.authenticated) {
                    this.stopSessionMonitor();
                    this.handleSessionExpired();
                }
            } catch (error) {
                console.error('Session monitor error:', error);
            }
        }, this.sessionCheckIntervalMs);

        // Also check on user activity
        this.setupActivityListeners();
    }

    stopSessionMonitor() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    setupActivityListeners() {
        let lastActivity = Date.now();
        const activityThreshold = 30000; // 30 seconds

        const updateActivity = async () => {
            const now = Date.now();
            if (now - lastActivity > activityThreshold) {
                lastActivity = now;
                try {
                    await this.checkSession();
                } catch (error) {
                    // Silent fail
                }
            }
        };

        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
    }

    handleSessionExpired() {
        Swal.fire({
            icon: 'warning',
            title: 'Session Expired',
            text: 'Your session has expired. Please login again.',
            confirmButtonText: 'Login',
            allowOutsideClick: false
        }).then(() => {
            this.redirectToLogin('expired');
        });
    }

    redirectToLogin(reason = '') {
        const loginUrl = '../../views/auth/login.html';
        const params = reason ? `?${reason}=1` : '';
        window.location.href = loginUrl + params;
    }

    async logout() {
        try {
            this.stopSessionMonitor();
            await apiService.post('/auth/auth-logout.php', {});
            window.location.href = '../../views/auth/login.html?logout=1';
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even on error
            window.location.href = '../../views/auth/login.html';
        }
    }

    getUser() {
        return this.user;
    }

    isAuthenticated() {
        return this.user !== null;
    }

    hasMinimumLevel(level) {
        return this.user && this.user.level >= level;
    }
}

export const sessionChecker = new SessionCheckerModule();
export default sessionChecker;

