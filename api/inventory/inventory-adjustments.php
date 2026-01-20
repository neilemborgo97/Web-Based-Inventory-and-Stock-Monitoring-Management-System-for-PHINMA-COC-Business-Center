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

$currentUserId = intval($_SESSION['user_id'] ?? 0);
$userLevel = intval($_SESSION['user_level'] ?? 0);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listAdjustments($pdo);
        break;
    case 'get':
        getAdjustment($pdo);
        break;
    case 'create':
        createAdjustment($pdo, $currentUserId);
        break;
    case 'approve':
        approveAdjustment($pdo, $currentUserId, $userLevel);
        break;
    case 'cancel':
        cancelAdjustment($pdo, $currentUserId);
        break;
    case 'warehouses':
        getWarehouses($pdo);
        break;
    case 'items':
        getItems($pdo);
        break;
    case 'stock_level':
        getStockLevel($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function listAdjustments($pdo) {
    try {
        $status = filter_input(INPUT_GET, 'status', FILTER_SANITIZE_STRING) ?: '';
        
        $sql = "
            SELECT 
                a.adjustment_id as id,
                a.adjustment_date as adjustment_date,
                a.adjustment_type as adjustment_type,
                a.adjustment_reason as adjustment_reason,
                a.adjustment_status as adjustment_status,
                a.adjustment_remarks as adjustment_remarks,
                a.adjustment_created_at as created_at,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as created_by_name,
                CONCAT(ap.users_firstname, ' ', ap.users_lastname) as approved_by_name,
                (
                    SELECT COUNT(*)
                    FROM tblinventory_adjustment_items ai
                    WHERE ai.adjustment_items_adjustment_id = a.adjustment_id
                ) as item_count
            FROM tblinventory_adjustment a
            LEFT JOIN tbl_audit_log al ON al.table_name = 'tblinventory_adjustment' 
                AND al.record_id = a.adjustment_id 
                AND al.action_type = 'INSERT'
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            LEFT JOIN tblusers ap ON a.adjustment_approved_by = ap.users_id
            WHERE 1=1
        ";
        
        $params = [];
        
        if ($status && $status !== 'ALL') {
            $sql .= " AND a.adjustment_status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY a.adjustment_id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        error_log('List adjustments error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load adjustments']);
    }
}

function getAdjustment($pdo) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid adjustment ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                a.adjustment_id as id,
                a.adjustment_date as adjustment_date,
                a.adjustment_type as adjustment_type,
                a.adjustment_reason as adjustment_reason,
                a.adjustment_status as adjustment_status,
                a.adjustment_remarks as adjustment_remarks,
                a.adjustment_created_at as created_at,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as created_by_name,
                CONCAT(ap.users_firstname, ' ', ap.users_lastname) as approved_by_name
            FROM tblinventory_adjustment a
            LEFT JOIN tbl_audit_log al ON al.table_name = 'tblinventory_adjustment' 
                AND al.record_id = a.adjustment_id 
                AND al.action_type = 'INSERT'
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            LEFT JOIN tblusers ap ON a.adjustment_approved_by = ap.users_id
            WHERE a.adjustment_id = ?
        ");
        $stmt->execute([$id]);
        $adjustment = $stmt->fetch();
        
        if (!$adjustment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Adjustment not found']);
            return;
        }
        
        // Get items
        $itemsStmt = $pdo->prepare("
            SELECT 
                ai.adjustment_items_id as id,
                ai.adjustment_items_item_id as item_id,
                i.items_name as item_name,
                ai.adjustment_items_quantity as quantity,
                ai.adjustment_items_reason as reason,
                COALESCE(
                    (SELECT sl.stocklevels_warehouse_id 
                     FROM tblstocklevels sl 
                     WHERE sl.stocklevels_item_id = ai.adjustment_items_item_id 
                     LIMIT 1),
                    1
                ) as warehouse_id,
                COALESCE(
                    (SELECT w.warehouses_name 
                     FROM tblstocklevels sl 
                     INNER JOIN tblwarehouses w ON sl.stocklevels_warehouse_id = w.warehouses_id
                     WHERE sl.stocklevels_item_id = ai.adjustment_items_item_id 
                     LIMIT 1),
                    (SELECT warehouses_name FROM tblwarehouses WHERE warehouses_id = 1 LIMIT 1)
                ) as warehouse_name,
                COALESCE(
                    (SELECT sl.stocklevels_quantity_in_stock 
                     FROM tblstocklevels sl 
                     WHERE sl.stocklevels_item_id = ai.adjustment_items_item_id 
                     LIMIT 1),
                    0
                ) as current_stock
            FROM tblinventory_adjustment_items ai
            INNER JOIN tblitems i ON ai.adjustment_items_item_id = i.items_id
            WHERE ai.adjustment_items_adjustment_id = ?
        ");
        $itemsStmt->execute([$id]);
        $adjustment['items'] = $itemsStmt->fetchAll();
        
        echo json_encode(['success' => true, 'data' => $adjustment]);
    } catch (PDOException $e) {
        error_log('Get adjustment error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load adjustment']);
    }
}

function createAdjustment($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $adjustmentDate = sanitizeInput($input['adjustment_date'] ?? '');
    $adjustmentType = sanitizeInput($input['adjustment_type'] ?? '');
    $adjustmentReason = sanitizeInput($input['adjustment_reason'] ?? '');
    $adjustmentRemarks = sanitizeInput($input['adjustment_remarks'] ?? '');
    $items = $input['items'] ?? [];
    
    // Validation
    if (empty($adjustmentDate) || empty($adjustmentType) || empty($items)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Required fields missing']);
        return;
    }
    
    if (!in_array($adjustmentType, ['Increase', 'Decrease'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid adjustment type']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Insert adjustment header
        $stmt = $pdo->prepare("
            INSERT INTO tblinventory_adjustment (
                adjustment_date,
                adjustment_type,
                adjustment_reason,
                adjustment_status,
                adjustment_remarks
            ) VALUES (?, ?, ?, 'Pending', ?)
        ");
        
        $stmt->execute([
            $adjustmentDate,
            $adjustmentType,
            $adjustmentReason,
            $adjustmentRemarks
        ]);
        
        $adjustmentId = $pdo->lastInsertId();
        
        // Audit log
        auditLog($pdo, 'tblinventory_adjustment', $adjustmentId, 'INSERT', $currentUserId);
        
        // Insert items
        $itemStmt = $pdo->prepare("
            INSERT INTO tblinventory_adjustment_items (
                adjustment_items_adjustment_id,
                adjustment_items_item_id,
                adjustment_items_quantity,
                adjustment_items_reason
            ) VALUES (?, ?, ?, ?)
        ");
        
        foreach ($items as $item) {
            $itemId = filter_var($item['item_id'] ?? '', FILTER_VALIDATE_INT);
            $quantity = filter_var($item['quantity'] ?? 0, FILTER_VALIDATE_INT);
            $reason = sanitizeInput($item['reason'] ?? '');
            
            if (!$itemId || $quantity <= 0) {
                continue;
            }
            
            $itemStmt->execute([$adjustmentId, $itemId, $quantity, $reason]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Adjustment created successfully',
            'id' => $adjustmentId
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Create adjustment error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create adjustment']);
    }
}

function approveAdjustment($pdo, $currentUserId, $userLevel) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    // Check user level (Manager or Admin)
    if ($userLevel < 50) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied. Manager level required.']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $adjustmentId = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    
    if (!$adjustmentId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid adjustment ID']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get adjustment details
        $stmt = $pdo->prepare("
            SELECT adjustment_type, adjustment_status
            FROM tblinventory_adjustment
            WHERE adjustment_id = ?
        ");
        $stmt->execute([$adjustmentId]);
        $adjustment = $stmt->fetch();
        
        if (!$adjustment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Adjustment not found']);
            $pdo->rollBack();
            return;
        }
        
        if ($adjustment['adjustment_status'] !== 'Pending') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Adjustment is not pending']);
            $pdo->rollBack();
            return;
        }
        
        // Get adjustment items with warehouse info from stock levels
        // Note: We get the first warehouse where item has stock, or use default warehouse 1
        $itemsStmt = $pdo->prepare("
            SELECT 
                ai.adjustment_items_item_id as item_id,
                ai.adjustment_items_quantity as quantity,
                COALESCE(
                    (SELECT sl.stocklevels_warehouse_id 
                     FROM tblstocklevels sl 
                     WHERE sl.stocklevels_item_id = ai.adjustment_items_item_id 
                     LIMIT 1),
                    1
                ) as warehouse_id,
                COALESCE(
                    (SELECT sl.stocklevels_quantity_in_stock 
                     FROM tblstocklevels sl 
                     WHERE sl.stocklevels_item_id = ai.adjustment_items_item_id 
                     LIMIT 1),
                    0
                ) as current_stock
            FROM tblinventory_adjustment_items ai
            WHERE ai.adjustment_items_adjustment_id = ?
        ");
        $itemsStmt->execute([$adjustmentId]);
        $items = $itemsStmt->fetchAll();
        
        // Update stock levels
        $checkStockStmt = $pdo->prepare("
            SELECT stocklevels_id, stocklevels_quantity_in_stock
            FROM tblstocklevels
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        $insertStockStmt = $pdo->prepare("
            INSERT INTO tblstocklevels (
                stocklevels_item_id,
                stocklevels_warehouse_id,
                stocklevels_quantity_in_stock
            ) VALUES (?, ?, ?)
        ");
        
        $updateStockStmt = $pdo->prepare("
            UPDATE tblstocklevels
            SET stocklevels_quantity_in_stock = stocklevels_quantity_in_stock + ?
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        foreach ($items as $item) {
            $itemId = $item['item_id'];
            $quantity = intval($item['quantity']);
            $warehouseId = intval($item['warehouse_id'] ?? 1); // Use warehouse from stock or default to 1
            
            // Check if stock level exists
            $checkStockStmt->execute([$itemId, $warehouseId]);
            $existingStock = $checkStockStmt->fetch();
            
            $adjustmentQty = $adjustment['adjustment_type'] === 'Increase' ? $quantity : -$quantity;
            
            if ($existingStock) {
                // Update existing stock
                $newQty = $existingStock['stocklevels_quantity_in_stock'] + $adjustmentQty;
                if ($newQty < 0 && $adjustment['adjustment_type'] === 'Decrease') {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Insufficient stock for decrease adjustment']);
                    return;
                }
                $updateStockStmt->execute([$adjustmentQty, $itemId, $warehouseId]);
            } else {
                // Insert new stock level (only for Increase adjustments)
                if ($adjustment['adjustment_type'] === 'Increase') {
                    $insertStockStmt->execute([$itemId, $warehouseId, $quantity]);
                } else {
                    $pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Cannot decrease stock for item with no existing stock']);
                    return;
                }
            }
        }
        
        // Update adjustment status
        $updateStmt = $pdo->prepare("
            UPDATE tblinventory_adjustment
            SET adjustment_status = 'Approved',
                adjustment_approved_by = ?
            WHERE adjustment_id = ?
        ");
        $updateStmt->execute([$currentUserId, $adjustmentId]);
        
        // Audit log
        auditLog($pdo, 'tblinventory_adjustment', $adjustmentId, 'UPDATE', $currentUserId);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Adjustment approved and stock levels updated'
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Approve adjustment error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to approve adjustment']);
    }
}

function cancelAdjustment($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $adjustmentId = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    
    if (!$adjustmentId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid adjustment ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE tblinventory_adjustment
            SET adjustment_status = 'Cancelled'
            WHERE adjustment_id = ? AND adjustment_status = 'Pending'
        ");
        $stmt->execute([$adjustmentId]);
        
        if ($stmt->rowCount() > 0) {
            auditLog($pdo, 'tblinventory_adjustment', $adjustmentId, 'UPDATE', $currentUserId);
            echo json_encode(['success' => true, 'message' => 'Adjustment cancelled']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Adjustment not found or cannot be cancelled']);
        }
    } catch (PDOException $e) {
        error_log('Cancel adjustment error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to cancel adjustment']);
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

function getStockLevel($pdo) {
    $itemId = filter_input(INPUT_GET, 'item_id', FILTER_VALIDATE_INT);
    $warehouseId = filter_input(INPUT_GET, 'warehouse_id', FILTER_VALIDATE_INT);
    
    if (!$itemId || !$warehouseId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Item ID and Warehouse ID are required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                stocklevels_id as id,
                stocklevels_quantity_in_stock as quantity_in_stock
            FROM tblstocklevels
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        $stmt->execute([$itemId, $warehouseId]);
        $stockLevel = $stmt->fetch();
        
        if ($stockLevel) {
            echo json_encode(['success' => true, 'data' => $stockLevel]);
        } else {
            echo json_encode(['success' => true, 'data' => ['id' => null, 'quantity_in_stock' => 0]]);
        }
    } catch (PDOException $e) {
        error_log('Get stock level error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load stock level']);
    }
}

function auditLog($pdo, $tableName, $recordId, $actionType, $userId) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO tbl_audit_log (table_name, record_id, action_type, user_id)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$tableName, $recordId, $actionType, intval($userId)]);
    } catch (Exception $e) {
        error_log('Audit log insert failed: ' . $e->getMessage());
    }
}

