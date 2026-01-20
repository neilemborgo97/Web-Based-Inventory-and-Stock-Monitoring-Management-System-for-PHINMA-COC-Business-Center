/**
 * Purchase Order Module
 */

import { apiService } from '../../services/services-apiServices.js';

class PurchaseOrderModule {
    constructor() {
        this.dataTable = null;
        this.modal = null;
        this.viewModal = null;
        this.isEditing = false;
        this.supplierItems = []; // Items filtered by supplier

        // Receiving modal (PO page)
        this.receivingModal = null;
        this.currentPoId = null;
    }

    async init() {
        this.modal = new bootstrap.Modal(document.getElementById('poModal'));
        this.viewModal = new bootstrap.Modal(document.getElementById('viewPOModal'));

        const recvModalEl = document.getElementById('poReceivingModal');
        if (recvModalEl && typeof bootstrap !== 'undefined') {
            this.receivingModal = new bootstrap.Modal(recvModalEl);
        }

        this.form = document.getElementById('poForm');
        
        await this.loadSuppliers();
        this.bindEvents();
        this.initDataTable();
    }

    async loadSuppliers() {
        try {
            const response = await apiService.get('/admin/admin-purchase-order.php?action=suppliers');
            const supplierSelect = document.getElementById('poSupplier');
            supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
            (response.data || []).forEach(s => {
                supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        } catch (e) { console.error(e); }
    }

    async loadItemsBySupplier(supplierId) {
        if (!supplierId) {
            this.supplierItems = [];
            this.updateAllItemDropdowns();
            return;
        }

        try {
            const response = await apiService.get(`/admin/admin-purchase-order.php?action=items&supplier_id=${supplierId}`);
            this.supplierItems = response.data || [];
            this.updateAllItemDropdowns();
        } catch (e) { 
            console.error(e);
            this.supplierItems = [];
        }
    }

    updateAllItemDropdowns() {
        document.querySelectorAll('#itemsBody .item-select').forEach(select => {
            const currentValue = select.value;
            this.populateItemSelect(select, currentValue);
        });
    }

    populateItemSelect(select, selectedValue = '') {
        let options = '<option value="">Select Item</option>';
        this.supplierItems.forEach(item => {
            const selected = selectedValue == item.id ? 'selected' : '';
            options += `<option value="${item.id}" data-cost="${item.unit_cost}" ${selected}>${item.name}</option>`;
        });
        select.innerHTML = options;
    }

    bindEvents() {
        document.getElementById('addPOBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('addItemRow')?.addEventListener('click', () => this.addItemRow());
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Status filter dropdown
        const statusFilter = document.getElementById('poStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                const value = e.target.value || 'ALL';
                this.applyStatusFilter(value);
            });
        }

        // Supplier change - reload items
        document.getElementById('poSupplier')?.addEventListener('change', (e) => {
            const supplierId = e.target.value;
            document.getElementById('itemsBody').innerHTML = '';
            this.loadItemsBySupplier(supplierId).then(() => {
                if (supplierId && this.supplierItems.length > 0) {
                    this.addItemRow();
                } else if (supplierId && this.supplierItems.length === 0) {
                    Swal.fire('Info', 'No items found for this supplier. Please add items first.', 'info');
                }
            });
        });

        document.getElementById('itemsBody')?.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-item')) {
                e.target.closest('tr').remove();
                this.calculateTotal();
            }
        });

        document.getElementById('itemsBody')?.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-select')) {
                this.onItemSelect(e.target);
            }
            if (e.target.classList.contains('item-qty') || e.target.classList.contains('item-cost')) {
                this.calculateRowTotal(e.target.closest('tr'));
            }
        });

        document.getElementById('poTable')?.addEventListener('click', (e) => {
            // const viewBtn = e.target.closest('.btn-view');
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            const receiveBtn = e.target.closest('.btn-receive');
            // if (viewBtn) this.viewPO(viewBtn.dataset.id);
            if (editBtn) this.openEditModal(editBtn.dataset.id);
            if (deleteBtn) this.confirmDelete(deleteBtn.dataset.id, deleteBtn.dataset.number);
            if (receiveBtn) this.openReceivingModal(parseInt(receiveBtn.dataset.id, 10));
        });

        // Click row to open receiving modal (like dashboard) - ignore clicks on action buttons
        document.querySelector('#poTable tbody')?.addEventListener('click', (e) => {
            if (e.target.closest('.btn-group') || e.target.closest('button')) return;
            if (!this.dataTable) return;
            const tr = e.target.closest('tr');
            if (!tr) return;
            const rowData = this.dataTable.row(tr).data();
            if (rowData?.id) {
                this.openReceivingModal(parseInt(rowData.id, 10));
            }
        });

        document.getElementById('printPOBtn')?.addEventListener('click', () => window.print());

        // Status tabs - use Bootstrap tab events
        const tabButtons = document.querySelectorAll('#poStatusTabs button[data-status]');
        tabButtons.forEach(btn => {
            btn.addEventListener('shown.bs.tab', (e) => {
                const status = e.target.getAttribute('data-status');
                this.applyStatusFilter(status);
            });
        });

        // Receiving form events
        const recvForm = document.getElementById('poReceivingForm');
        if (recvForm) {
            recvForm.addEventListener('submit', (e) => this.handleReceivingSubmit(e));
            recvForm.addEventListener('input', (e) => {
                if (e.target.classList.contains('po-recv-qty') || e.target.classList.contains('po-recv-cost')) {
                    this.updateReceivingRowTotal(e.target.closest('tr'));
                }
            });
        }
    }

    applyStatusFilter(status) {
        if (!this.dataTable) return;

        // Status column index (0-based): ID, PO#, Supplier, CreatedBy, OrderDate, ActualDelivery, Total, Status, Actions
        const statusColIndex = 7;

        if (!status || status === 'ALL') {
            this.dataTable.column(statusColIndex).search('', true, false).draw();
            return;
        }

        // Match rendered text in the Status column
        if (status === 'COMPLETED') {
            // includes \"COMPLETED\" and \"COMPLETE\" (receiving complete)
            this.dataTable.column(statusColIndex).search('^(COMPLETED|COMPLETE)$', true, false).draw();
            return;
        }

        if (status === 'CANCELLED') {
            this.dataTable.column(statusColIndex).search('^CANCELLED$', true, false).draw();
            return;
        }

        if (status === 'PENDING') {
            this.dataTable.column(statusColIndex).search('^PENDING$', true, false).draw();
            return;
        }

        if (status === 'APPROVED') {
            this.dataTable.column(statusColIndex).search('^APPROVED$', true, false).draw();
            return;
        }

        if (status === 'RECEIVING_PARTIAL') {
            this.dataTable.column(statusColIndex).search('^RECEIVING_PARTIAL$', true, false).draw();
            return;
        }

        this.dataTable.column(statusColIndex).search('', true, false).draw();
    }

    initDataTable() {
        this.dataTable = $('#poTable').DataTable({
            ajax: { url: '../../api/admin/admin-purchase-order.php?action=list', dataSrc: (json) => json.success ? json.data : [] },
            columns: [
                { data: 'id' },
                { data: 'po_number', render: (d) => `<strong>${d}</strong>` },
                { data: 'supplier_name' },
                { data: 'created_by', render: (d) => `<span class="text-muted">${d || 'N/A'}</span>` },
                { data: 'order_date', render: (d) => this.formatDate(d) },
                { data: 'actual_delivery_date', render: (d) => d ? this.formatDate(d) : '-' },
                { data: 'total_cost', render: (d) => `<span class="fw-bold text-success">₱${this.formatNumber(d)}</span>` },
                { data: null, render: (d) => `<span class="badge badge-status badge-${d.status_class}">${d.status_name_display || d.status_name}</span>` },
                { data: null, orderable: false, render: (d) => `
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-success btn-action btn-receive" data-id="${d.id}" title="Receive Items"><i class="bi bi-box-arrow-in-down"></i></button>
                        
                        <button class="btn btn-outline-primary btn-action btn-edit" data-id="${d.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-warning btn-action btn-delete" data-id="${d.id}" data-number="${d.po_number}" title="Cancel"><i class="bi bi-x-circle"></i></button>
                    </div>` }
            ],
            order: [[0, 'desc']]
        });
    }

    openAddModal() {
        this.isEditing = false;
        this.form.reset();
        document.getElementById('poId').value = '';
        document.getElementById('poModalTitle').textContent = 'New Purchase Order';
        document.getElementById('poOrderDate').value = this.getLocalDateString();
        document.getElementById('itemsBody').innerHTML = '';
        this.supplierItems = [];
        this.setPOModalEditable(true); // Always editable for new PO
        this.modal.show();
    }

    async openEditModal(id) {
        this.isEditing = true;
        document.getElementById('poModalTitle').textContent = 'Edit Purchase Order';

        try {
            const response = await apiService.get(`/admin/admin-purchase-order.php?action=get&id=${id}`);
            if (response.success) {
                const po = response.data;
                document.getElementById('poId').value = po.id;
                document.getElementById('poNumber').value = po.po_number;
                document.getElementById('poSupplier').value = po.supplier_id;
                document.getElementById('poStatus').value = po.status;
                document.getElementById('poOrderDate').value = po.order_date;
                document.getElementById('poDeliveryDate').value = po.delivery_date || '';
                document.getElementById('poRemarks').value = po.remarks || '';

                // Load items for this supplier first
                await this.loadItemsBySupplier(po.supplier_id);

                document.getElementById('itemsBody').innerHTML = '';
                (po.items || []).forEach(item => {
                    this.addItemRow(item);
                });

                this.calculateTotal();
                
                // Disable fields if PO is complete or cancelled
                const isComplete = po.status_name === 'COMPLETED' || 
                                   po.status_name === 'RECEIVING_COMPLETE' || 
                                   po.status_name_display === 'COMPLETE';
                const isCancelled = po.status_name === 'CANCELLED' || 
                                   po.status_name_display === 'CANCELLED' ||
                                   po.status_class === 'cancelled';
                this.setPOModalEditable(!isComplete && !isCancelled);
                
                this.modal.show();
            }
        } catch (e) { Swal.fire('Error', 'Failed to load PO', 'error'); }
    }

    addItemRow(data = null) {
        if (this.supplierItems.length === 0) {
            Swal.fire('Warning', 'Please select a supplier first', 'warning');
            return;
        }

        const tbody = document.getElementById('itemsBody');
        const row = document.createElement('tr');
        
        let itemOptions = '<option value="">Select Item</option>';
        this.supplierItems.forEach(item => {
            const selected = data && data.item_id == item.id ? 'selected' : '';
            itemOptions += `<option value="${item.id}" data-cost="${item.unit_cost}" ${selected}>${item.name}</option>`;
        });

        row.innerHTML = `
            <td>
                <select class="form-select form-select-sm item-select" required>${itemOptions}</select>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm item-qty" min="1" value="${data?.quantity || 1}" required>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm item-cost" step="0.01" min="0" value="${data?.unit_cost || ''}" required>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm item-total" readonly value="${data ? '₱' + this.formatNumber(data.total_cost) : '₱0.00'}">
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger btn-remove-item"><i class="bi bi-x"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    }

    onItemSelect(select) {
        const row = select.closest('tr');
        const option = select.options[select.selectedIndex];
        const cost = option.dataset.cost || 0;
        row.querySelector('.item-cost').value = cost;
        this.calculateRowTotal(row);
    }

    calculateRowTotal(row) {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const cost = parseFloat(row.querySelector('.item-cost').value) || 0;
        const total = qty * cost;
        row.querySelector('.item-total').value = '₱' + this.formatNumber(total);
        this.calculateTotal();
    }

    calculateTotal() {
        let grandTotal = 0;
        document.querySelectorAll('#itemsBody tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const cost = parseFloat(row.querySelector('.item-cost').value) || 0;
            grandTotal += qty * cost;
        });
        document.getElementById('grandTotal').textContent = '₱' + this.formatNumber(grandTotal);
    }

    // -------- Receiving (PO page) --------

    async openReceivingModal(poId) {
        if (!poId || !this.receivingModal) return;

        this.currentPoId = poId;

        try {
            const [poResponse, whResponse] = await Promise.all([
                apiService.get(`/admin/admin-receiving.php?action=po_details&id=${poId}`),
                apiService.get('/admin/admin-receiving.php?action=warehouses')
            ]);

            if (!poResponse.success) {
                Swal.fire('Error', poResponse.message || 'Failed to load PO details.', 'error');
                return;
            }

            const po = poResponse.data;

            // Header
            document.getElementById('poRecvPoNumber').textContent = po.po_number;
            document.getElementById('poRecvSupplier').textContent = po.supplier_name || 'Supplier';
            document.getElementById('poRecvOrderDate').textContent = this.formatDate(po.order_date);
            const expectedEl = document.getElementById('poRecvExpectedDeliveryDate');
            if (expectedEl) expectedEl.textContent = po.expected_delivery_date ? this.formatDate(po.expected_delivery_date) : '-';
            const actualEl = document.getElementById('poRecvActualDeliveryDate');
            if (actualEl) actualEl.textContent = po.actual_delivery_date ? this.formatDate(po.actual_delivery_date) : '-';
            document.getElementById('poRecvTotal').textContent = '₱' + this.formatNumber(po.total_cost);

            // Status badge
            const statusBadge = document.getElementById('poRecvStatusBadge');
            if (statusBadge) {
                const statusDisplay = po.status_name_display || po.status_name || 'PENDING';
                const statusClass = po.status_class || 'pending';
                statusBadge.textContent = statusDisplay;
                statusBadge.className = `badge badge-status badge-${statusClass} ms-2`;
                statusBadge.style.display = 'inline-block';
            }

            // Created By
            const createdByEl = document.getElementById('poRecvCreatedBy');
            if (createdByEl && po.created_by && po.created_by !== 'N/A') {
                createdByEl.textContent = `Created by: ${po.created_by}`;
                createdByEl.style.display = 'block';
            } else if (createdByEl) {
                createdByEl.style.display = 'none';
            }

            // Cancelled By
            const cancelledByEl = document.getElementById('poRecvCancelledBy');
            if (cancelledByEl && po.cancelled_by && po.cancelled_by !== 'N/A' && po.cancelled_by !== null) {
                cancelledByEl.textContent = `Cancelled by: ${po.cancelled_by}`;
                cancelledByEl.style.display = 'block';
            } else if (cancelledByEl) {
                cancelledByEl.style.display = 'none';
            }

            // Show Created By in the receiving modal title for quick context
            const modalTitle = document.getElementById('poReceivingModalLabel');
            if (modalTitle) {
                modalTitle.textContent = `Purchase Order & Receiving${po.created_by ? ` — Created by: ${po.created_by}` : ''}`;
            }

            document.getElementById('poRecvPoId').value = po.id;
            document.getElementById('poRecvSupplierId').value = po.supplier_id;

            // Default receiving header
            document.getElementById('poRecvDate').value = this.getLocalDateString();
            document.getElementById('poRecvRR').value = '';
            document.getElementById('poRecvDR').value = '';
            document.getElementById('poRecvDiscount').value = '0';
            document.getElementById('poRecvRemarks').value = '';

            // Warehouses
            const whSelect = document.getElementById('poRecvWarehouse');
            if (whSelect) {
                whSelect.innerHTML = '<option value="">Select Warehouse</option>';
                if (whResponse.success && Array.isArray(whResponse.data)) {
                    whResponse.data.forEach(w => {
                        whSelect.innerHTML += `<option value="${w.id}">${w.name}</option>`;
                    });
                }
            }

            // Items
            const tbody = document.getElementById('poRecvItemsBody');
            if (tbody) {
                tbody.innerHTML = (po.items || []).map(item => {
                    const ordered = item.quantity_ordered || 0;
                    const receivedSoFar = item.quantity_received_total || 0;
                    const remaining = item.quantity_remaining != null
                        ? item.quantity_remaining
                        : Math.max(ordered - receivedSoFar, 0);
                    const unitCost = item.unit_cost || 0;
                    const defaultQtyToReceive = remaining > 0 ? remaining : 0;
                    const disabledAttr = remaining <= 0 ? 'disabled' : '';
                    const lineTotal = defaultQtyToReceive * unitCost;

                    return `
                        <tr data-item-id="${item.item_id}">
                            <td>${item.item_name}</td>
                            <td class="text-center">${ordered}</td>
                            <td class="text-center">${this.formatNumber(receivedSoFar)}</td>
                            <td class="text-center">${this.formatNumber(remaining)}</td>
                            <td class="text-center" style="max-width: 120px;">
                                <input type="number" class="form-control form-control-sm text-center po-recv-qty" min="0" value="${defaultQtyToReceive}" ${disabledAttr}>
                            </td>
                            <td class="text-end" style="max-width: 150px;">
                                <input type="number" class="form-control form-control-sm text-end po-recv-cost" step="0.01" min="0" value="${unitCost}" ${disabledAttr}>
                            </td>
                            <td class="text-end fw-semibold po-recv-line-total">₱${this.formatNumber(lineTotal)}</td>
                        </tr>
                    `;
                }).join('');
            }

            this.updateReceivingTotalPO();

            // Check if PO is complete or cancelled and disable receiving form
            const isComplete = po.status_name === 'COMPLETED' || 
                               po.status_name === 'RECEIVING_COMPLETE' ||
                               po.status_name_display === 'COMPLETE';
            const isCancelled = po.status_name === 'CANCELLED' || 
                               po.status_name_display === 'CANCELLED' ||
                               po.status_class === 'cancelled';
            this.setReceivingModalEditable(!isComplete && !isCancelled);

            // History
            const historyContainer = document.getElementById('poRecvHistory');
            if (historyContainer) {
                const history = po.receiving_history || [];
                if (!history.length) {
                    historyContainer.innerHTML = '<p class="mb-0">No receiving transactions yet for this purchase order.</p>';
                } else {
                    historyContainer.innerHTML = `
                        <div class="table-responsive">
                            <table class="table table-sm mb-0">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>RR No.</th>
                                        <th>DR No.</th>
                                        <th>Warehouse</th>
                                        <th>Received By</th>
                                        <th class="text-end">Total (With Discount)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(h => `
                                        <tr>
                                            <td>${this.formatDate(h.receiving_date || h.receiving_created_at)}</td>
                                            <td>${h.receiving_rr_number}</td>
                                            <td>${h.receiving_dr_number}</td>
                                            <td>${h.warehouse_name}</td>
                                            <td>${h.received_by || 'N/A'}</td>
                                            <td class="text-end">₱${this.formatNumber(h.receiving_total_with_discount)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }

            this.receivingModal.show();
        } catch (e) {
            console.error('Error loading receiving data:', e);
            Swal.fire('Error', 'Failed to load receiving data.', 'error');
        }
    }

    updateReceivingRowTotal(row) {
        if (!row) return;
        const qtyInput = row.querySelector('.po-recv-qty');
        const costInput = row.querySelector('.po-recv-cost');
        const totalCell = row.querySelector('.po-recv-line-total');

        const qty = parseFloat(qtyInput?.value || '0') || 0;
        const cost = parseFloat(costInput?.value || '0') || 0;
        const total = qty * cost;

        if (totalCell) {
            totalCell.textContent = '₱' + this.formatNumber(total);
        }

        this.updateReceivingTotalPO();
    }

    updateReceivingTotalPO() {
        let grandTotal = 0;
        document.querySelectorAll('#poRecvItemsBody tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.po-recv-qty')?.value || '0') || 0;
            const cost = parseFloat(row.querySelector('.po-recv-cost')?.value || '0') || 0;
            grandTotal += qty * cost;
        });

        const discountInput = document.getElementById('poRecvDiscount');
        const discount = parseFloat(discountInput?.value || '0') || 0;
        const totalAfterDiscount = Math.max(grandTotal - discount, 0);

        const totalEl = document.getElementById('poRecvTotalReceiving');
        if (totalEl) {
            totalEl.textContent = '₱' + this.formatNumber(totalAfterDiscount);
        }
    }

    async handleReceivingSubmit(e) {
        e.preventDefault();

        const saveBtn = document.getElementById('poRecvSaveBtn');
        if (!saveBtn) return;

        const poId = parseInt(document.getElementById('poRecvPoId')?.value || '0', 10);
        const supplierId = parseInt(document.getElementById('poRecvSupplierId')?.value || '0', 10);
        const rrNumber = document.getElementById('poRecvRR')?.value.trim() || '';
        const drNumber = document.getElementById('poRecvDR')?.value.trim() || '';
        const warehouseId = parseInt(document.getElementById('poRecvWarehouse')?.value || '0', 10);
        const date = document.getElementById('poRecvDate')?.value || '';
        const discount = parseFloat(document.getElementById('poRecvDiscount')?.value || '0') || 0;
        const remarks = document.getElementById('poRecvRemarks')?.value.trim() || '';

        const items = [];
        document.querySelectorAll('#poRecvItemsBody tr').forEach(row => {
            const itemId = parseInt(row.getAttribute('data-item-id') || '0', 10);
            const qty = parseFloat(row.querySelector('.po-recv-qty')?.value || '0') || 0;
            const cost = parseFloat(row.querySelector('.po-recv-cost')?.value || '0') || 0;
            if (itemId && qty > 0) {
                items.push({
                    item_id: itemId,
                    quantity_received: qty,
                    unit_cost: cost
                });
            }
        });

        if (!poId || !supplierId || !rrNumber || !drNumber || !warehouseId || !date || items.length === 0) {
            Swal.fire('Validation', 'Please complete all required receiving fields and quantities.', 'warning');
            return;
        }

        saveBtn.disabled = true;
        const btnText = saveBtn.querySelector('.btn-text');
        const spinner = saveBtn.querySelector('.spinner-border');
        if (btnText) btnText.textContent = 'Saving...';
        if (spinner) spinner.classList.remove('d-none');

        try {
            const payload = {
                po_id: poId,
                supplier_id: supplierId,
                rr_number: rrNumber,
                dr_number: drNumber,
                warehouse_id: warehouseId,
                date,
                discount,
                remarks,
                items
            };

            const response = await apiService.post('/admin/admin-receiving.php?action=create', payload);

            if (response.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Receiving Saved',
                    text: response.message || 'Receiving record has been saved.',
                    timer: 1800,
                    showConfirmButton: false
                });

                if (this.receivingModal) {
                    this.receivingModal.hide();
                }

                // refresh table so PO status reflects latest receiving
                if (this.dataTable) {
                    this.dataTable.ajax.reload(null, false);
                }
            } else {
                Swal.fire('Error', response.message || 'Failed to save receiving.', 'error');
            }
        } catch (error) {
            console.error('Receiving save error (PO page):', error);
            Swal.fire('Error', 'An error occurred while saving receiving.', 'error');
        } finally {
            saveBtn.disabled = false;
            const btnTextReset = saveBtn.querySelector('.btn-text');
            const spinnerReset = saveBtn.querySelector('.spinner-border');
            if (btnTextReset) btnTextReset.textContent = 'Save Receiving';
            if (spinnerReset) spinnerReset.classList.add('d-none');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const items = [];
        let valid = true;
        document.querySelectorAll('#itemsBody tr').forEach(row => {
            const itemId = row.querySelector('.item-select').value;
            const qty = row.querySelector('.item-qty').value;
            const cost = row.querySelector('.item-cost').value;
            if (!itemId) valid = false;
            items.push({ item_id: itemId, quantity: qty, unit_cost: cost });
        });

        if (items.length === 0) {
            Swal.fire('Error', 'Please add at least one item', 'error');
            return;
        }
        if (!valid) {
            Swal.fire('Error', 'Please select an item for all rows', 'error');
            return;
        }

        const saveBtn = document.getElementById('savePOBtn');
        saveBtn.disabled = true;
        saveBtn.querySelector('.btn-text').textContent = 'Saving...';
        saveBtn.querySelector('.spinner-border').classList.remove('d-none');

        const formData = {
            id: document.getElementById('poId').value,
            po_number: document.getElementById('poNumber').value.trim(),
            supplier_id: document.getElementById('poSupplier').value,
            status: document.getElementById('poStatus').value,
            order_date: document.getElementById('poOrderDate').value,
            delivery_date: document.getElementById('poDeliveryDate').value,
            remarks: document.getElementById('poRemarks').value.trim(),
            items: items
        };

        try {
            const action = this.isEditing ? 'update' : 'create';
            const response = await apiService.post(`/admin/admin-purchase-order.php?action=${action}`, formData);
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
            saveBtn.querySelector('.btn-text').textContent = 'Save Purchase Order';
            saveBtn.querySelector('.spinner-border').classList.add('d-none');
        }
    }

    async viewPO(id) {
        try {
            const response = await apiService.get(`/admin/admin-purchase-order.php?action=get&id=${id}`);
            if (response.success) {
                const po = response.data;
                let itemsHtml = po.items.map(i => `
                    <tr>
                        <td>${i.item_name}</td>
                        <td class="text-center">${i.quantity}</td>
                        <td class="text-end">₱${this.formatNumber(i.unit_cost)}</td>
                        <td class="text-end fw-bold">₱${this.formatNumber(i.total_cost)}</td>
                    </tr>
                `).join('');

                const statusDisplay = po.status_name_display || po.status_name || 'PENDING';
                const statusClass = po.status_class || 'pending';
                const cancelledByHtml = po.cancelled_by && po.cancelled_by !== 'N/A' && po.cancelled_by !== null 
                    ? `<div class="info-row mb-2"><span class="info-label fw-semibold text-danger">Cancelled By:</span><span class="text-danger fw-semibold">${this.escapeHtml(po.cancelled_by)}</span></div>` 
                    : '';
                
                document.getElementById('viewPOContent').innerHTML = `
                    <div class="po-header mb-3">
                        <div class="row">
                            <div class="col-md-6">
                                <h4 class="text-primary mb-2">${this.escapeHtml(po.po_number)}</h4>
                                <div class="mb-2">
                                    <span class="badge badge-status badge-${statusClass}" style="font-size: 0.9rem; padding: 0.5rem 0.75rem;">${this.escapeHtml(statusDisplay)}</span>
                                </div>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <p class="mb-1"><strong>Order Date:</strong> ${this.formatDate(po.order_date)}</p>
                                <p class="mb-1"><strong>Delivery:</strong> ${po.delivery_date ? this.formatDate(po.delivery_date) : '-'}</p>
                                <p class="mb-0"><strong>Total:</strong> <span class="text-success fw-bold">₱${this.formatNumber(po.total_cost)}</span></p>
                            </div>
                        </div>
                    </div>
                    <hr>
                    <div class="info-section">
                        <div class="info-row mb-2"><span class="info-label fw-semibold">Supplier:</span><span>${this.escapeHtml(po.supplier_name)}</span></div>
                        <div class="info-row mb-2"><span class="info-label fw-semibold">Created By:</span><span>${this.escapeHtml(po.created_by || 'N/A')}</span></div>
                        ${cancelledByHtml}
                        <div class="info-row mb-2"><span class="info-label fw-semibold">Remarks:</span><span>${this.escapeHtml(po.remarks || '-')}</span></div>
                    </div>
                    <h6 class="mt-4 mb-3">Items</h6>
                    <table class="table table-sm">
                        <thead class="table-light">
                            <tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Unit Cost</th><th class="text-end">Total</th></tr>
                        </thead>
                        <tbody>${itemsHtml}</tbody>
                        <tfoot>
                            <tr class="table-light"><td colspan="3" class="text-end fw-bold">Grand Total</td><td class="text-end fw-bold text-success">₱${this.formatNumber(po.total_cost)}</td></tr>
                        </tfoot>
                    </table>
                `;
                this.viewModal.show();
            }
        } catch (e) { Swal.fire('Error', 'Failed to load PO', 'error'); }
    }

    async confirmDelete(id, poNumber) {
        // Level 1: initial confirmation
        const first = await Swal.fire({
            title: 'Cancel Purchase Order',
            html: `Are you sure you want to <strong>cancel</strong> Purchase Order <strong>${poNumber}</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ffc107',
            confirmButtonText: 'Yes, cancel PO'
        });

        if (!first.isConfirmed) return;

        // Level 2: require typing the PO number to confirm
        const second = await Swal.fire({
            title: 'Confirm Cancellation',
            html: `Type the PO Number <strong>${poNumber}</strong> to confirm cancellation.`,
            input: 'text',
            inputPlaceholder: poNumber,
            showCancelButton: true,
            confirmButtonColor: '#ffc107',
            confirmButtonText: 'Confirm Cancel',
            preConfirm: (value) => {
                if (value.trim() !== poNumber) {
                    Swal.showValidationMessage('PO Number does not match.');
                }
                return value;
            }
        });

        if (!second.isConfirmed) return;

        try {
            const response = await apiService.post('/admin/admin-purchase-order.php?action=delete', { id }); // now acts as cancel
            if (response.success) {
                this.dataTable.ajax.reload();
                Swal.fire({ icon: 'success', title: 'Purchase Order Cancelled', text: response.message, timer: 1800, showConfirmButton: false });
            } else {
                Swal.fire('Error', response.message, 'error');
            }
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }

    formatDate(d) {
        if (!d) return '-';
        // Handle date strings (YYYY-MM-DD) without timezone conversion
        // JavaScript's new Date('YYYY-MM-DD') interprets as UTC, causing timezone issues
        if (typeof d === 'string' && d.match(/^\d{4}-\d{2}-\d{2}/)) {
            const datePart = d.split('T')[0]; // Get date part if datetime string
            const [year, month, day] = datePart.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        // Fallback for other date formats
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    /**
     * Get current local date in YYYY-MM-DD format (for date inputs)
     */
    getLocalDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatNumber(n) {
        return parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Enable/disable PO modal fields based on completion status
     */
    setPOModalEditable(editable) {
        const fields = [
            'poNumber', 'poSupplier', 'poStatus', 'poOrderDate', 'poDeliveryDate', 'poRemarks'
        ];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = !editable;
                if (!editable) {
                    el.classList.add('bg-light');
                } else {
                    el.classList.remove('bg-light');
                }
            }
        });

        // Disable items table
        const itemsBody = document.getElementById('itemsBody');
        if (itemsBody) {
            itemsBody.querySelectorAll('input, select, button').forEach(el => {
                if (!el.classList.contains('item-total')) { // Keep totals readonly
                    el.disabled = !editable;
                    if (!editable) {
                        el.classList.add('bg-light');
                    } else {
                        el.classList.remove('bg-light');
                    }
                }
            });
        }

        const addItemBtn = document.getElementById('addItemRow');
        if (addItemBtn) addItemBtn.disabled = !editable;

        const saveBtn = document.getElementById('savePOBtn');
        if (saveBtn) saveBtn.disabled = !editable;
    }

    /**
     * Enable/disable receiving modal fields based on PO completion status
     */
    setReceivingModalEditable(editable) {
        const fields = [
            'poRecvRR', 'poRecvDR', 'poRecvWarehouse', 'poRecvDate', 'poRecvDiscount', 'poRecvRemarks'
        ];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.disabled = !editable;
                if (!editable) {
                    el.classList.add('bg-light');
                } else {
                    el.classList.remove('bg-light');
                }
            }
        });

        // Disable items table inputs
        const itemsBody = document.getElementById('poRecvItemsBody');
        if (itemsBody) {
            itemsBody.querySelectorAll('input').forEach(el => {
                el.disabled = !editable;
                if (!editable) {
                    el.classList.add('bg-light');
                } else {
                    el.classList.remove('bg-light');
                }
            });
        }

        const saveBtn = document.getElementById('poRecvSaveBtn');
        if (saveBtn) saveBtn.disabled = !editable;
    }
}

export const purchaseOrderModule = new PurchaseOrderModule();
export default purchaseOrderModule;

