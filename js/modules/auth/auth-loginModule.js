import { apiService } from '../../services/services-apiServices.js';

class LoginModule {
    constructor() {
        this.form = null;
        this.captchaNum1 = 0;
        this.captchaNum2 = 0;
        this.isSubmitting = false;
    }

    init() {
        this.form = document.getElementById('loginForm');
        if (!this.form) return;

        this.bindEvents();
        this.generateCaptcha();
        this.checkForMessages();
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Password toggle
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Refresh captcha
        const refreshCaptcha = document.getElementById('refreshCaptcha');
        if (refreshCaptcha) {
            refreshCaptcha.addEventListener('click', () => this.generateCaptcha());
        }

        // Account status popup
        const accountStatusBtn = document.getElementById('accountStatusBtn');
        const closeStatusPopup = document.getElementById('closeStatusPopup');
        const accountStatusPopup = document.getElementById('accountStatusPopup');
        const checkStatusBtn = document.getElementById('checkStatusBtn');

        if (accountStatusBtn && accountStatusPopup) {
            accountStatusBtn.addEventListener('click', () => {
                accountStatusPopup.classList.toggle('d-none');
            });
        }

        if (closeStatusPopup && accountStatusPopup) {
            closeStatusPopup.addEventListener('click', () => {
                accountStatusPopup.classList.add('d-none');
            });
        }

        if (checkStatusBtn) {
            checkStatusBtn.addEventListener('click', () => this.checkAccountStatus());
        }
    }

    generateCaptcha() {
        this.captchaNum1 = Math.floor(Math.random() * 10) + 1;
        this.captchaNum2 = Math.floor(Math.random() * 10) + 1;

        const num1El = document.getElementById('captchaNum1');
        const num2El = document.getElementById('captchaNum2');
        const inputEl = document.getElementById('captchaInput');

        if (num1El) num1El.textContent = this.captchaNum1;
        if (num2El) num2El.textContent = this.captchaNum2;
        if (inputEl) inputEl.value = '';
    }

    validateCaptcha() {
        const inputEl = document.getElementById('captchaInput');
        if (!inputEl) return false;

        const userAnswer = parseInt(inputEl.value, 10);
        const correctAnswer = this.captchaNum1 + this.captchaNum2;

        return userAnswer === correctAnswer;
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#togglePassword i');

        if (passwordInput && toggleIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.classList.remove('bi-eye-slash-fill');
                toggleIcon.classList.add('bi-eye-fill');
            } else {
                passwordInput.type = 'password';
                toggleIcon.classList.remove('bi-eye-fill');
                toggleIcon.classList.add('bi-eye-slash-fill');
            }
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');

        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('d-none');
        }
    }

    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.classList.add('d-none');
        }
    }

    setLoading(loading) {
        const button = document.getElementById('loginButton');
        const buttonText = document.getElementById('loginButtonText');
        const spinner = document.getElementById('loginSpinner');

        if (button && buttonText && spinner) {
            button.disabled = loading;
            buttonText.textContent = loading ? 'Signing In...' : 'Sign In';
            spinner.classList.toggle('d-none', !loading);
        }

        this.isSubmitting = loading;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        this.hideError();

        const schoolId = document.getElementById('school_id')?.value.trim();
        const password = document.getElementById('password')?.value;

        // Validate inputs
        if (!schoolId || !password) {
            this.showError('Please enter your School ID and Password');
            return;
        }

        // Validate captcha
        if (!this.validateCaptcha()) {
            this.showError('Incorrect captcha answer. Please try again.');
            this.generateCaptcha();
            return;
        }

        this.setLoading(true);

        try {
            const response = await apiService.post('/auth/auth-login.php', {
                school_id: schoolId,
                password: password
            });

            if (response.success) {
                // Show success message
                await Swal.fire({
                    icon: 'success',
                    title: 'Login Successful',
                    text: `Welcome, ${response.user.name}!`,
                    timer: 1500,
                    showConfirmButton: false
                });

                // Redirect to dashboard
                window.location.href = response.redirect;
            }
        } catch (error) {
            console.error('Login error:', error);

            if (error.data?.locked) {
                const minutes = Math.ceil(error.data.remaining_seconds / 60);
                this.showError(`Too many failed attempts. Please try again in ${minutes} minutes.`);
            } else {
                this.showError(error.message || 'Login failed. Please try again.');
            }

            this.generateCaptcha();
        } finally {
            this.setLoading(false);
        }
    }

    async checkAccountStatus() {
        const schoolIdInput = document.getElementById('statusSchoolId');
        const resultDiv = document.getElementById('accountStatusResult');
        const contentDiv = document.getElementById('statusContent');

        if (!schoolIdInput || !resultDiv || !contentDiv) return;

        const schoolId = schoolIdInput.value.trim();

        if (!schoolId) {
            contentDiv.innerHTML = `
                <div class="text-danger">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    Please enter a Student ID
                </div>
            `;
            resultDiv.classList.remove('d-none');
            return;
        }

        contentDiv.innerHTML = `
            <div class="text-center">
                <div class="spinner-border spinner-border-sm text-success" role="status"></div>
                <span class="ms-2">Checking...</span>
            </div>
        `;
        resultDiv.classList.remove('d-none');

        // Simulated response - replace with actual API call when ready
        setTimeout(() => {
            contentDiv.innerHTML = `
                <div class="text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    Student loan status feature coming soon.
                </div>
            `;
        }, 1000);
    }

    checkForMessages() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('expired') === '1') {
            this.showError('Your session has expired. Please login again.');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }

        if (urlParams.get('logout') === '1') {
            Swal.fire({
                icon: 'success',
                title: 'Logged Out',
                text: 'You have been successfully logged out.',
                timer: 2000,
                showConfirmButton: false
            });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
}

export const loginModule = new LoginModule();
export default loginModule;

