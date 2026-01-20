/**
 * Inventory Adjustments Entry Point
 */

import { sharedLayout } from '../shared/shared-layout.js';
import { adjustmentsModule } from '../modules/inventory/inventory-adjustmentsModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    
    if (user) {
        await adjustmentsModule.init();
    }
});

