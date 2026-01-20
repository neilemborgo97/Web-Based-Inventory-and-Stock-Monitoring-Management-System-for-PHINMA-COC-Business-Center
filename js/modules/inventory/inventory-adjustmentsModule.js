/**
 * Inventory Adjustments Module
 * Handles CRUD operations for inventory adjustments with approval workflow
 */

import { apiService } from '../../services/services-apiServices.js';

class AdjustmentsModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.viewModal = null;
        this.form = null;
        this.items = [];
        this.warehouses = [];
        this.currentAdjustmentId = null;
        this.userLevel = 0;
    }

    async init() {
        // Get user level from session
        const userData = await this.getUserData();
        this.userLevel = userData?.level || 0;
        
        this.setupElements();
        this.bindEvents();
        await this.loadDropdownData();
        this.initDataTable();
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('adjustmentDate').value = today;
    }

    async getUserData() {
        try {
            const response = await apiService.get('/auth/auth-check-session.php');
            return response.user || null;
        } catch (error) {
            return null;
        }
    }

    setupElements() {
        this.modal = new bootstrap.Modal(document.getElementById('adjustmentModal'));
        this.viewModal = new bootstrap.Modal(document.getElementById('viewAdjustmentModal'));
        this.form = document.getElementById('adjustmentForm');
    }

    bindEvents() {
        // Add button
        document.getElementById('addAdjustmentBtn')?.addEventListener('click', () => this.openAddModal());

        // Form submit
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Add item row
        document.getElementById('addItemRow')?.addEventListener('click', () => this.addItemRow());

        // Remove item row
        document.getElementById('adjustmentItemsBody')?.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-item')) {
                e.target.closest('tr').remove();
            }
        });

        // Item and warehouse change - load stock level
        document.getElementById('adjustmentItemsBody')?.addEventListener('change', async (e) => {
            if (e.target.classList.contains('item-select') || e.target.classList.contains('warehouse-select')) {
                await this.loadStockLevel(e.target.closest('tr'));
            }
        });

        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.applyStatusFilter(e.target.value);
        });

        // Table actions
        document.getElementById('adjustmentsTable')?.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const approveBtn = e.target.closest('.btn-approve');
            const cancelBtn = e.target.closest('.btn-cancel');

            if (viewBtn) this.viewAdjustment(viewBtn.dataset.id);
            if (approveBtn) this.confirmApprove(approveBtn.dataset.id);
            if (cancelBtn) this.confirmCancel(cancelBtn.dataset.id);
        });

        // Approve/Cancel buttons in view modal
        document.getElementById('approveBtn')?.addEventListener('click', () => {
            if (this.currentAdjustmentId) {
                this.confirmApprove(this.currentAdjustmentId);
            }
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            if (this.currentAdjustmentId) {
                this.confirmCancel(this.currentAdjustmentId);
            }
        });
    }

    async loadDropdownData() {
        try {
            const [items, warehouses] = await Promise.all([
                apiService.get('/inventory/inventory-adjustments.php?action=items'),
                apiService.get('/inventory/inventory-adjustments.php?action=warehouses')
            ]);

            this.items = items.data || [];
            this.warehouses = warehouses.data || [];
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    initDataTable() {
        this.dataTable = $('#adjustmentsTable').DataTable({
            ajax: {
                url: '../../api/inventory/inventory-adjustments.php?action=list',
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
                    data: 'adjustment_date',
                    render: (data) => data ? new Date(data).toLocaleDateString() : '-'
                },
                { 
                    data: 'adjustment_type',
                    render: (data) => {
                        const badgeClass = data === 'Increase' ? 'bg-success' : 'bg-danger';
                        return `<span class="badge ${badgeClass}">${data}</span>`;
                    }
                },
                { data: 'adjustment_reason' },
                { 
                    data: 'item_count',
                    render: (data) => `${data || 0} item(s)`
                },
                { 
                    data: 'adjustment_status',
                    render: (data) => {
                        const statusClass = {
                            'Pending': 'bg-warning',
                            'Approved': 'bg-success',
                            'Completed': 'bg-info',
                            'Cancelled': 'bg-danger'
                        }[data] || 'bg-secondary';
                        return `<span class="badge ${statusClass}">${data}</span>`;
                    }
                },
                { data: 'created_by_name', defaultContent: '-' },
                { data: 'approved_by_name', defaultContent: '-' },
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
                        
                        if (data.adjustment_status === 'Pending' && this.userLevel >= 50) {
                            actions += `
                                <button class="btn btn-outline-success btn-approve" data-id="${data.id}" title="Approve">
                                    <i class="bi bi-check-circle"></i>
                                </button>
                            `;
                        }
                        
                        if (data.adjustment_status === 'Pending') {
                            actions += `
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
                emptyTable: '<div class="text-center py-4"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No adjustments found</p></div>'
            }
        });
    }

    openAddModal() {
        this.currentAdjustmentId = null;
        this.form.reset();
        document.getElementById('adjustmentItemsBody').innerHTML = '';
        document.getElementById('adjustmentModalLabel').textContent = 'New Inventory Adjustment';
        this.addItemRow();
        this.modal.show();
    }

    addItemRow() {
        const tbody = document.getElementById('adjustmentItemsBody');
        const row = document.createElement('tr');
        
        let itemOptions = '<option value="">Select Item</option>';
        this.items.forEach(item => {
            itemOptions += `<option value="${item.id}">${item.name}</option>`;
        });
        
        let warehouseOptions = '<option value="">Select Warehouse</option>';
        this.warehouses.forEach(warehouse => {
            warehouseOptions += `<option value="${warehouse.id}">${warehouse.name}</option>`;
        });
        
        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm item-select" required>
                    ${itemOptions}
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm warehouse-select" required>
                    ${warehouseOptions}
                </select>
            </td>
            <td>
                <span class="current-stock">-</span>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm adjustment-quantity" min="1" required>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm adjustment-reason" placeholder="Reason">
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
        const warehouseSelect = row.querySelector('.warehouse-select');
        const stockSpan = row.querySelector('.current-stock');
        
        const itemId = itemSelect?.value;
        const warehouseId = warehouseSelect?.value;
        
        if (!itemId || !warehouseId) {
            stockSpan.textContent = '-';
            return;
        }
        
        try {
            const response = await apiService.get(
                `/inventory/inventory-adjustments.php?action=stock_level&item_id=${itemId}&warehouse_id=${warehouseId}`
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

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('saveAdjustmentBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        spinner.classList.remove('d-none');
        
        try {
            const formData = {
                adjustment_date: document.getElementById('adjustmentDate').value,
                adjustment_type: document.getElementById('adjustmentType').value,
                adjustment_reason: document.getElementById('adjustmentReason').value,
                adjustment_remarks: document.getElementById('adjustmentRemarks').value,
                items: []
            };
            
            // Collect items
            document.querySelectorAll('#adjustmentItemsBody tr').forEach(row => {
                const itemId = row.querySelector('.item-select')?.value;
                const warehouseId = row.querySelector('.warehouse-select')?.value;
                const quantity = row.querySelector('.adjustment-quantity')?.value;
                const reason = row.querySelector('.adjustment-reason')?.value;
                
                if (itemId && warehouseId && quantity) {
                    formData.items.push({
                        item_id: itemId,
                        warehouse_id: warehouseId,
                        quantity: quantity,
                        reason: reason || ''
                    });
                }
            });
            
            if (formData.items.length === 0) {
                Swal.fire('Error', 'Please add at least one item', 'error');
                return;
            }
            
            const response = await apiService.post('/inventory/inventory-adjustments.php?action=create', formData);
            
            if (response.success) {
                Swal.fire('Success', response.message, 'success');
                this.modal.hide();
                this.dataTable.ajax.reload();
            } else {
                Swal.fire('Error', response.message || 'Failed to create adjustment', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'An error occurred', 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            spinner.classList.add('d-none');
        }
    }

    async viewAdjustment(id) {
        this.currentAdjustmentId = id;
        
        try {
            const response = await apiService.get(`/inventory/inventory-adjustments.php?action=get&id=${id}`);
            
            if (response.success) {
                const adj = response.data;
                const content = document.getElementById('viewAdjustmentContent');
                const approveBtn = document.getElementById('approveBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                
                let itemsHtml = '<table class="table table-bordered"><thead><tr><th>Item</th><th>Warehouse</th><th>Current Stock</th><th>Quantity</th><th>Reason</th></tr></thead><tbody>';
                adj.items.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td>${this.escapeHtml(item.item_name)}</td>
                            <td>${this.escapeHtml(item.warehouse_name || '-')}</td>
                            <td>${item.current_stock || 0}</td>
                            <td>${item.quantity}</td>
                            <td>${this.escapeHtml(item.reason || '-')}</td>
                        </tr>
                    `;
                });
                itemsHtml += '</tbody></table>';
                
                const statusClass = {
                    'Pending': 'warning',
                    'Approved': 'success',
                    'Completed': 'info',
                    'Cancelled': 'danger'
                }[adj.adjustment_status] || 'secondary';
                
                content.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-3"><strong>Date:</strong></div>
                        <div class="col-md-9">${new Date(adj.adjustment_date).toLocaleDateString()}</div>
                        
                        <div class="col-md-3"><strong>Type:</strong></div>
                        <div class="col-md-9"><span class="badge bg-${adj.adjustment_type === 'Increase' ? 'success' : 'danger'}">${adj.adjustment_type}</span></div>
                        
                        <div class="col-md-3"><strong>Status:</strong></div>
                        <div class="col-md-9"><span class="badge bg-${statusClass}">${adj.adjustment_status}</span></div>
                        
                        <div class="col-md-3"><strong>Reason:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(adj.adjustment_reason)}</div>
                        
                        <div class="col-md-3"><strong>Remarks:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(adj.adjustment_remarks || '-')}</div>
                        
                        <div class="col-md-3"><strong>Created By:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(adj.created_by_name || '-')}</div>
                        
                        <div class="col-md-3"><strong>Created At:</strong></div>
                        <div class="col-md-9">${new Date(adj.created_at).toLocaleString()}</div>
                        
                        ${adj.approved_by_name ? `
                            <div class="col-md-3"><strong>Approved By:</strong></div>
                            <div class="col-md-9">${this.escapeHtml(adj.approved_by_name)}</div>
                        ` : ''}
                        
                        <div class="col-12"><hr><strong>Items:</strong></div>
                        <div class="col-12">${itemsHtml}</div>
                    </div>
                `;
                
                // Show/hide action buttons
                if (adj.adjustment_status === 'Pending' && this.userLevel >= 50) {
                    approveBtn.classList.remove('d-none');
                } else {
                    approveBtn.classList.add('d-none');
                }
                
                if (adj.adjustment_status === 'Pending') {
                    cancelBtn.classList.remove('d-none');
                } else {
                    cancelBtn.classList.add('d-none');
                }
                
                this.viewModal.show();
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to load adjustment details', 'error');
        }
    }

    async confirmApprove(id) {
        const result = await Swal.fire({
            title: 'Approve Adjustment',
            text: 'Are you sure you want to approve this adjustment? Stock levels will be updated.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'Yes, approve',
            cancelButtonText: 'Cancel'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/inventory/inventory-adjustments.php?action=approve', { id });
                
                if (response.success) {
                    Swal.fire('Success', response.message, 'success');
                    this.viewModal.hide();
                    this.dataTable.ajax.reload();
                } else {
                    Swal.fire('Error', response.message || 'Failed to approve adjustment', 'error');
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'An error occurred', 'error');
            }
        }
    }

    async confirmCancel(id) {
        const result = await Swal.fire({
            title: 'Cancel Adjustment',
            text: 'Are you sure you want to cancel this adjustment?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, cancel',
            cancelButtonText: 'No'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/inventory/inventory-adjustments.php?action=cancel', { id });
                
                if (response.success) {
                    Swal.fire('Success', response.message, 'success');
                    this.viewModal.hide();
                    this.dataTable.ajax.reload();
                } else {
                    Swal.fire('Error', response.message || 'Failed to cancel adjustment', 'error');
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

export const adjustmentsModule = new AdjustmentsModule();
export default adjustmentsModule;

