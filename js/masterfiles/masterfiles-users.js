import { sharedLayout } from '../shared/shared-layout.js';
import { apiService } from '../services/services-apiServices.js';

class UsersModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.isEditing = false;
    }

    async init() {
        this.modal = new bootstrap.Modal(document.getElementById('formModal'));
        this.form = document.getElementById('dataForm');
        await this.loadUserTypes();
        this.bindEvents();
        this.initDataTable();
    }

    async loadUserTypes() {
        try {
            const response = await apiService.get('/masterfiles/masterfiles-users.php?action=usertypes');
            const select = document.getElementById('userType');
            select.innerHTML = '<option value="">Select User Type</option>';
            (response.data || []).forEach(t => {
                select.innerHTML += `<option value="${t.id}">${t.name}</option>`;
            });
        } catch (e) { console.error(e); }
    }

    bindEvents() {
        document.getElementById('addBtn')?.addEventListener('click', () => this.openAddModal());
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('dataTable')?.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            if (editBtn) this.openEditModal(editBtn.dataset.id);
            if (deleteBtn) this.confirmDelete(deleteBtn.dataset.id, deleteBtn.dataset.name);
        });
    }

    initDataTable() {
        this.dataTable = $('#dataTable').DataTable({
            ajax: { url: '../../api/masterfiles/masterfiles-users.php?action=list', dataSrc: (json) => json.success ? json.data : [] },
            columns: [
                { data: 'id' },
                { data: 'school_id' },
                { data: 'full_name' },
                { data: 'email' },
                { data: 'user_type', defaultContent: '-' },
                { data: 'status', render: (data) => data == 1 ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>' },
                { data: null, orderable: false, render: (data) => `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-action btn-edit" data-id="${data.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-danger btn-action btn-delete" data-id="${data.id}" data-name="${data.full_name}"><i class="bi bi-trash"></i></button>
                    </div>` }
            ],
            order: [[0, 'desc']]
        });
    }

    openAddModal() {
        this.isEditing = false;
        this.form.reset();
        document.getElementById('recordId').value = '';
        document.getElementById('modalTitle').textContent = 'Add User';
        document.getElementById('userPassword').required = true;
        this.modal.show();
    }

    async openEditModal(id) {
        this.isEditing = true;
        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('userPassword').required = false;
        try {
            const response = await apiService.get(`/masterfiles/masterfiles-users.php?action=get&id=${id}`);
            if (response.success) {
                const d = response.data;
                document.getElementById('recordId').value = d.id;
                document.getElementById('userSchoolId').value = d.school_id || '';
                document.getElementById('userLastname').value = d.lastname || '';
                document.getElementById('userFirstname').value = d.firstname || '';
                document.getElementById('userMiddlename').value = d.middlename || '';
                document.getElementById('userEmail').value = d.email || '';
                document.getElementById('userContact').value = d.contact || '';
                document.getElementById('userType').value = d.type_id || '';
                document.getElementById('userStatus').value = d.status || '1';
                document.getElementById('userPassword').value = '';
                this.modal.show();
            }
        } catch (e) { Swal.fire('Error', 'Failed to load data', 'error'); }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = true;
        saveBtn.querySelector('.btn-text').textContent = 'Saving...';
        saveBtn.querySelector('.spinner-border').classList.remove('d-none');

        const formData = {
            id: document.getElementById('recordId').value,
            school_id: document.getElementById('userSchoolId').value.trim(),
            lastname: document.getElementById('userLastname').value.trim(),
            firstname: document.getElementById('userFirstname').value.trim(),
            middlename: document.getElementById('userMiddlename').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            contact: document.getElementById('userContact').value.trim(),
            type_id: document.getElementById('userType').value,
            status: document.getElementById('userStatus').value,
            password: document.getElementById('userPassword').value
        };

        try {
            const response = await apiService.post(`/masterfiles/masterfiles-users.php?action=${this.isEditing ? 'update' : 'create'}`, formData);
            if (response.success) {
                this.modal.hide();
                this.dataTable.ajax.reload();
                Swal.fire({ icon: 'success', title: 'Success', text: response.message, timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Error', response.message, 'error');
            }
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
        finally {
            saveBtn.disabled = false;
            saveBtn.querySelector('.btn-text').textContent = 'Save';
            saveBtn.querySelector('.spinner-border').classList.add('d-none');
        }
    }

    async confirmDelete(id, name) {
        const result = await Swal.fire({ title: 'Delete User', html: `Delete <strong>${name}</strong>?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Delete' });
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/masterfiles/masterfiles-users.php?action=delete', { id });
                if (response.success) { this.dataTable.ajax.reload(); Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false }); }
                else { Swal.fire('Error', response.message, 'error'); }
            } catch (e) { Swal.fire('Error', e.message, 'error'); }
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) { new UsersModule().init(); }
});

