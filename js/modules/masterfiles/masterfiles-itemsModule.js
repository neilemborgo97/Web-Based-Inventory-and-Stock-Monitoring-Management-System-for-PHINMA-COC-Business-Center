/**
 * Items Masterfile Module
 * Handles CRUD operations for items
 */

import { apiService } from '../../services/services-apiServices.js';

class ItemsModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.form = null;
        this.isEditing = false;
    }

    async init() {
        this.setupElements();
        this.bindEvents();
        await this.loadDropdownData();
        this.initDataTable();
    }

    setupElements() {
        this.modal = new bootstrap.Modal(document.getElementById('itemModal'));
        this.form = document.getElementById('itemForm');
    }

    bindEvents() {
        // Add button
        document.getElementById('addItemBtn')?.addEventListener('click', () => this.openAddModal());

        // Form submit
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Edit & Delete buttons (delegated)
        document.getElementById('itemsTable')?.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');

            if (editBtn) {
                const id = editBtn.dataset.id;
                this.openEditModal(id);
            }

            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                const name = deleteBtn.dataset.name;
                this.confirmDelete(id, name);
            }
        });
    }

    initDataTable() {
        this.dataTable = $('#itemsTable').DataTable({
            ajax: {
                url: '../../api/masterfiles/masterfiles-items.php?action=list',
                dataSrc: (json) => {
                    if (json.success) {
                        return json.data;
                    }
                    return [];
                }
            },
            columns: [
                { data: 'id' },
                { data: 'name' },
                { data: 'category_name', defaultContent: '-' },
                { data: 'supplier_name', defaultContent: '-' },
                { data: 'size_name', defaultContent: '-' },
                { 
                    data: 'unit_cost',
                    render: (data) => `<span class="unit-cost">₱${this.formatNumber(data)}</span>`
                },
                {
                    data: null,
                    orderable: false,
                    render: (data) => `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-action btn-edit" data-id="${data.id}" title="Edit">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-action btn-delete" data-id="${data.id}" data-name="${this.escapeHtml(data.name)}" title="Delete">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    `
                }
            ],
            order: [[0, 'desc']],
            pageLength: 10,
            language: {
                emptyTable: '<div class="text-center py-4"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No items found</p></div>',
                loadingRecords: '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading items...</p></div>'
            }
        });
    }

    async loadDropdownData() {
        try {
            const [categories, suppliers, sizes] = await Promise.all([
                apiService.get('/masterfiles/masterfiles-items.php?action=categories'),
                apiService.get('/masterfiles/masterfiles-items.php?action=suppliers'),
                apiService.get('/masterfiles/masterfiles-items.php?action=sizes')
            ]);

            this.populateSelect('itemCategory', categories.data || []);
            this.populateSelect('itemSupplier', suppliers.data || []);
            this.populateSelect('itemSize', sizes.data || [], true);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    populateSelect(elementId, data, optional = false) {
        const select = document.getElementById(elementId);
        if (!select) return;

        const defaultOption = optional ? 'Select (Optional)' : `Select ${elementId.replace('item', '')}`;
        select.innerHTML = `<option value="">${defaultOption}</option>`;

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }

    openAddModal() {
        this.isEditing = false;
        this.form.reset();
        document.getElementById('itemId').value = '';
        document.getElementById('itemModalLabel').textContent = 'Add Item';
        this.modal.show();
    }

    async openEditModal(id) {
        this.isEditing = true;
        document.getElementById('itemModalLabel').textContent = 'Edit Item';

        try {
            const response = await apiService.get(`/masterfiles/masterfiles-items.php?action=get&id=${id}`);

            if (response.success) {
                const item = response.data;
                document.getElementById('itemId').value = item.id;
                document.getElementById('itemName').value = item.name;
                document.getElementById('itemCategory').value = item.category_id || '';
                document.getElementById('itemSupplier').value = item.supplier_id || '';
                document.getElementById('itemSize').value = item.size_id || '';
                document.getElementById('itemUnitCost').value = item.unit_cost;
                document.getElementById('itemDescription').value = item.description || '';

                this.modal.show();
            } else {
                Swal.fire('Error', response.message || 'Failed to load item', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to load item data', 'error');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const saveBtn = document.getElementById('saveItemBtn');
        const btnText = saveBtn.querySelector('.btn-text');
        const spinner = saveBtn.querySelector('.spinner-border');

        saveBtn.disabled = true;
        btnText.textContent = 'Saving...';
        spinner.classList.remove('d-none');

        const formData = {
            id: document.getElementById('itemId').value,
            name: document.getElementById('itemName').value.trim(),
            category_id: document.getElementById('itemCategory').value,
            supplier_id: document.getElementById('itemSupplier').value,
            size_id: document.getElementById('itemSize').value || null,
            unit_cost: document.getElementById('itemUnitCost').value,
            description: document.getElementById('itemDescription').value.trim()
        };

        const action = this.isEditing ? 'update' : 'create';

        try {
            const response = await apiService.post(`/masterfiles/masterfiles-items.php?action=${action}`, formData);

            if (response.success) {
                this.modal.hide();
                this.dataTable.ajax.reload();

                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: response.message || `Item ${this.isEditing ? 'updated' : 'created'} successfully`,
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', response.message || 'Operation failed', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'An error occurred', 'error');
        } finally {
            saveBtn.disabled = false;
            btnText.textContent = 'Save Item';
            spinner.classList.add('d-none');
        }
    }

    async confirmDelete(id, name) {
        const result = await Swal.fire({
            title: 'Delete Item',
            html: `Are you sure you want to delete <strong>${name}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/masterfiles/masterfiles-items.php?action=delete', { id });

                if (response.success) {
                    this.dataTable.ajax.reload();
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted',
                        text: 'Item has been deleted',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Error', response.message || 'Failed to delete item', 'error');
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'An error occurred', 'error');
            }
        }
    }

    formatNumber(num) {
        if (!num) return '0.00';
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const itemsModule = new ItemsModule();
export default itemsModule;

