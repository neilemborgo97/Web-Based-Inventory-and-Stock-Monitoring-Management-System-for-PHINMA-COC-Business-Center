<?php
session_start();
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUserId = intval($_SESSION['user_id'] ?? 0);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        listReturns($pdo);
        break;
    case 'get':
        getReturn($pdo);
        break;
    case 'create':
        createReturn($pdo, $currentUserId);
        break;
    case 'complete':
        completeReturn($pdo, $currentUserId);
        break;
    case 'cancel':
        cancelReturn($pdo, $currentUserId);
        break;
    case 'purchase_orders':
        getPurchaseOrders($pdo);
        break;
    case 'po_items':
        getPOItems($pdo);
        break;
    case 'warehouses':
        getWarehouses($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function listReturns($pdo) {
    try {
        $status = filter_input(INPUT_GET, 'status', FILTER_SANITIZE_STRING) ?: '';
        
        $sql = "
            SELECT 
                pr.purchasereturns_id as id,
                pr.purchasereturns_return_date as return_date,
                po.purchaseorders_number as po_number,
                s.suppliers_name as supplier_name,
                w.warehouses_name as warehouse_name,
                pr.purchasereturns_total_items as total_items,
                pr.purchasereturns_total_amount as total_amount,
                pr.purchasereturns_status as return_status,
                pr.purchasereturns_created_at as created_at,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as created_by_name,
                (
                    SELECT COUNT(*)
                    FROM tblpurchasereturns_items pri
                    WHERE pri.purchasereturns_items_return_id = pr.purchasereturns_id
                ) as item_count
            FROM tblpurchasereturns pr
            LEFT JOIN tblpurchaseorders po ON pr.purchasereturns_po_id = po.purchaseorders_id
            LEFT JOIN tblsuppliers s ON pr.purchasereturns_supplier_id = s.suppliers_id
            LEFT JOIN tblwarehouses w ON pr.purchasereturns_warehouse_id = w.warehouses_id
            LEFT JOIN tbl_audit_log al ON al.table_name = 'tblpurchasereturns' 
                AND al.record_id = pr.purchasereturns_id 
                AND al.action_type = 'INSERT'
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            WHERE 1=1
        ";
        
        $params = [];
        if ($status && $status !== 'ALL') {
            $sql .= " AND pr.purchasereturns_status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY pr.purchasereturns_id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        error_log('List returns error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load returns']);
    }
}

function getReturn($pdo) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid return ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                pr.purchasereturns_id as id,
                pr.purchasereturns_po_id as po_id,
                po.purchaseorders_number as po_number,
                pr.purchasereturns_supplier_id as supplier_id,
                s.suppliers_name as supplier_name,
                pr.purchasereturns_warehouse_id as warehouse_id,
                w.warehouses_name as warehouse_name,
                pr.purchasereturns_return_date as return_date,
                pr.purchasereturns_return_reason as return_reason,
                pr.purchasereturns_total_amount as total_amount,
                pr.purchasereturns_status as return_status,
                pr.purchasereturns_remarks as remarks,
                pr.purchasereturns_created_at as created_at,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as created_by_name,
                pr.purchasereturns_created_at as created_at_formatted
            FROM tblpurchasereturns pr
            LEFT JOIN tblpurchaseorders po ON pr.purchasereturns_po_id = po.purchaseorders_id
            LEFT JOIN tblsuppliers s ON pr.purchasereturns_supplier_id = s.suppliers_id
            LEFT JOIN tblwarehouses w ON pr.purchasereturns_warehouse_id = w.warehouses_id
            LEFT JOIN tbl_audit_log al ON al.table_name = 'tblpurchasereturns' 
                AND al.record_id = pr.purchasereturns_id 
                AND al.action_type = 'INSERT'
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            WHERE pr.purchasereturns_id = ?
        ");
        $stmt->execute([$id]);
        $return = $stmt->fetch();
        
        if (!$return) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Return not found']);
            return;
        }
        
        // Get items
        $itemsStmt = $pdo->prepare("
            SELECT 
                pri.purchasereturns_items_id as id,
                pri.purchasereturns_items_item_id as item_id,
                i.items_name as item_name,
                pri.purchasereturns_items_quantity as quantity,
                pri.purchasereturns_items_unit_cost as unit_cost,
                pri.purchasereturns_items_total_cost as total_cost,
                pri.purchasereturns_items_reason as reason
            FROM tblpurchasereturns_items pri
            INNER JOIN tblitems i ON pri.purchasereturns_items_item_id = i.items_id
            WHERE pri.purchasereturns_items_return_id = ?
        ");
        $itemsStmt->execute([$id]);
        $return['items'] = $itemsStmt->fetchAll();
        
        echo json_encode(['success' => true, 'data' => $return]);
    } catch (PDOException $e) {
        error_log('Get return error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load return']);
    }
}

function createReturn($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $poId = filter_var($input['po_id'] ?? '', FILTER_VALIDATE_INT);
    $returnDate = sanitizeInput($input['return_date'] ?? '');
    $returnReason = sanitizeInput($input['return_reason'] ?? '');
    $warehouseId = filter_var($input['warehouse_id'] ?? '', FILTER_VALIDATE_INT);
    $remarks = sanitizeInput($input['remarks'] ?? '');
    $items = $input['items'] ?? [];
    
    if (!$poId || empty($returnDate) || empty($returnReason) || !$warehouseId || empty($items)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Required fields missing']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get PO details for supplier
        $poStmt = $pdo->prepare("
            SELECT purchaseorders_supplier_id as supplier_id
            FROM tblpurchaseorders
            WHERE purchaseorders_id = ?
        ");
        $poStmt->execute([$poId]);
        $po = $poStmt->fetch();
        
        if (!$po) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Purchase order not found']);
            $pdo->rollBack();
            return;
        }
        
        // Calculate totals
        $totalItems = 0;
        $totalAmount = 0;
        foreach ($items as $item) {
            $qty = intval($item['quantity'] ?? 0);
            $cost = floatval($item['unit_cost'] ?? 0);
            $totalItems += $qty;
            $totalAmount += ($qty * $cost);
        }
        
        // Insert return header
        $stmt = $pdo->prepare("
            INSERT INTO tblpurchasereturns (
                purchasereturns_po_id,
                purchasereturns_supplier_id,
                purchasereturns_warehouse_id,
                purchasereturns_return_date,
                purchasereturns_return_reason,
                purchasereturns_total_items,
                purchasereturns_total_amount,
                purchasereturns_status,
                purchasereturns_remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        ");
        
        $stmt->execute([
            $poId,
            $po['supplier_id'],
            $warehouseId,
            $returnDate,
            $returnReason,
            $totalItems,
            $totalAmount,
            $remarks
        ]);
        
        $returnId = $pdo->lastInsertId();
        
        // Audit log
        auditLog($pdo, 'tblpurchasereturns', $returnId, 'INSERT', $currentUserId);
        
        // Insert items
        $itemStmt = $pdo->prepare("
            INSERT INTO tblpurchasereturns_items (
                purchasereturns_items_return_id,
                purchasereturns_items_item_id,
                purchasereturns_items_quantity,
                purchasereturns_items_unit_cost,
                purchasereturns_items_total_cost,
                purchasereturns_items_reason
            ) VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($items as $item) {
            $itemId = filter_var($item['item_id'] ?? '', FILTER_VALIDATE_INT);
            $quantity = filter_var($item['quantity'] ?? 0, FILTER_VALIDATE_INT);
            $unitCost = filter_var($item['unit_cost'] ?? 0, FILTER_VALIDATE_FLOAT);
            $totalCost = $quantity * $unitCost;
            $reason = sanitizeInput($item['reason'] ?? '');
            
            if (!$itemId || $quantity <= 0) {
                continue;
            }
            
            $itemStmt->execute([$returnId, $itemId, $quantity, $unitCost, $totalCost, $reason]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Purchase return created successfully',
            'id' => $returnId
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Create return error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create return']);
    }
}

function completeReturn($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $returnId = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    
    if (!$returnId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid return ID']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get return details
        $stmt = $pdo->prepare("
            SELECT purchasereturns_status, purchasereturns_warehouse_id
            FROM tblpurchasereturns
            WHERE purchasereturns_id = ?
        ");
        $stmt->execute([$returnId]);
        $return = $stmt->fetch();
        
        if (!$return || $return['purchasereturns_status'] !== 'Pending') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Return is not pending']);
            $pdo->rollBack();
            return;
        }
        
        // Get return items
        $itemsStmt = $pdo->prepare("
            SELECT purchasereturns_items_item_id as item_id, purchasereturns_items_quantity as quantity
            FROM tblpurchasereturns_items
            WHERE purchasereturns_items_return_id = ?
        ");
        $itemsStmt->execute([$returnId]);
        $items = $itemsStmt->fetchAll();
        
        // Decrease stock levels
        $checkStockStmt = $pdo->prepare("
            SELECT stocklevels_id, stocklevels_quantity_in_stock
            FROM tblstocklevels
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        $updateStockStmt = $pdo->prepare("
            UPDATE tblstocklevels
            SET stocklevels_quantity_in_stock = stocklevels_quantity_in_stock - ?
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        foreach ($items as $item) {
            $itemId = $item['item_id'];
            $quantity = intval($item['quantity']);
            $warehouseId = $return['purchasereturns_warehouse_id'];
            
            // Check stock
            $checkStockStmt->execute([$itemId, $warehouseId]);
            $stock = $checkStockStmt->fetch();
            
            if (!$stock || $stock['stocklevels_quantity_in_stock'] < $quantity) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Insufficient stock for return']);
                return;
            }
            
            // Decrease stock
            $updateStockStmt->execute([$quantity, $itemId, $warehouseId]);
        }
        
        // Update return status
        $updateStmt = $pdo->prepare("
            UPDATE tblpurchasereturns
            SET purchasereturns_status = 'Completed'
            WHERE purchasereturns_id = ?
        ");
        $updateStmt->execute([$returnId]);
        
        auditLog($pdo, 'tblpurchasereturns', $returnId, 'UPDATE', $currentUserId);
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Return completed successfully']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Complete return error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to complete return']);
    }
}

function cancelReturn($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $returnId = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    
    if (!$returnId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid return ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE tblpurchasereturns
            SET purchasereturns_status = 'Cancelled'
            WHERE purchasereturns_id = ? AND purchasereturns_status = 'Pending'
        ");
        $stmt->execute([$returnId]);
        
        if ($stmt->rowCount() > 0) {
            auditLog($pdo, 'tblpurchasereturns', $returnId, 'UPDATE', $currentUserId);
            echo json_encode(['success' => true, 'message' => 'Return cancelled']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Return not found or cannot be cancelled']);
        }
    } catch (PDOException $e) {
        error_log('Cancel return error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to cancel return']);
    }
}

function getPurchaseOrders($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                po.purchaseorders_id as id,
                po.purchaseorders_number as po_number,
                s.suppliers_name as supplier_name,
                po.purchaseorders_order_date as order_date
            FROM tblpurchaseorders po
            LEFT JOIN tblsuppliers s ON po.purchaseorders_supplier_id = s.suppliers_id
            WHERE po.purchaseorders_status IN (4, 6) -- APPROVED or RECEIVING_COMPLETE
            ORDER BY po.purchaseorders_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
    }
}

function getPOItems($pdo) {
    $poId = filter_input(INPUT_GET, 'po_id', FILTER_VALIDATE_INT);
    
    if (!$poId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'PO ID required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                poi.purchaseorder_items_item_id as item_id,
                i.items_name as item_name,
                poi.purchaseorder_items_quantity_ordered as quantity_ordered,
                poi.purchaseorder_items_unit_cost as unit_cost,
                COALESCE(SUM(ri.receiving_items_quantity_received), 0) as quantity_received
            FROM tblpurchaseorder_items poi
            INNER JOIN tblitems i ON poi.purchaseorder_items_item_id = i.items_id
            LEFT JOIN tblreceiving r ON r.receiving_po_id = poi.purchaseorder_items_po_id
            LEFT JOIN tblreceiving_items ri ON ri.receiving_items_receiving_id = r.receiving_id 
                AND ri.receiving_items_item_id = poi.purchaseorder_items_item_id
            WHERE poi.purchaseorder_items_po_id = ?
            GROUP BY poi.purchaseorder_items_item_id, i.items_name, poi.purchaseorder_items_quantity_ordered, poi.purchaseorder_items_unit_cost
        ");
        $stmt->execute([$poId]);
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        error_log('Get PO items error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load PO items']);
    }
}

function getWarehouses($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT warehouses_id as id, warehouses_name as name
            FROM tblwarehouses ORDER BY warehouses_name
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'data' => []]);
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

