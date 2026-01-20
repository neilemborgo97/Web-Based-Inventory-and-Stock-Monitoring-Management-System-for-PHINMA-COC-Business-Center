import { sharedLayout } from '../shared/shared-layout.js';
import { simpleCrudModule } from '../modules/masterfiles/masterfiles-simpleCrudModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) {
        simpleCrudModule.init({
            apiEndpoint: '/masterfiles/masterfiles-sizes.php',
            entityName: 'Size',
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: 'created_at', render: (data) => simpleCrudModule.formatDate(data) },
                { data: null, orderable: false, render: (data) => simpleCrudModule.renderActions(data) }
            ],
            formFields: ['sizeName'],
            getFormData: () => ({ name: document.getElementById('sizeName').value.trim() }),
            setFormData: (data) => { document.getElementById('sizeName').value = data.name || ''; }
        });
    }
});

