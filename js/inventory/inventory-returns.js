/**
 * Purchase Returns Entry Point
 */

import { sharedLayout } from '../shared/shared-layout.js';
import { returnsModule } from '../modules/inventory/inventory-returnsModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    
    if (user) {
        await returnsModule.init();
    }
});

