/**
 * Inventory Transfers Module
 * Handles CRUD operations for inventory transfers between warehouses
 */

import { apiService } from '../../services/services-apiServices.js';

class TransfersModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.viewModal = null;
        this.form = null;
        this.items = [];
        this.warehouses = [];
        this.currentTransferId = null;
        this.sourceWarehouseId = null;
    }

    async init() {
        this.setupElements();
        this.bindEvents();
        await this.loadDropdownData();
        this.initDataTable();
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transferDate').value = today;
    }

    setupElements() {
        this.modal = new bootstrap.Modal(document.getElementById('transferModal'));
        this.viewModal = new bootstrap.Modal(document.getElementById('viewTransferModal'));
        this.form = document.getElementById('transferForm');
    }

    bindEvents() {
        document.getElementById('addTransferBtn')?.addEventListener('click', () => this.openAddModal());
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('addItemRow')?.addEventListener('click', () => this.addItemRow());

        document.getElementById('transferItemsBody')?.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-item')) {
                e.target.closest('tr').remove();
            }
        });

        // Source warehouse change - reload items and stock
        document.getElementById('sourceWarehouse')?.addEventListener('change', (e) => {
            this.sourceWarehouseId = e.target.value;
            this.updateItemStockLevels();
        });

        // Item change - load stock level
        document.getElementById('transferItemsBody')?.addEventListener('change', async (e) => {
            if (e.target.classList.contains('item-select')) {
                await this.loadStockLevel(e.target.closest('tr'));
            }
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.applyStatusFilter(e.target.value);
        });

        document.getElementById('transfersTable')?.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const completeBtn = e.target.closest('.btn-complete');
            const cancelBtn = e.target.closest('.btn-cancel');

            if (viewBtn) this.viewTransfer(viewBtn.dataset.id);
            if (completeBtn) this.confirmComplete(completeBtn.dataset.id);
            if (cancelBtn) this.confirmCancel(cancelBtn.dataset.id);
        });

        document.getElementById('completeBtn')?.addEventListener('click', () => {
            if (this.currentTransferId) {
                this.confirmComplete(this.currentTransferId);
            }
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            if (this.currentTransferId) {
                this.confirmCancel(this.currentTransferId);
            }
        });
    }

    async loadDropdownData() {
        try {
            const [items, warehouses] = await Promise.all([
                apiService.get('/inventory/inventory-transfers.php?action=items'),
                apiService.get('/inventory/inventory-transfers.php?action=warehouses')
            ]);

            this.items = items.data || [];
            this.warehouses = warehouses.data || [];

            this.populateSelect('sourceWarehouse', this.warehouses);
            this.populateSelect('destinationWarehouse', this.warehouses);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    populateSelect(elementId, data) {
        const select = document.getElementById(elementId);
        if (!select) return;

        const placeholder = elementId.includes('source') ? 'Select Source Warehouse' : 'Select Destination Warehouse';
        select.innerHTML = `<option value="">${placeholder}</option>`;

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }

    initDataTable() {
        this.dataTable = $('#transfersTable').DataTable({
            ajax: {
                url: '../../api/inventory/inventory-transfers.php?action=list',
                dataSrc: (json) => {
                    if (json.success) {
                        return json.data;
                    }
                    return [];
                },
                data: (d) => {
                    const status = document.getElementById('statusFilter')?.value || 'ALL';
                    if (status !== 'ALL') {
                        d.status = status;
                    }
                }
            },
            columns: [
                { data: 'id' },
                { 
                    data: 'transfer_date',
                    render: (data) => data ? new Date(data).toLocaleDateString() : '-'
                },
                { data: 'source_warehouse_name' },
                { data: 'destination_warehouse_name' },
                { 
                    data: 'item_count',
                    render: (data) => `${data || 0} item(s)`
                },
                { 
                    data: 'transfer_status',
                    render: (data) => {
                        const statusClass = {
                            'Pending': 'bg-warning',
                            'In Transit': 'bg-info',
                            'Completed': 'bg-success',
                            'Cancelled': 'bg-danger'
                        }[data] || 'bg-secondary';
                        return `<span class="badge ${statusClass}">${data}</span>`;
                    }
                },
                { 
                    data: 'created_at',
                    render: (data) => data ? new Date(data).toLocaleString() : '-'
                },
                {
                    data: null,
                    orderable: false,
                    render: (data) => {
                        let actions = `
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-view" data-id="${data.id}" title="View">
                                    <i class="bi bi-eye"></i>
                                </button>
                        `;
                        
                        if (data.transfer_status === 'Pending') {
                            actions += `
                                <button class="btn btn-outline-success btn-complete" data-id="${data.id}" title="Complete">
                                    <i class="bi bi-check-circle"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-cancel" data-id="${data.id}" title="Cancel">
                                    <i class="bi bi-x-circle"></i>
                                </button>
                            `;
                        }
                        
                        actions += '</div>';
                        return actions;
                    }
                }
            ],
            order: [[0, 'desc']],
            pageLength: 25,
            language: {
                emptyTable: '<div class="text-center py-4"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No transfers found</p></div>'
            }
        });
    }

    openAddModal() {
        this.currentTransferId = null;
        this.form.reset();
        document.getElementById('transferItemsBody').innerHTML = '';
        this.sourceWarehouseId = null;
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transferDate').value = today;
        this.modal.show();
    }

    addItemRow() {
        const tbody = document.getElementById('transferItemsBody');
        const row = document.createElement('tr');
        
        let itemOptions = '<option value="">Select Item</option>';
        this.items.forEach(item => {
            itemOptions += `<option value="${item.id}">${item.name}</option>`;
        });
        
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm item-select" required>
                    ${itemOptions}
                </select>
            </td>
            <td>
                <span class="current-stock">-</span>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm transfer-quantity" min="1" required>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm transfer-remarks" placeholder="Remarks">
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger btn-remove-item">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    }

    async loadStockLevel(row) {
        const itemSelect = row.querySelector('.item-select');
        const stockSpan = row.querySelector('.current-stock');
        
        const itemId = itemSelect?.value;
        
        if (!itemId || !this.sourceWarehouseId) {
            stockSpan.textContent = '-';
            return;
        }
        
        try {
            const response = await apiService.get(
                `/inventory/inventory-transfers.php?action=stock_level&item_id=${itemId}&warehouse_id=${this.sourceWarehouseId}`
            );
            
            if (response.success) {
                const quantity = response.data?.quantity_in_stock || 0;
                stockSpan.textContent = quantity;
                stockSpan.className = quantity <= 10 ? 'current-stock text-warning' : 'current-stock';
            } else {
                stockSpan.textContent = '0';
            }
        } catch (error) {
            console.error('Error loading stock level:', error);
            stockSpan.textContent = '-';
        }
    }

    updateItemStockLevels() {
        document.querySelectorAll('#transferItemsBody tr').forEach(row => {
            this.loadStockLevel(row);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('saveTransferBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        spinner.classList.remove('d-none');
        
        try {
            const formData = {
                transfer_date: document.getElementById('transferDate').value,
                source_warehouse_id: document.getElementById('sourceWarehouse').value,
                destination_warehouse_id: document.getElementById('destinationWarehouse').value,
                transfer_remarks: document.getElementById('transferRemarks').value,
                items: []
            };
            
            if (formData.source_warehouse_id === formData.destination_warehouse_id) {
                Swal.fire('Error', 'Source and destination warehouses cannot be the same', 'error');
                return;
            }
            
            // Collect items
            document.querySelectorAll('#transferItemsBody tr').forEach(row => {
                const itemId = row.querySelector('.item-select')?.value;
                const quantity = row.querySelector('.transfer-quantity')?.value;
                const remarks = row.querySelector('.transfer-remarks')?.value;
                
                if (itemId && quantity) {
                    formData.items.push({
                        item_id: itemId,
                        quantity: quantity,
                        remarks: remarks || ''
                    });
                }
            });
            
            if (formData.items.length === 0) {
                Swal.fire('Error', 'Please add at least one item', 'error');
                return;
            }
            
            const response = await apiService.post('/inventory/inventory-transfers.php?action=create', formData);
            
            if (response.success) {
                Swal.fire('Success', response.message, 'success');
                this.modal.hide();
                this.dataTable.ajax.reload();
            } else {
                Swal.fire('Error', response.message || 'Failed to create transfer', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'An error occurred', 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            spinner.classList.add('d-none');
        }
    }

    async viewTransfer(id) {
        this.currentTransferId = id;
        
        try {
            const response = await apiService.get(`/inventory/inventory-transfers.php?action=get&id=${id}`);
            
            if (response.success) {
                const transfer = response.data;
                const content = document.getElementById('viewTransferContent');
                const completeBtn = document.getElementById('completeBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                
                let itemsHtml = '<table class="table table-bordered"><thead><tr><th>Item</th><th>Source Stock</th><th>Quantity</th><th>Remarks</th></tr></thead><tbody>';
                transfer.items.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td>${this.escapeHtml(item.item_name)}</td>
                            <td>${item.source_stock || 0}</td>
                            <td>${item.quantity}</td>
                            <td>${this.escapeHtml(item.remarks || '-')}</td>
                        </tr>
                    `;
                });
                itemsHtml += '</tbody></table>';
                
                const statusClass = {
                    'Pending': 'warning',
                    'In Transit': 'info',
                    'Completed': 'success',
                    'Cancelled': 'danger'
                }[transfer.transfer_status] || 'secondary';
                
                content.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-3"><strong>Date:</strong></div>
                        <div class="col-md-9">${new Date(transfer.transfer_date).toLocaleDateString()}</div>
                        
                        <div class="col-md-3"><strong>From:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(transfer.source_warehouse_name)}</div>
                        
                        <div class="col-md-3"><strong>To:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(transfer.destination_warehouse_name)}</div>
                        
                        <div class="col-md-3"><strong>Status:</strong></div>
                        <div class="col-md-9"><span class="badge bg-${statusClass}">${transfer.transfer_status}</span></div>
                        
                        <div class="col-md-3"><strong>Remarks:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(transfer.transfer_remarks || '-')}</div>
                        
                        <div class="col-md-3"><strong>Created By:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(transfer.created_by_name || '-')}</div>
                        
                        <div class="col-md-3"><strong>Created At:</strong></div>
                        <div class="col-md-9">${new Date(transfer.created_at || transfer.transfer_created_at).toLocaleString()}</div>
                        
                        <div class="col-12"><hr><strong>Items:</strong></div>
                        <div class="col-12">${itemsHtml}</div>
                    </div>
                `;
                
                if (transfer.transfer_status === 'Pending') {
                    completeBtn.classList.remove('d-none');
                    cancelBtn.classList.remove('d-none');
                } else {
                    completeBtn.classList.add('d-none');
                    cancelBtn.classList.add('d-none');
                }
                
                this.viewModal.show();
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to load transfer details', 'error');
        }
    }

    async confirmComplete(id) {
        const result = await Swal.fire({
            title: 'Complete Transfer',
            text: 'Are you sure you want to complete this transfer? Stock levels will be updated.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'Yes, complete',
            cancelButtonText: 'Cancel'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/inventory/inventory-transfers.php?action=complete', { id });
                
                if (response.success) {
                    Swal.fire('Success', response.message, 'success');
                    this.viewModal.hide();
                    this.dataTable.ajax.reload();
                } else {
                    Swal.fire('Error', response.message || 'Failed to complete transfer', 'error');
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'An error occurred', 'error');
            }
        }
    }

    async confirmCancel(id) {
        const result = await Swal.fire({
            title: 'Cancel Transfer',
            text: 'Are you sure you want to cancel this transfer?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, cancel',
            cancelButtonText: 'No'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/inventory/inventory-transfers.php?action=cancel', { id });
                
                if (response.success) {
                    Swal.fire('Success', response.message, 'success');
                    this.viewModal.hide();
                    this.dataTable.ajax.reload();
                } else {
                    Swal.fire('Error', response.message || 'Failed to cancel transfer', 'error');
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'An error occurred', 'error');
            }
        }
    }

    applyStatusFilter(status) {
        if (this.dataTable) {
            this.dataTable.ajax.reload();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const transfersModule = new TransfersModule();
export default transfersModule;

