<?php
session_start();
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Check user level (Warehouse Manager, Admin, or Inventory Clerk)
if ($_SESSION['user_level'] < 10) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        getStockLevels($pdo);
        break;
    case 'get':
        getStockLevel($pdo);
        break;
    case 'warehouses':
        getWarehouses($pdo);
        break;
    case 'items':
        getItems($pdo);
        break;
    case 'low_stock':
        getLowStockItems($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getStockLevels($pdo) {
    try {
        $warehouseId = filter_input(INPUT_GET, 'warehouse_id', FILTER_VALIDATE_INT);
        $itemId = filter_input(INPUT_GET, 'item_id', FILTER_VALIDATE_INT);
        
        $sql = "
            SELECT 
                sl.stocklevels_id as id,
                sl.stocklevels_item_id as item_id,
                i.items_name as item_name,
                i.items_description as item_description,
                c.items_category_name as category_name,
                s.suppliers_name as supplier_name,
                sz.sizes_name as size_name,
                sl.stocklevels_warehouse_id as warehouse_id,
                w.warehouses_name as warehouse_name,
                sl.stocklevels_quantity_in_stock as quantity_in_stock,
                i.items_unit_cost as unit_cost,
                (sl.stocklevels_quantity_in_stock * i.items_unit_cost) as total_value
            FROM tblstocklevels sl
            INNER JOIN tblitems i ON sl.stocklevels_item_id = i.items_id
            LEFT JOIN tblitems_category c ON i.items_category_id = c.items_category_id
            LEFT JOIN tblsuppliers s ON i.items_supplier_id = s.suppliers_id
            LEFT JOIN tblsizes sz ON i.items_size_id = sz.sizes_id
            INNER JOIN tblwarehouses w ON sl.stocklevels_warehouse_id = w.warehouses_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($warehouseId) {
            $sql .= " AND sl.stocklevels_warehouse_id = ?";
            $params[] = $warehouseId;
        }
        
        if ($itemId) {
            $sql .= " AND sl.stocklevels_item_id = ?";
            $params[] = $itemId;
        }
        
        $sql .= " ORDER BY w.warehouses_name, i.items_name";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $stockLevels = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'data' => $stockLevels]);
    } catch (PDOException $e) {
        error_log('Get stock levels error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load stock levels']);
    }
}

function getStockLevel($pdo) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid stock level ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                sl.stocklevels_id as id,
                sl.stocklevels_item_id as item_id,
                i.items_name as item_name,
                sl.stocklevels_warehouse_id as warehouse_id,
                w.warehouses_name as warehouse_name,
                sl.stocklevels_quantity_in_stock as quantity_in_stock
            FROM tblstocklevels sl
            INNER JOIN tblitems i ON sl.stocklevels_item_id = i.items_id
            INNER JOIN tblwarehouses w ON sl.stocklevels_warehouse_id = w.warehouses_id
            WHERE sl.stocklevels_id = ?
        ");
        $stmt->execute([$id]);
        $stockLevel = $stmt->fetch();
        
        if ($stockLevel) {
            echo json_encode(['success' => true, 'data' => $stockLevel]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Stock level not found']);
        }
    } catch (PDOException $e) {
        error_log('Get stock level error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load stock level']);
    }
}

function getWarehouses($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                warehouses_id as id,
                warehouses_name as name
            FROM tblwarehouses
            ORDER BY warehouses_name
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
    }
}

function getItems($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                items_id as id,
                items_name as name,
                items_description as description
            FROM tblitems
            ORDER BY items_name
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
    }
}

function getLowStockItems($pdo) {
    try {
        $threshold = filter_input(INPUT_GET, 'threshold', FILTER_VALIDATE_INT) ?: 10;
        
        $stmt = $pdo->prepare("
            SELECT 
                sl.stocklevels_id as id,
                sl.stocklevels_item_id as item_id,
                i.items_name as item_name,
                c.items_category_name as category_name,
                sl.stocklevels_warehouse_id as warehouse_id,
                w.warehouses_name as warehouse_name,
                sl.stocklevels_quantity_in_stock as quantity_in_stock
            FROM tblstocklevels sl
            INNER JOIN tblitems i ON sl.stocklevels_item_id = i.items_id
            LEFT JOIN tblitems_category c ON i.items_category_id = c.items_category_id
            INNER JOIN tblwarehouses w ON sl.stocklevels_warehouse_id = w.warehouses_id
            WHERE sl.stocklevels_quantity_in_stock <= ?
            ORDER BY sl.stocklevels_quantity_in_stock ASC, w.warehouses_name, i.items_name
        ");
        $stmt->execute([$threshold]);
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        error_log('Get low stock items error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load low stock items']);
    }
}

