/**
 * Admin Dashboard Module
 * Handles dashboard data loading and display
 */

import { apiService } from '../../services/services-apiServices.js';

class AdminDashboardModule {
    constructor() {
        this.stats = {
            items: 0,
            purchaseOrders: 0,
            suppliers: 0,
            warehouses: 0
        };

        this.receivingModal = null;
        this.currentPoId = null;
    }

    async init() {
        if (typeof bootstrap !== 'undefined') {
            const modalEl = document.getElementById('dashboardPOModal');
            if (modalEl) {
                this.receivingModal = new bootstrap.Modal(modalEl);
            }
        }

        this.bindEvents();
        await this.loadDashboardData();
    }

    bindEvents() {
        const tableBody = document.getElementById('recentPOTable');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const row = e.target.closest('tr[data-id]');
                if (!row) return;
                const id = row.getAttribute('data-id');
                if (id) {
                    this.openReceivingModal(parseInt(id, 10));
                }
            });
        }

        const form = document.getElementById('dashboardReceivingForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleReceivingSubmit(e));

            form.addEventListener('input', (e) => {
                if (e.target.classList.contains('dash-qty-received') || e.target.classList.contains('dash-unit-cost')) {
                    this.updateReceivingRowTotal(e.target.closest('tr'));
                }
            });
        }
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentPurchaseOrders()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadStats() {
        try {
            const response = await apiService.get('/admin/admin-dashboard.php?action=stats');

            if (response.success) {
                this.updateStatCards(response.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.updateStatCards({
                items: 0,
                purchase_orders: 0,
                suppliers: 0,
                warehouses: 0
            });
        }
    }

    updateStatCards(data) {
        const totalItems = document.getElementById('totalItems');
        const totalPO = document.getElementById('totalPO');
        const totalSuppliers = document.getElementById('totalSuppliers');
        const totalWarehouses = document.getElementById('totalWarehouses');

        if (totalItems) totalItems.textContent = data.items || 0;
        if (totalPO) totalPO.textContent = data.purchase_orders || 0;
        if (totalSuppliers) totalSuppliers.textContent = data.suppliers || 0;
        if (totalWarehouses) totalWarehouses.textContent = data.warehouses || 0;
    }

    async loadRecentPurchaseOrders() {
        const tableBody = document.getElementById('recentPOTable');
        if (!tableBody) return;

        try {
            const response = await apiService.get('/admin/admin-dashboard.php?action=recent_po');

            if (response.success && response.data.length > 0) {
                tableBody.innerHTML = response.data.map(po => `
                    <tr data-id="${po.id}">
                        <td><strong>${this.escapeHtml(po.po_number)}</strong></td>
                        <td>${this.escapeHtml(po.supplier_name)}</td>
                        <td>${this.escapeHtml(po.created_by || 'N/A')}</td>
                        <td>${this.formatDate(po.order_date)}</td>
                        <td>${po.actual_delivery_date ? this.formatDate(po.actual_delivery_date) : '-'}</td>
                        <td>₱${this.formatNumber(po.total_cost)}</td>
                        <td><span class="badge badge-status badge-${po.status_class}">${po.status_name}</span></td>
                    </tr>
                `).join('');
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4 text-muted">
                            <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                            No purchase orders found
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading recent POs:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-circle me-2"></i>
                        Failed to load data
                    </td>
                </tr>
            `;
        }
    }

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
            const poNumberEl = document.getElementById('dashPoNumber');
            const poSupplierEl = document.getElementById('dashPoSupplier');
            const poOrderDateEl = document.getElementById('dashPoOrderDate');
            const poExpectedDeliveryDateEl = document.getElementById('dashPoExpectedDeliveryDate');
            const poActualDeliveryDateEl = document.getElementById('dashPoActualDeliveryDate');
            const poTotalEl = document.getElementById('dashPoTotal');

            if (poNumberEl) poNumberEl.textContent = po.po_number;
            if (poSupplierEl) poSupplierEl.textContent = po.supplier_name || 'Supplier';
            if (poOrderDateEl) poOrderDateEl.textContent = this.formatDate(po.order_date);
            if (poExpectedDeliveryDateEl) poExpectedDeliveryDateEl.textContent = po.expected_delivery_date ? this.formatDate(po.expected_delivery_date) : '-';
            if (poActualDeliveryDateEl) poActualDeliveryDateEl.textContent = po.actual_delivery_date ? this.formatDate(po.actual_delivery_date) : '-';
            if (poTotalEl) poTotalEl.textContent = '₱' + this.formatNumber(po.total_cost);

            // Status badge
            const statusBadge = document.getElementById('dashPoStatusBadge');
            if (statusBadge) {
                const statusDisplay = po.status_name_display || po.status_name || 'PENDING';
                const statusClass = po.status_class || 'pending';
                statusBadge.textContent = statusDisplay;
                statusBadge.className = `badge badge-status badge-${statusClass} ms-2`;
                statusBadge.style.display = 'inline-block';
            }

            // Created By
            const createdByEl = document.getElementById('dashPoCreatedBy');
            if (createdByEl && po.created_by && po.created_by !== 'N/A') {
                createdByEl.textContent = `Created by: ${po.created_by}`;
                createdByEl.style.display = 'block';
            } else if (createdByEl) {
                createdByEl.style.display = 'none';
            }

            // Cancelled By
            const cancelledByEl = document.getElementById('dashPoCancelledBy');
            if (cancelledByEl && po.cancelled_by && po.cancelled_by !== 'N/A' && po.cancelled_by !== null) {
                cancelledByEl.textContent = `Cancelled by: ${po.cancelled_by}`;
                cancelledByEl.style.display = 'block';
            } else if (cancelledByEl) {
                cancelledByEl.style.display = 'none';
            }

            const poIdInput = document.getElementById('dashReceivingPoId');
            const supplierIdInput = document.getElementById('dashReceivingSupplierId');
            if (poIdInput) poIdInput.value = po.id;
            if (supplierIdInput) supplierIdInput.value = po.supplier_id;

            // Default receiving header fields
            const dateInput = document.getElementById('dashReceivingDate');
            const rrInput = document.getElementById('dashReceivingRR');
            const drInput = document.getElementById('dashReceivingDR');
            const discountInput = document.getElementById('dashReceivingDiscount');
            const remarksInput = document.getElementById('dashReceivingRemarks');

            if (dateInput) dateInput.value = this.getLocalDateString();
            if (rrInput) rrInput.value = '';
            if (drInput) drInput.value = '';
            if (discountInput) discountInput.value = '0';
            if (remarksInput) remarksInput.value = '';

            // Warehouses
            const whSelect = document.getElementById('dashReceivingWarehouse');
            if (whSelect) {
                whSelect.innerHTML = '<option value=\"\">Select Warehouse</option>';
                if (whResponse.success && Array.isArray(whResponse.data)) {
                    whResponse.data.forEach(w => {
                        whSelect.innerHTML += `<option value=\"${w.id}\">${this.escapeHtml(w.name)}</option>`;
                    });
                }
            }

            // Items with ordered / received / remaining
            const tbody = document.getElementById('dashReceivingItemsBody');
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
                        <tr data-item-id=\"${item.item_id}\">
                            <td>${this.escapeHtml(item.item_name)}</td>
                            <td class=\"text-center\">${ordered}</td>
                            <td class=\"text-center\">${this.formatNumber(receivedSoFar)}</td>
                            <td class=\"text-center\">${this.formatNumber(remaining)}</td>
                            <td class=\"text-center\" style=\"max-width: 120px;\">
                                <input type=\"number\" class=\"form-control form-control-sm text-center dash-qty-received\" min=\"0\" value=\"${defaultQtyToReceive}\" ${disabledAttr}>
                            </td>
                            <td class=\"text-end\" style=\"max-width: 150px;\">
                                <input type=\"number\" class=\"form-control form-control-sm text-end dash-unit-cost\" step=\"0.01\" min=\"0\" value=\"${unitCost}\" ${disabledAttr}>
                            </td>
                            <td class=\"text-end fw-semibold dash-line-total\">₱${this.formatNumber(lineTotal)}</td>
                        </tr>
                    `;
                }).join('');
            }

            this.updateReceivingTotal();

            // Check if PO is complete or cancelled and disable receiving form
            const isComplete = po.status_name === 'COMPLETED' || 
                               po.status_name === 'RECEIVING_COMPLETE' ||
                               po.status_name_display === 'COMPLETE';
            const isCancelled = po.status_name === 'CANCELLED' || 
                               po.status_name_display === 'CANCELLED' ||
                               po.status_class === 'cancelled';
            this.setReceivingModalEditable(!isComplete && !isCancelled);

            // Receiving history
            const historyContainer = document.getElementById('dashReceivingHistory');
            if (historyContainer) {
                const history = po.receiving_history || [];
                if (!history.length) {
                    historyContainer.innerHTML = '<p class=\"mb-0\">No receiving transactions yet for this purchase order.</p>';
                } else {
                    historyContainer.innerHTML = `
                        <div class=\"table-responsive\">
                            <table class=\"table table-sm mb-0\">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>RR No.</th>
                                        <th>DR No.</th>
                                        <th>Warehouse</th>
                                        <th>Received By</th>
                                        <th class=\"text-end\">Total (With Discount)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(h => `
                                        <tr>
                                            <td>${this.formatDate(h.receiving_date || h.receiving_created_at)}</td>
                                            <td>${this.escapeHtml(h.receiving_rr_number)}</td>
                                            <td>${this.escapeHtml(h.receiving_dr_number)}</td>
                                            <td>${this.escapeHtml(h.warehouse_name)}</td>
                                            <td>${this.escapeHtml(h.received_by || 'N/A')}</td>
                                            <td class=\"text-end\">₱${this.formatNumber(h.receiving_total_with_discount)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
            }

            this.receivingModal.show();
        } catch (error) {
            console.error('Error opening receiving modal:', error);
            Swal.fire('Error', 'Failed to load receiving data.', 'error');
        }
    }

    updateReceivingRowTotal(row) {
        if (!row) return;
        const qtyInput = row.querySelector('.dash-qty-received');
        const costInput = row.querySelector('.dash-unit-cost');
        const totalCell = row.querySelector('.dash-line-total');

        const qty = parseFloat(qtyInput?.value || '0') || 0;
        const cost = parseFloat(costInput?.value || '0') || 0;
        const total = qty * cost;

        if (totalCell) {
            totalCell.textContent = '₱' + this.formatNumber(total);
        }

        this.updateReceivingTotal();
    }

    updateReceivingTotal() {
        let grandTotal = 0;
        document.querySelectorAll('#dashReceivingItemsBody tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.dash-qty-received')?.value || '0') || 0;
            const cost = parseFloat(row.querySelector('.dash-unit-cost')?.value || '0') || 0;
            grandTotal += qty * cost;
        });

        const discountInput = document.getElementById('dashReceivingDiscount');
        const discount = parseFloat(discountInput?.value || '0') || 0;
        const totalAfterDiscount = Math.max(grandTotal - discount, 0);

        const totalEl = document.getElementById('dashReceivingTotal');
        if (totalEl) {
            totalEl.textContent = '₱' + this.formatNumber(totalAfterDiscount);
        }
    }

    async handleReceivingSubmit(e) {
        e.preventDefault();

        const saveBtn = document.getElementById('dashReceivingSaveBtn');
        if (!saveBtn) return;

        const poIdInput = document.getElementById('dashReceivingPoId');
        const supplierIdInput = document.getElementById('dashReceivingSupplierId');
        const rrInput = document.getElementById('dashReceivingRR');
        const drInput = document.getElementById('dashReceivingDR');
        const whSelect = document.getElementById('dashReceivingWarehouse');
        const dateInput = document.getElementById('dashReceivingDate');
        const discountInput = document.getElementById('dashReceivingDiscount');
        const remarksInput = document.getElementById('dashReceivingRemarks');

        const poId = parseInt(poIdInput?.value || '0', 10);
        const supplierId = parseInt(supplierIdInput?.value || '0', 10);
        const rrNumber = rrInput?.value.trim() || '';
        const drNumber = drInput?.value.trim() || '';
        const warehouseId = parseInt(whSelect?.value || '0', 10);
        const date = dateInput?.value || '';
        const discount = parseFloat(discountInput?.value || '0') || 0;
        const remarks = remarksInput?.value.trim() || '';

        const items = [];
        document.querySelectorAll('#dashReceivingItemsBody tr').forEach(row => {
            const itemId = parseInt(row.getAttribute('data-item-id') || '0', 10);
            const qty = parseFloat(row.querySelector('.dash-qty-received')?.value || '0') || 0;
            const cost = parseFloat(row.querySelector('.dash-unit-cost')?.value || '0') || 0;
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

                // Refresh recent PO list so status reflects latest receiving without page reload
                await this.loadRecentPurchaseOrders();
            } else {
                Swal.fire('Error', response.message || 'Failed to save receiving.', 'error');
            }
        } catch (error) {
            console.error('Receiving save error:', error);
            Swal.fire('Error', 'An error occurred while saving receiving.', 'error');
        } finally {
            saveBtn.disabled = false;
            const btnTextReset = saveBtn.querySelector('.btn-text');
            const spinnerReset = saveBtn.querySelector('.spinner-border');
            if (btnTextReset) btnTextReset.textContent = 'Save Receiving';
            if (spinnerReset) spinnerReset.classList.add('d-none');
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        // Handle date strings (YYYY-MM-DD) without timezone conversion
        // JavaScript's new Date('YYYY-MM-DD') interprets as UTC, causing timezone issues
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            const datePart = dateStr.split('T')[0]; // Get date part if datetime string
            const [year, month, day] = datePart.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        // Fallback for other date formats
        const date = new Date(dateStr);
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

    formatNumber(num) {
        if (!num && num !== 0) return '0.00';
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Enable/disable receiving modal fields based on PO completion status
     */
    setReceivingModalEditable(editable) {
        const fields = [
            'dashReceivingRR', 'dashReceivingDR', 'dashReceivingWarehouse', 'dashReceivingDate', 'dashReceivingDiscount', 'dashReceivingRemarks'
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
        const itemsBody = document.getElementById('dashReceivingItemsBody');
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

        const saveBtn = document.getElementById('dashReceivingSaveBtn');
        if (saveBtn) saveBtn.disabled = !editable;
    }
}

export const adminDashboardModule = new AdminDashboardModule();
export default adminDashboardModule;

