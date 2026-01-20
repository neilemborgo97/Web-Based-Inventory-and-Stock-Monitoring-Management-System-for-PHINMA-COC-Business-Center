import { sharedLayout } from '../shared/shared-layout.js';
import { purchaseOrderModule } from '../modules/admin/admin-purchaseOrderModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) {
        await purchaseOrderModule.init();
    }
});

