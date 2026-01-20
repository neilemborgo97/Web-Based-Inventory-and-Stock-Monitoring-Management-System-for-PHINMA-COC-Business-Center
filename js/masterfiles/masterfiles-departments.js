import { sharedLayout } from '../shared/shared-layout.js';
import { simpleCrudModule } from '../modules/masterfiles/masterfiles-simpleCrudModule.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) {
        simpleCrudModule.init({
            apiEndpoint: '/masterfiles/masterfiles-departments.php',
            entityName: 'Department',
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: null, orderable: false, render: (data) => simpleCrudModule.renderActions(data) }
            ],
            formFields: ['departmentName'],
            getFormData: () => ({ name: document.getElementById('departmentName').value.trim() }),
            setFormData: (data) => { document.getElementById('departmentName').value = data.name || ''; }
        });
    }
});

