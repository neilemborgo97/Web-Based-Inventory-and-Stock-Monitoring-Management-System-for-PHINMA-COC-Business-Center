/**
 * Simple CRUD Module - Reusable for basic masterfiles
 */

import { apiService } from '../../services/services-apiServices.js';

class SimpleCrudModule {
    constructor() {
        this.config = null;
        this.dataTable = null;
        this.modal = null;
        this.isEditing = false;
    }

    init(config) {
        this.config = config;
        this.setupElements();
        this.bindEvents();
        this.initDataTable();
    }

    setupElements() {
        this.modal = new bootstrap.Modal(document.getElementById('formModal'));
        this.form = document.getElementById('dataForm');
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
            ajax: {
                url: `../../api${this.config.apiEndpoint}?action=list`,
                dataSrc: (json) => json.success ? json.data : []
            },
            columns: this.config.columns,
            order: [[0, 'desc']],
            pageLength: 10,
            language: {
                emptyTable: `<div class="text-center py-4"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No ${this.config.entityName.toLowerCase()}s found</p></div>`
            }
        });
    }

    openAddModal() {
        this.isEditing = false;
        this.form.reset();
        document.getElementById('recordId').value = '';
        document.getElementById('modalTitle').textContent = `Add ${this.config.entityName}`;
        this.modal.show();
    }

    async openEditModal(id) {
        this.isEditing = true;
        document.getElementById('modalTitle').textContent = `Edit ${this.config.entityName}`;

        try {
            const response = await apiService.get(`${this.config.apiEndpoint}?action=get&id=${id}`);
            if (response.success) {
                document.getElementById('recordId').value = response.data.id;
                this.config.setFormData(response.data);
                this.modal.show();
            } else {
                Swal.fire('Error', response.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to load data', 'error');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('saveBtn');
        const btnText = saveBtn.querySelector('.btn-text');
        const spinner = saveBtn.querySelector('.spinner-border');

        saveBtn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        const formData = { id: document.getElementById('recordId').value, ...this.config.getFormData() };
        const action = this.isEditing ? 'update' : 'create';

        try {
            const response = await apiService.post(`${this.config.apiEndpoint}?action=${action}`, formData);
            if (response.success) {
                this.modal.hide();
                this.dataTable.ajax.reload();
                Swal.fire({ icon: 'success', title: 'Success', text: response.message, timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Error', response.message, 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'An error occurred', 'error');
        } finally {
            saveBtn.disabled = false;
            btnText.textContent = 'Save';
            spinner.classList.add('d-none');
        }
    }

    async confirmDelete(id, name) {
        const result = await Swal.fire({
            title: `Delete ${this.config.entityName}`,
            html: `Are you sure you want to delete <strong>${name}</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, delete it'
        });

        if (result.isConfirmed) {
            try {
                const response = await apiService.post(`${this.config.apiEndpoint}?action=delete`, { id });
                if (response.success) {
                    this.dataTable.ajax.reload();
                    Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire('Error', response.message, 'error');
                }
            } catch (error) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    }

    renderActions(data) {
        return `
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary btn-action btn-edit" data-id="${data.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-outline-danger btn-action btn-delete" data-id="${data.id}" data-name="${this.escapeHtml(data.name)}" title="Delete"><i class="bi bi-trash"></i></button>
            </div>
        `;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const simpleCrudModule = new SimpleCrudModule();
export default simpleCrudModule;

