/**
 * Admin Dashboard Entry Point
 */

import { sharedLayout } from '../shared/shared-layout.js';
import { adminDashboardModule } from '../modules/admin/admin-dashboardModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize shared layout (handles auth check)
    const user = await sharedLayout.init();
    
    if (user) {
        // Initialize dashboard module
        await adminDashboardModule.init();
    }
});

