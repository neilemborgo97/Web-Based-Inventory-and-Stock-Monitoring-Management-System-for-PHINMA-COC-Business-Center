/**
 * Session Checker Entry Point
 * Include this in protected pages
 */

import { sessionChecker } from '../modules/auth/auth-sessionCheckerModule.js';

// Export for use in other modules
export { sessionChecker };

// Auto-initialize if data attribute is present
document.addEventListener('DOMContentLoaded', async () => {
    const body = document.body;
    
    if (body.dataset.requireAuth === 'true') {
        const requiredLevel = parseInt(body.dataset.requiredLevel || '0', 10);
        await sessionChecker.init({ 
            redirectIfNotAuth: true, 
            requiredLevel 
        });
    }
});

