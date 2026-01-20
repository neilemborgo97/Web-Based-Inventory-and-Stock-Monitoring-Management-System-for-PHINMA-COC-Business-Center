import { sharedLayout } from '../shared/shared-layout.js';
import { simpleCrudModule } from '../modules/masterfiles/masterfiles-simpleCrudModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) {
        simpleCrudModule.init({
            apiEndpoint: '/masterfiles/masterfiles-warehouses.php',
            entityName: 'Warehouse',
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: 'location', defaultContent: '-' },
                { data: 'created_at', render: (data) => simpleCrudModule.formatDate(data) },
                { data: null, orderable: false, render: (data) => simpleCrudModule.renderActions(data) }
            ],
            formFields: ['warehouseName', 'warehouseLocation'],
            getFormData: () => ({
                name: document.getElementById('warehouseName').value.trim(),
                location: document.getElementById('warehouseLocation').value.trim()
            }),
            setFormData: (data) => {
                document.getElementById('warehouseName').value = data.name || '';
                document.getElementById('warehouseLocation').value = data.location || '';
            }
        });
    }
});

