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
        this.bindEvents();
        await this.loadDropdownData();

        if (document.getElementById('stockTable')) {
            this.initDataTable();
        } else {
            console.error('Stock table element not found');
        }

        await this.loadStats();
    }

    bindEvents() {
        document.getElementById('warehouseFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('itemFilter')?.addEventListener('change', () => {
            this.applyFilters();
        });

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

        select.innerHTML = includeAll
            ? `<option value="">All ${elementId.includes('warehouse') ? 'Warehouses' : 'Items'}</option>`
            : '';

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }

    initDataTable() {
        if (this.dataTable) {
            this.dataTable.destroy();
        }

        this.dataTable = $('#stockTable').DataTable({
            processing: true,
            serverSide: false,
            ajax: {
                url: '../../api/inventory/inventory-stock.php?action=list',
                type: 'GET',
                dataSrc: json => json.success ? json.data : [],
                data: d => {
                    const warehouseId = document.getElementById('warehouseFilter')?.value;
                    const itemId = document.getElementById('itemFilter')?.value;
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

                // Quantity (INT)
                {
                    data: 'quantity_in_stock',
                    render: data => {
                        const qty = parseInt(data, 10) || 0;
                        const badge = qty <= 10 ? 'bg-warning' : 'bg-success';
                        return `<span class="badge ${badge}">${this.formatNumber(qty, 0)}</span>`;
                    }
                },

                // Unit Cost (DECIMAL)
                {
                    data: 'unit_cost',
                    render: data => `₱${this.formatNumber(data, 2)}`
                },

                // Total Value (INT)
                {
                    data: 'total_value',
                    render: data => `₱${this.formatNumber(Math.round(data || 0), 0)}`
                }
            ],
            order: [[0, 'desc']],
            pageLength: 25,
            language: {
                emptyTable: '<div class="text-center py-4 text-muted">No stock records found</div>',
                processing: '<div class="text-center py-4">Loading stock levels...</div>'
            }
        });
    }

    applyFilters() {
        this.dataTable?.ajax.reload();
    }

    async loadStats() {
        try {
            const response = await apiService.get('/inventory/inventory-stock.php?action=list');
            const lowStockResponse = await apiService.get('/inventory/inventory-stock.php?action=low_stock&threshold=10');

            if (!response.success) return;

            const stockLevels = response.data || [];
            const lowStockItems = lowStockResponse.success ? lowStockResponse.data : [];

            const totalStockItems = stockLevels.length;
            const lowStockCount = lowStockItems.length;
            const totalWarehouses = new Set(stockLevels.map(s => s.warehouse_id)).size;

            // TOTAL VALUE (INT)
            const totalValue = Math.round(
                stockLevels.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0)
            );

            document.getElementById('totalStockItems').textContent = this.formatNumber(totalStockItems, 0);
            document.getElementById('lowStockCount').textContent = this.formatNumber(lowStockCount, 0);
            document.getElementById('totalWarehouses').textContent = this.formatNumber(totalWarehouses, 0);
            document.getElementById('totalValue').textContent = `₱${this.formatNumber(totalValue, 0)}`;

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async showLowStockAlert() {
        try {
            const response = await apiService.get('/inventory/inventory-stock.php?action=low_stock&threshold=10');

            if (!response.success || response.data.length === 0) {
                Swal.fire('Low Stock Alert', 'No items are currently low in stock.', 'info');
                return;
            }

            const html = response.data.map(item => `
                <div class="list-group-item d-flex justify-content-between">
                    <div>
                        <strong>${this.escapeHtml(item.item_name)}</strong><br>
                        <small>${this.escapeHtml(item.warehouse_name)}</small>
                    </div>
                    <span class="badge bg-warning">${item.quantity_in_stock} units</span>
                </div>
            `).join('');

            Swal.fire({
                title: 'Low Stock Alert',
                html: `<div class="list-group">${html}</div>`,
                icon: 'warning',
                width: 600
            });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to load low stock items.', 'error');
        }
    }

    // 🔧 Universal formatter
    formatNumber(num, decimals = 2) {
        return Number(num || 0).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
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
