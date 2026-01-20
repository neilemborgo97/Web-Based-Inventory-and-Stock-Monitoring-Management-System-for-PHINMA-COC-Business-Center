/**
 * Purchase Returns Module
 * Handles CRUD operations for purchase returns with audit trails
 */

import { apiService } from '../../services/services-apiServices.js';

class ReturnsModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.viewModal = null;
        this.form = null;
        this.purchaseOrders = [];
        this.warehouses = [];
        this.currentReturnId = null;
    }

    async init() {
        this.setupElements();
        this.bindEvents();
        await this.loadDropdownData();
        this.initDataTable();
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('returnDate').value = today;
    }

    setupElements() {
        this.modal = new bootstrap.Modal(document.getElementById('returnModal'));
        this.viewModal = new bootstrap.Modal(document.getElementById('viewReturnModal'));
        this.form = document.getElementById('returnForm');
    }

    bindEvents() {
        document.getElementById('addReturnBtn')?.addEventListener('click', () => this.openAddModal());
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('loadPOItemsBtn')?.addEventListener('click', () => this.loadPOItems());

        document.getElementById('returnItemsBody')?.addEventListener('input', (e) => {
            if (e.target.classList.contains('return-qty') || e.target.classList.contains('return-cost')) {
                this.calculateRowTotal(e.target.closest('tr'));
            }
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.applyStatusFilter(e.target.value);
        });

        document.getElementById('returnsTable')?.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.btn-view');
            const completeBtn = e.target.closest('.btn-complete');
            const cancelBtn = e.target.closest('.btn-cancel');

            if (viewBtn) this.viewReturn(viewBtn.dataset.id);
            if (completeBtn) this.confirmComplete(completeBtn.dataset.id);
            if (cancelBtn) this.confirmCancel(cancelBtn.dataset.id);
        });

        document.getElementById('completeBtn')?.addEventListener('click', () => {
            if (this.currentReturnId) {
                this.confirmComplete(this.currentReturnId);
            }
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            if (this.currentReturnId) {
                this.confirmCancel(this.currentReturnId);
            }
        });
    }

    async loadDropdownData() {
        try {
            const [pos, warehouses] = await Promise.all([
                apiService.get('/inventory/inventory-returns.php?action=purchase_orders'),
                apiService.get('/inventory/inventory-returns.php?action=warehouses')
            ]);

            this.purchaseOrders = pos.data || [];
            this.warehouses = warehouses.data || [];

            this.populateSelect('purchaseOrder', this.purchaseOrders, 'po_number');
            this.populateSelect('warehouse', this.warehouses);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    populateSelect(elementId, data, displayField = 'name') {
        const select = document.getElementById(elementId);
        if (!select) return;

        const placeholder = elementId.includes('purchase') ? 'Select Purchase Order' : 'Select Warehouse';
        select.innerHTML = `<option value="">${placeholder}</option>`;

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item[displayField] || item.name;
            if (item.supplier_name) {
                option.textContent += ` - ${item.supplier_name}`;
            }
            select.appendChild(option);
        });
    }

    initDataTable() {
        this.dataTable = $('#returnsTable').DataTable({
            ajax: {
                url: '../../api/inventory/inventory-returns.php?action=list',
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
                    data: 'return_date',
                    render: (data) => data ? new Date(data).toLocaleDateString() : '-'
                },
                { data: 'po_number', defaultContent: '-' },
                { data: 'supplier_name', defaultContent: '-' },
                { data: 'warehouse_name', defaultContent: '-' },
                { 
                    data: 'item_count',
                    render: (data) => `${data || 0} item(s)`
                },
                { 
                    data: 'total_amount',
                    render: (data) => `₱${this.formatNumber(data || 0)}`
                },
                { 
                    data: 'return_status',
                    render: (data) => {
                        const statusClass = {
                            'Pending': 'bg-warning',
                            'Completed': 'bg-success',
                            'Cancelled': 'bg-danger'
                        }[data] || 'bg-secondary';
                        return `<span class="badge ${statusClass}">${data}</span>`;
                    }
                },
                { data: 'created_by_name', defaultContent: '-' },
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
                        
                        if (data.return_status === 'Pending') {
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
                emptyTable: '<div class="text-center py-4"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No returns found</p></div>'
            }
        });
    }

    openAddModal() {
        this.currentReturnId = null;
        this.form.reset();
        document.getElementById('returnItemsBody').innerHTML = '';
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('returnDate').value = today;
        this.modal.show();
    }

    async loadPOItems() {
        const poId = document.getElementById('purchaseOrder')?.value;
        
        if (!poId) {
            Swal.fire('Error', 'Please select a purchase order first', 'error');
            return;
        }
        
        try {
            const response = await apiService.get(`/inventory/inventory-returns.php?action=po_items&po_id=${poId}`);
            
            if (response.success) {
                const tbody = document.getElementById('returnItemsBody');
                tbody.innerHTML = '';
                
                response.data.forEach(item => {
                    const row = document.createElement('tr');
                    const availableQty = item.quantity_received || 0;
                    
                    row.innerHTML = `
                        <td>
                            ${this.escapeHtml(item.item_name)}
                            <input type="hidden" class="item-id" value="${item.item_id}">
                        </td>
                        <td>${availableQty}</td>
                        <td>
                            <input type="number" class="form-control form-control-sm return-qty" 
                                   min="1" max="${availableQty}" value="0" required>
                        </td>
                        <td>
                            <input type="number" class="form-control form-control-sm return-cost" 
                                   step="0.01" value="${item.unit_cost || 0}" readonly>
                        </td>
                        <td>
                            <span class="row-total">₱0.00</span>
                        </td>
                        <td>
                            <input type="text" class="form-control form-control-sm return-reason" 
                                   placeholder="Reason">
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to load PO items', 'error');
        }
    }

    calculateRowTotal(row) {
        const qty = parseFloat(row.querySelector('.return-qty')?.value || 0);
        const cost = parseFloat(row.querySelector('.return-cost')?.value || 0);
        const total = qty * cost;
        row.querySelector('.row-total').textContent = `₱${this.formatNumber(total)}`;
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('saveReturnBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.spinner-border');
        
        submitBtn.disabled = true;
        btnText.classList.add('d-none');
        spinner.classList.remove('d-none');
        
        try {
            const formData = {
                po_id: document.getElementById('purchaseOrder').value,
                return_date: document.getElementById('returnDate').value,
                return_reason: document.getElementById('returnReason').value,
                warehouse_id: document.getElementById('warehouse').value,
                remarks: document.getElementById('returnRemarks').value,
                items: []
            };
            
            // Collect items
            document.querySelectorAll('#returnItemsBody tr').forEach(row => {
                const itemId = row.querySelector('.item-id')?.value;
                const quantity = row.querySelector('.return-qty')?.value;
                const unitCost = row.querySelector('.return-cost')?.value;
                const reason = row.querySelector('.return-reason')?.value;
                
                if (itemId && quantity && parseFloat(quantity) > 0) {
                    formData.items.push({
                        item_id: itemId,
                        quantity: quantity,
                        unit_cost: unitCost,
                        reason: reason || ''
                    });
                }
            });
            
            if (formData.items.length === 0) {
                Swal.fire('Error', 'Please add at least one item to return', 'error');
                return;
            }
            
            const response = await apiService.post('/inventory/inventory-returns.php?action=create', formData);
            
            if (response.success) {
                Swal.fire('Success', response.message, 'success');
                this.modal.hide();
                this.dataTable.ajax.reload();
            } else {
                Swal.fire('Error', response.message || 'Failed to create return', 'error');
            }
        } catch (error) {
            Swal.fire('Error', error.message || 'An error occurred', 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('d-none');
            spinner.classList.add('d-none');
        }
    }

    async viewReturn(id) {
        this.currentReturnId = id;
        
        try {
            const response = await apiService.get(`/inventory/inventory-returns.php?action=get&id=${id}`);
            
            if (response.success) {
                const ret = response.data;
                const content = document.getElementById('viewReturnContent');
                const completeBtn = document.getElementById('completeBtn');
                const cancelBtn = document.getElementById('cancelBtn');
                
                let itemsHtml = '<table class="table table-bordered"><thead><tr><th>Item</th><th>Quantity</th><th>Unit Cost</th><th>Total Cost</th><th>Reason</th></tr></thead><tbody>';
                ret.items.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td>${this.escapeHtml(item.item_name)}</td>
                            <td>${item.quantity}</td>
                            <td>₱${this.formatNumber(item.unit_cost)}</td>
                            <td>₱${this.formatNumber(item.total_cost)}</td>
                            <td>${this.escapeHtml(item.reason || '-')}</td>
                        </tr>
                    `;
                });
                itemsHtml += '</tbody></table>';
                
                const statusClass = {
                    'Pending': 'warning',
                    'Completed': 'success',
                    'Cancelled': 'danger'
                }[ret.return_status] || 'secondary';
                
                content.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-3"><strong>Return Date:</strong></div>
                        <div class="col-md-9">${new Date(ret.return_date).toLocaleDateString()}</div>
                        
                        <div class="col-md-3"><strong>PO Number:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(ret.po_number || '-')}</div>
                        
                        <div class="col-md-3"><strong>Supplier:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(ret.supplier_name || '-')}</div>
                        
                        <div class="col-md-3"><strong>Warehouse:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(ret.warehouse_name || '-')}</div>
                        
                        <div class="col-md-3"><strong>Return Reason:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(ret.return_reason)}</div>
                        
                        <div class="col-md-3"><strong>Total Amount:</strong></div>
                        <div class="col-md-9"><strong>₱${this.formatNumber(ret.total_amount || 0)}</strong></div>
                        
                        <div class="col-md-3"><strong>Status:</strong></div>
                        <div class="col-md-9"><span class="badge bg-${statusClass}">${ret.return_status}</span></div>
                        
                        <div class="col-md-3"><strong>Remarks:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(ret.remarks || '-')}</div>
                        
                        <div class="col-md-3"><strong>Created By:</strong></div>
                        <div class="col-md-9">${this.escapeHtml(ret.created_by_name || '-')}</div>
                        
                        <div class="col-md-3"><strong>Created At:</strong></div>
                        <div class="col-md-9">${new Date(ret.created_at).toLocaleString()}</div>
                        
                        <div class="col-12"><hr><strong>Items:</strong></div>
                        <div class="col-12">${itemsHtml}</div>
                    </div>
                `;
                
                if (ret.return_status === 'Pending') {
                    completeBtn.classList.remove('d-none');
                    cancelBtn.classList.remove('d-none');
                } else {
                    completeBtn.classList.add('d-none');
                    cancelBtn.classList.add('d-none');
                }
                
                this.viewModal.show();
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to load return details', 'error');
        }
    }

    async confirmComplete(id) {
        const result = await Swal.fire({
            title: 'Complete Return',
            text: 'Are you sure you want to complete this return? Stock levels will be decreased.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'Yes, complete',
            cancelButtonText: 'Cancel'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/inventory/inventory-returns.php?action=complete', { id });
                
                if (response.success) {
                    Swal.fire('Success', response.message, 'success');
                    this.viewModal.hide();
                    this.dataTable.ajax.reload();
                } else {
                    Swal.fire('Error', response.message || 'Failed to complete return', 'error');
                }
            } catch (error) {
                Swal.fire('Error', error.message || 'An error occurred', 'error');
            }
        }
    }

    async confirmCancel(id) {
        const result = await Swal.fire({
            title: 'Cancel Return',
            text: 'Are you sure you want to cancel this return?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, cancel',
            cancelButtonText: 'No'
        });
        
        if (result.isConfirmed) {
            try {
                const response = await apiService.post('/inventory/inventory-returns.php?action=cancel', { id });
                
                if (response.success) {
                    Swal.fire('Success', response.message, 'success');
                    this.viewModal.hide();
                    this.dataTable.ajax.reload();
                } else {
                    Swal.fire('Error', response.message || 'Failed to cancel return', 'error');
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

    formatNumber(num) {
        return parseFloat(num || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const returnsModule = new ReturnsModule();
export default returnsModule;

