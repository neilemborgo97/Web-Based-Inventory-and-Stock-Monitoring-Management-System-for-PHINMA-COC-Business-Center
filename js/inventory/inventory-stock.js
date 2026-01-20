/**
 * Stock Management Entry Point
 */

import { sharedLayout } from '../shared/shared-layout.js';
import { stockModule } from '../modules/inventory/inventory-stockModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    
    if (user) {
        await stockModule.init();
    }
});

