import { sharedLayout } from '../shared/shared-layout.js';
import { simpleCrudModule } from '../modules/masterfiles/masterfiles-simpleCrudModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) {
        simpleCrudModule.init({
            apiEndpoint: '/masterfiles/masterfiles-suppliers.php',
            entityName: 'Supplier',
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: 'email', defaultContent: '-' },
                { data: 'phone', defaultContent: '-' },
                { data: 'address', defaultContent: '-', render: (data) => data ? (data.length > 30 ? data.substring(0, 30) + '...' : data) : '-' },
                { data: null, orderable: false, render: (data) => simpleCrudModule.renderActions(data) }
            ],
            formFields: ['supplierName', 'supplierEmail', 'supplierPhone', 'supplierAddress'],
            getFormData: () => ({
                name: document.getElementById('supplierName').value.trim(),
                email: document.getElementById('supplierEmail').value.trim(),
                phone: document.getElementById('supplierPhone').value.trim(),
                address: document.getElementById('supplierAddress').value.trim()
            }),
            setFormData: (data) => {
                document.getElementById('supplierName').value = data.name || '';
                document.getElementById('supplierEmail').value = data.email || '';
                document.getElementById('supplierPhone').value = data.phone || '';
                document.getElementById('supplierAddress').value = data.address || '';
            }
        });
    }
});

