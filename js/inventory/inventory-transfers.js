/**
 * Inventory Transfers Entry Point
 */

import { sharedLayout } from '../shared/shared-layout.js';
import { transfersModule } from '../modules/inventory/inventory-transfersModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    
    if (user) {
        await transfersModule.init();
    }
});

