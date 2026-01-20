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

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        getItems($pdo);
        break;
    case 'get':
        getItem($pdo);
        break;
    case 'create':
        createItem($pdo);
        break;
    case 'update':
        updateItem($pdo);
        break;
    case 'delete':
        deleteItem($pdo);
        break;
    case 'categories':
        getCategories($pdo);
        break;
    case 'suppliers':
        getSuppliers($pdo);
        break;
    case 'sizes':
        getSizes($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getItems($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                i.items_id as id,
                i.items_name as name,
                i.items_description as description,
                i.items_category_id as category_id,
                c.items_category_name as category_name,
                i.items_supplier_id as supplier_id,
                s.suppliers_name as supplier_name,
                i.items_size_id as size_id,
                sz.sizes_name as size_name,
                i.items_unit_cost as unit_cost,
                i.items_created_at as created_at
            FROM tblitems i
            LEFT JOIN tblitems_category c ON i.items_category_id = c.items_category_id
            LEFT JOIN tblsuppliers s ON i.items_supplier_id = s.suppliers_id
            LEFT JOIN tblsizes sz ON i.items_size_id = sz.sizes_id
            ORDER BY i.items_id DESC
        ");

        $items = $stmt->fetchAll();

        echo json_encode(['success' => true, 'data' => $items]);
    } catch (PDOException $e) {
        error_log('Get items error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load items']);
    }
}

function getItem($pdo) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid item ID']);
        return;
    }

    try {
        $stmt = $pdo->prepare("
            SELECT 
                items_id as id,
                items_name as name,
                items_description as description,
                items_category_id as category_id,
                items_supplier_id as supplier_id,
                items_size_id as size_id,
                items_unit_cost as unit_cost
            FROM tblitems
            WHERE items_id = ?
        ");
        $stmt->execute([$id]);
        $item = $stmt->fetch();

        if ($item) {
            echo json_encode(['success' => true, 'data' => $item]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Item not found']);
        }
    } catch (PDOException $e) {
        error_log('Get item error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load item']);
    }
}

function createItem($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $name = sanitizeInput($input['name'] ?? '');
    $categoryId = filter_var($input['category_id'] ?? '', FILTER_VALIDATE_INT);
    $supplierId = filter_var($input['supplier_id'] ?? '', FILTER_VALIDATE_INT);
    $sizeId = !empty($input['size_id']) ? filter_var($input['size_id'], FILTER_VALIDATE_INT) : null;
    $unitCost = filter_var($input['unit_cost'] ?? 0, FILTER_VALIDATE_FLOAT);
    $description = sanitizeInput($input['description'] ?? '');

    // Validation
    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Item name is required']);
        return;
    }

    if (!$categoryId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Category is required']);
        return;
    }

    if (!$supplierId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Supplier is required']);
        return;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO tblitems (items_name, items_description, items_category_id, items_supplier_id, items_size_id, items_unit_cost)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([$name, $description, $categoryId, $supplierId, $sizeId, $unitCost]);

        echo json_encode([
            'success' => true,
            'message' => 'Item created successfully',
            'id' => $pdo->lastInsertId()
        ]);
    } catch (PDOException $e) {
        error_log('Create item error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create item']);
    }
}

function updateItem($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);

    $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    $name = sanitizeInput($input['name'] ?? '');
    $categoryId = filter_var($input['category_id'] ?? '', FILTER_VALIDATE_INT);
    $supplierId = filter_var($input['supplier_id'] ?? '', FILTER_VALIDATE_INT);
    $sizeId = !empty($input['size_id']) ? filter_var($input['size_id'], FILTER_VALIDATE_INT) : null;
    $unitCost = filter_var($input['unit_cost'] ?? 0, FILTER_VALIDATE_FLOAT);
    $description = sanitizeInput($input['description'] ?? '');

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid item ID']);
        return;
    }

    if (empty($name)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Item name is required']);
        return;
    }

    try {
        $stmt = $pdo->prepare("
            UPDATE tblitems 
            SET items_name = ?, items_description = ?, items_category_id = ?, 
                items_supplier_id = ?, items_size_id = ?, items_unit_cost = ?
            WHERE items_id = ?
        ");

        $stmt->execute([$name, $description, $categoryId, $supplierId, $sizeId, $unitCost, $id]);

        echo json_encode(['success' => true, 'message' => 'Item updated successfully']);
    } catch (PDOException $e) {
        error_log('Update item error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to update item']);
    }
}

function deleteItem($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid item ID']);
        return;
    }

    try {
        // Check if item is used in purchase orders
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM tblpurchaseorder_items WHERE purchaseorder_items_item_id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->fetchColumn() > 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Cannot delete item. It is used in purchase orders.']);
            return;
        }

        $stmt = $pdo->prepare("DELETE FROM tblitems WHERE items_id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Item deleted successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Item not found']);
        }
    } catch (PDOException $e) {
        error_log('Delete item error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to delete item. It may be referenced by other records.']);
    }
}

function getCategories($pdo) {
    try {
        $stmt = $pdo->query("SELECT items_category_id as id, items_category_name as name FROM tblitems_category ORDER BY items_category_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
    }
}

function getSuppliers($pdo) {
    try {
        $stmt = $pdo->query("SELECT suppliers_id as id, suppliers_name as name FROM tblsuppliers ORDER BY suppliers_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
    }
}

function getSizes($pdo) {
    try {
        $stmt = $pdo->query("SELECT sizes_id as id, sizes_name as name FROM tblsizes ORDER BY sizes_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
    }
}

