/**
 * Items Masterfile Entry Point
 */

import { sharedLayout } from '../shared/shared-layout.js';
import { itemsModule } from '../modules/masterfiles/masterfiles-itemsModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    
    if (user) {
        await itemsModule.init();
    }
});

