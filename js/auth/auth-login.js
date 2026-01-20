/**
 * Login Page Entry Point
 */

import { loginModule } from '../modules/auth/auth-loginModule.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loginModule.init();
});

