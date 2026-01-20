# Stock Management Implementation Summary

## Overview
All inventory operations now properly update `tblstocklevels` to maintain accurate stock quantities across warehouses.

## Stock Level Updates by Module

### 1. Receiving (Purchase Orders) ✅
**File:** `api/admin/admin-receiving.php`
- **When:** Items are received from suppliers
- **Action:** INCREASES stock levels
- **Logic:**
  - For each received item, checks if stock level exists for item-warehouse combination
  - If exists: Updates `stocklevels_quantity_in_stock` by adding received quantity
  - If not exists: Inserts new record with received quantity
- **Warehouse:** Uses `receiving_warehouses_id` from receiving record

### 2. Inventory Adjustments ✅
**File:** `api/inventory/inventory-adjustments.php`
- **When:** Adjustment is approved by Manager/Admin
- **Action:** 
  - INCREASES stock (if adjustment_type = 'Increase')
  - DECREASES stock (if adjustment_type = 'Decrease')
- **Logic:**
  - Gets warehouse from existing stock levels (first warehouse where item has stock)
  - If no stock exists, uses default warehouse (ID: 1)
  - Validates sufficient stock before decreasing
  - Updates or inserts stock level accordingly
- **Warehouse:** Determined from existing stock levels or defaults to warehouse 1

### 3. Inventory Transfers ✅
**File:** `api/inventory/inventory-transfers.php`
- **When:** Transfer is completed
- **Action:** 
  - DECREASES stock in source warehouse
  - INCREASES stock in destination warehouse
- **Logic:**
  - Validates sufficient stock in source warehouse
  - Decreases source warehouse stock
  - Increases destination warehouse stock (updates existing or inserts new)
- **Warehouse:** Uses `transfer_source_warehouse_id` and `transfer_destination_warehouse_id`

### 4. Purchase Returns ✅
**File:** `api/inventory/inventory-returns.php`
- **When:** Return is completed
- **Action:** DECREASES stock levels
- **Logic:**
  - Validates sufficient stock in warehouse
  - Decreases stock by returned quantity
- **Warehouse:** Uses `purchasereturns_warehouse_id` from return record

### 5. Book Issuances ⚠️ (Not Yet Implemented)
**Tables:** `tblbookissuances`, `tblbookissuance_items`
- **Should Update Stock When:**
  - Books are issued to students (status = 'Issued') → DECREASE stock
  - Books are returned by students (status = 'Returned') → INCREASE stock
- **Note:** API for book issuances not yet created. When implemented, should update stock levels.

## Stock Level Table Structure

```sql
tblstocklevels
- stocklevels_id (PK)
- stocklevels_item_id (FK to tblitems)
- stocklevels_warehouse_id (FK to tblwarehouses)
- stocklevels_quantity_in_stock (INT)
```

**Key Points:**
- One record per item-warehouse combination
- Stock is tracked per warehouse
- All operations use INSERT or UPDATE based on existence check

## Audit Trail Integration

All stock-affecting operations log to `tbl_audit_log`:
- **INSERT:** When new stock level record is created
- **UPDATE:** When stock quantity changes
- **User Tracking:** All operations record `user_id` who performed the action
- **Timestamp:** All operations record `action_date`

## Stock Level Queries

### View Stock Levels
- **API:** `api/inventory/inventory-stock.php?action=list`
- Shows all stock levels with item details, warehouse, and calculated total value

### Get Stock for Item-Warehouse
- **API:** `api/inventory/inventory-stock.php?action=get&id={stock_id}`
- Returns specific stock level record

### Low Stock Alert
- **API:** `api/inventory/inventory-stock.php?action=low_stock&threshold={number}`
- Returns items with stock ≤ threshold (default: 10)

## Data Flow

```
Purchase Order Created
    ↓
Items Received (admin-receiving.php)
    ↓
Stock Levels UPDATED (tblstocklevels) ✅
    ↓
Stock Available for:
    - Transfers (decrease source, increase destination)
    - Adjustments (increase/decrease based on type)
    - Returns (decrease when returned to supplier)
    - Book Issuances (decrease when issued, increase when returned) [Future]
```

## Validation Rules

1. **Receiving:** Always increases stock (no validation needed)
2. **Adjustments (Decrease):** Validates sufficient stock before decreasing
3. **Transfers:** Validates sufficient stock in source warehouse
4. **Returns:** Validates sufficient stock before completing return
5. **Stock cannot go negative:** All decrease operations check availability first

## Future Enhancements

1. **Book Issuances Module:**
   - Create API for book issuances
   - Update stock when books issued (decrease)
   - Update stock when books returned (increase)

2. **Stock Level History:**
   - Track stock level changes over time
   - Show stock movement history per item

3. **Reordering Points:**
   - Set minimum stock levels per item
   - Automatic alerts when stock falls below threshold

