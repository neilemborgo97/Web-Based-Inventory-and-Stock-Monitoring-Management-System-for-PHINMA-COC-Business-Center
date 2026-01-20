/**
 * Stock Management Module
 * Handles stock level viewing and filtering
 */

import { apiService } from '../../services/services-apiServices.js';

class StockModule {
    constructor() {
        this.dataTable = null;
        this.warehouses = [];
        this.items = [];
    }

    async init() {
        this.setupElements();
        this.bindEvents();
        await this.loadDropdownData();
        
        // Ensure table exists before initializing DataTable
        if (document.getElementById('stockTable')) {
            this.initDataTable();
        } else {
            console.error('Stock table element not found');
        }
        
        await this.loadStats();
    }

    setupElements() {
        // Elements are ready
    }

    bindEvents() {
        // Warehouse filter
        document.getElementById('warehouseFilter')?.addEventListener('change', (e) => {
            this.applyFilters();
        });

        // Item filter
        document.getElementById('itemFilter')?.addEventListener('change', (e) => {
            this.applyFilters();
        });

        // Low stock button
        document.getElementById('lowStockBtn')?.addEventListener('click', () => {
            this.showLowStockAlert();
        });
    }

    async loadDropdownData() {
        try {
            const [warehouses, items] = await Promise.all([
                apiService.get('/inventory/inventory-stock.php?action=warehouses'),
                apiService.get('/inventory/inventory-stock.php?action=items')
            ]);

            this.warehouses = warehouses.data || [];
            this.items = items.data || [];

            this.populateSelect('warehouseFilter', this.warehouses, true);
            this.populateSelect('itemFilter', this.items, true);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }

    populateSelect(elementId, data, includeAll = false) {
        const select = document.getElementById(elementId);
        if (!select) return;

        select.innerHTML = includeAll ? '<option value="">All ' + (elementId.includes('warehouse') ? 'Warehouses' : 'Items') + '</option>' : '';

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }

    initDataTable() {
        // Destroy existing DataTable if it exists
        if (this.dataTable) {
            this.dataTable.destroy();
        }

        this.dataTable = $('#stockTable').DataTable({
            processing: true,
            serverSide: false,
            ajax: {
                url: '../../api/inventory/inventory-stock.php?action=list',
                type: 'GET',
                dataSrc: (json) => {
                    console.log('DataTable response:', json);
                    if (json.success && json.data) {
                        return json.data;
                    }
                    console.error('DataTable error:', json.message || 'Unknown error');
                    return [];
                },
                error: (xhr, error, thrown) => {
                    console.error('DataTable AJAX error:', error, thrown, xhr);
                    if (xhr.status === 401) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Authentication Error',
                            text: 'Your session has expired. Please login again.',
                            confirmButtonText: 'OK'
                        }).then(() => {
                            window.location.href = '../../views/auth/login.html';
                        });
                    }
                },
                data: (d) => {
                    const warehouseId = document.getElementById('warehouseFilter')?.value || '';
                    const itemId = document.getElementById('itemFilter')?.value || '';
                    
                    if (warehouseId) d.warehouse_id = warehouseId;
                    if (itemId) d.item_id = itemId;
                }
            },
            columns: [
                { data: 'id' },
                { data: 'item_name' },
                { data: 'category_name', defaultContent: '-' },
                { data: 'supplier_name', defaultContent: '-' },
                { data: 'size_name', defaultContent: '-' },
                { data: 'warehouse_name' },
                { 
                    data: 'quantity_in_stock',
                    render: (data, type, row) => {
                        const qty = parseFloat(data) || 0;
                        const isLowStock = qty <= 10;
                        const badgeClass = isLowStock ? 'bg-warning' : 'bg-success';
                        return `<span class="badge ${badgeClass}">${this.formatNumber(qty)}</span>`;
                    }
                },
                { 
                    data: 'unit_cost',
                    render: (data) => `<span class="unit-cost">₱${this.formatNumber(data || 0)}</span>`
                },
                { 
                    data: 'total_value',
                    render: (data) => `<span class="total-value">₱${this.formatNumber(data || 0)}</span>`
                }
            ],
            order: [[0, 'desc']],
            pageLength: 25,
            language: {
                emptyTable: '<div class="text-center py-4"><i class="bi bi-inbox fs-1 text-muted"></i><p class="mt-2 text-muted">No stock records found</p></div>',
                loadingRecords: '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading stock levels...</p></div>',
                processing: '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Loading stock levels...</p></div>'
            }
        });
    }

    applyFilters() {
        if (this.dataTable) {
            this.dataTable.ajax.reload();
        }
    }

    async loadStats() {
        try {
            const response = await apiService.get('/inventory/inventory-stock.php?action=list');
            
            if (response.success && response.data) {
                const stockLevels = response.data;
                const lowStockResponse = await apiService.get('/inventory/inventory-stock.php?action=low_stock&threshold=10');
                const lowStockItems = lowStockResponse.success ? lowStockResponse.data : [];
                
                // Total stock items (unique item-warehouse combinations)
                const totalStockItems = stockLevels.length;
                
                // Low stock count
                const lowStockCount = lowStockItems.length;
                
                // Total warehouses (unique)
                const uniqueWarehouses = new Set(stockLevels.map(s => s.warehouse_id));
                const totalWarehouses = uniqueWarehouses.size;
                
                // Total stock value
                const totalValue = stockLevels.reduce((sum, item) => {
                    return sum + (parseFloat(item.total_value) || 0);
                }, 0);
                
                // Update UI
                document.getElementById('totalStockItems').textContent = this.formatNumber(totalStockItems);
                document.getElementById('lowStockCount').textContent = this.formatNumber(lowStockCount);
                document.getElementById('totalWarehouses').textContent = this.formatNumber(totalWarehouses);
                document.getElementById('totalValue').textContent = '₱' + this.formatNumber(totalValue);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async showLowStockAlert() {
        try {
            const response = await apiService.get('/inventory/inventory-stock.php?action=low_stock&threshold=10');
            
            if (response.success && response.data.length > 0) {
                let alertHtml = '<div class="list-group">';
                response.data.forEach(item => {
                    alertHtml += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-1">${this.escapeHtml(item.item_name)}</h6>
                                    <small class="text-muted">${this.escapeHtml(item.warehouse_name)}</small>
                                </div>
                                <span class="badge bg-warning">${item.quantity_in_stock} units</span>
                            </div>
                        </div>
                    `;
                });
                alertHtml += '</div>';
                
                Swal.fire({
                    title: 'Low Stock Alert',
                    html: alertHtml,
                    icon: 'warning',
                    width: '600px',
                    confirmButtonText: 'Close'
                });
            } else {
                Swal.fire({
                    title: 'Low Stock Alert',
                    text: 'No items are currently low in stock.',
                    icon: 'info',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error loading low stock items:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to load low stock items.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
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

export const stockModule = new StockModule();
export default stockModule;

