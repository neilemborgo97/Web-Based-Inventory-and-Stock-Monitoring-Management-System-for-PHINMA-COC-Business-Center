import { sharedLayout } from '../shared/shared-layout.js';
import { apiService } from '../services/services-apiServices.js';

class CoursesModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.isEditing = false;
    }

    async init() {
        this.modal = new bootstrap.Modal(document.getElementById('formModal'));
        this.form = document.getElementById('dataForm');
        await this.loadDepartments();
        this.bindEvents();
        this.initDataTable();
    }

    async loadDepartments() {
        try {
            const response = await apiService.get('/masterfiles/masterfiles-courses.php?action=departments');
            const select = document.getElementById('courseDepartment');
            select.innerHTML = '<option value="">Select Department</option>';
            (response.data || []).forEach(d => {
                select.innerHTML += `<option value="${d.id}">${d.name}</option>`;
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
            ajax: { url: '../../api/masterfiles/masterfiles-courses.php?action=list', dataSrc: (json) => json.success ? json.data : [] },
            columns: [
                { data: 'id' },
                { data: 'code' },
                { data: 'name' },
                { data: 'department_name', defaultContent: '-' },
                { data: null, orderable: false, render: (data) => `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary btn-action btn-edit" data-id="${data.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-danger btn-action btn-delete" data-id="${data.id}" data-name="${data.name}"><i class="bi bi-trash"></i></button>
                    </div>` }
            ],
            order: [[0, 'desc']]
        });
    }

    openAddModal() {
        this.isEditing = false;
        this.form.reset();
        document.getElementById('recordId').value = '';
        document.getElementById('modalTitle').textContent = 'Add Course';
        this.modal.show();
    }

    async openEditModal(id) {
        this.isEditing = true;
        document.getElementById('modalTitle').textContent = 'Edit Course';
        try {
            const response = await apiService.get(`/masterfiles/masterfiles-courses.php?action=get&id=${id}`);
            if (response.success) {
                document.getElementById('recordId').value = response.data.id;
                document.getElementById('courseCode').value = response.data.code || '';
                document.getElementById('courseName').value = response.data.name || '';
                document.getElementById('courseDepartment').value = response.data.department_id || '';
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
            code: document.getElementById('courseCode').value.trim(),
            name: document.getElementById('courseName').value.trim(),
            department_id: document.getElementById('courseDepartment').value
        };

        try {
            const response = await apiService.post(`/masterfiles/masterfiles-courses.php?action=${this.isEditing ? 'update' : 'create'}`, formData);
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
        const result = await Swal.fire({ title: 'Delete Course', html: `Delete <strong>${name}</strong>?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'Delete' });
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/masterfiles/masterfiles-courses.php?action=delete', { id });
                if (response.success) { this.dataTable.ajax.reload(); Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false }); }
                else { Swal.fire('Error', response.message, 'error'); }
            } catch (e) { Swal.fire('Error', e.message, 'error'); }
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await sharedLayout.init();
    if (user) { new CoursesModule().init(); }
});

