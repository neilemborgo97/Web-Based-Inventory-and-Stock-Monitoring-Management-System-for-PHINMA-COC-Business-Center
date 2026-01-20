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
        listTransfers($pdo);
        break;
    case 'get':
        getTransfer($pdo);
        break;
    case 'create':
        createTransfer($pdo, $currentUserId);
        break;
    case 'complete':
        completeTransfer($pdo, $currentUserId);
        break;
    case 'cancel':
        cancelTransfer($pdo, $currentUserId);
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

function listTransfers($pdo) {
    try {
        $status = filter_input(INPUT_GET, 'status', FILTER_SANITIZE_STRING) ?: '';
        
        $sql = "
            SELECT 
                t.transfer_id as id,
                t.transfer_date as transfer_date,
                ws.warehouses_name as source_warehouse_name,
                wd.warehouses_name as destination_warehouse_name,
                t.transfer_total_items as total_items,
                t.transfer_status as transfer_status,
                t.transfer_remarks as transfer_remarks,
                t.transfer_created_at as created_at,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as created_by_name,
                (
                    SELECT COUNT(*)
                    FROM tblinventory_transfer_items ti
                    WHERE ti.transfer_items_transfer_id = t.transfer_id
                ) as item_count
            FROM tblinventory_transfer t
            LEFT JOIN tblwarehouses ws ON t.transfer_source_warehouse_id = ws.warehouses_id
            LEFT JOIN tblwarehouses wd ON t.transfer_destination_warehouse_id = wd.warehouses_id
            LEFT JOIN tbl_audit_log al ON al.table_name = 'tblinventory_transfer' 
                AND al.record_id = t.transfer_id 
                AND al.action_type = 'INSERT'
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            WHERE 1=1
        ";
        
        $params = [];
        if ($status && $status !== 'ALL') {
            $sql .= " AND t.transfer_status = ?";
            $params[] = $status;
        }
        
        $sql .= " ORDER BY t.transfer_id DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        error_log('List transfers error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load transfers']);
    }
}

function getTransfer($pdo) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid transfer ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                t.transfer_id as id,
                t.transfer_date as transfer_date,
                t.transfer_source_warehouse_id as source_warehouse_id,
                ws.warehouses_name as source_warehouse_name,
                t.transfer_destination_warehouse_id as destination_warehouse_id,
                wd.warehouses_name as destination_warehouse_name,
                t.transfer_status as transfer_status,
                t.transfer_remarks as transfer_remarks,
                t.transfer_created_at as created_at,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as created_by_name
            FROM tblinventory_transfer t
            LEFT JOIN tblwarehouses ws ON t.transfer_source_warehouse_id = ws.warehouses_id
            LEFT JOIN tblwarehouses wd ON t.transfer_destination_warehouse_id = wd.warehouses_id
            LEFT JOIN tbl_audit_log al ON al.table_name = 'tblinventory_transfer' 
                AND al.record_id = t.transfer_id 
                AND al.action_type = 'INSERT'
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            WHERE t.transfer_id = ?
        ");
        $stmt->execute([$id]);
        $transfer = $stmt->fetch();
        
        if (!$transfer) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Transfer not found']);
            return;
        }
        
        // Get items
        $itemsStmt = $pdo->prepare("
            SELECT 
                ti.transfer_items_id as id,
                ti.transfer_items_item_id as item_id,
                i.items_name as item_name,
                ti.transfer_items_quantity as quantity,
                ti.transfer_items_remarks as remarks,
                sl.stocklevels_quantity_in_stock as source_stock
            FROM tblinventory_transfer_items ti
            INNER JOIN tblitems i ON ti.transfer_items_item_id = i.items_id
            LEFT JOIN tblstocklevels sl ON sl.stocklevels_item_id = i.items_id 
                AND sl.stocklevels_warehouse_id = ?
            WHERE ti.transfer_items_transfer_id = ?
        ");
        $itemsStmt->execute([$transfer['source_warehouse_id'], $id]);
        $transfer['items'] = $itemsStmt->fetchAll();
        
        echo json_encode(['success' => true, 'data' => $transfer]);
    } catch (PDOException $e) {
        error_log('Get transfer error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load transfer']);
    }
}

function createTransfer($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $transferDate = sanitizeInput($input['transfer_date'] ?? '');
    $sourceWarehouseId = filter_var($input['source_warehouse_id'] ?? '', FILTER_VALIDATE_INT);
    $destinationWarehouseId = filter_var($input['destination_warehouse_id'] ?? '', FILTER_VALIDATE_INT);
    $transferRemarks = sanitizeInput($input['transfer_remarks'] ?? '');
    $items = $input['items'] ?? [];
    
    if (empty($transferDate) || !$sourceWarehouseId || !$destinationWarehouseId || empty($items)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Required fields missing']);
        return;
    }
    
    if ($sourceWarehouseId === $destinationWarehouseId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Source and destination warehouses cannot be the same']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Calculate total items
        $totalItems = 0;
        foreach ($items as $item) {
            $totalItems += intval($item['quantity'] ?? 0);
        }
        
        // Insert transfer header
        $stmt = $pdo->prepare("
            INSERT INTO tblinventory_transfer (
                transfer_source_warehouse_id,
                transfer_destination_warehouse_id,
                transfer_date,
                transfer_total_items,
                transfer_status,
                transfer_remarks
            ) VALUES (?, ?, ?, ?, 'Pending', ?)
        ");
        
        $stmt->execute([
            $sourceWarehouseId,
            $destinationWarehouseId,
            $transferDate,
            $totalItems,
            $transferRemarks
        ]);
        
        $transferId = $pdo->lastInsertId();
        
        // Audit log
        auditLog($pdo, 'tblinventory_transfer', $transferId, 'INSERT', $currentUserId);
        
        // Insert items
        $itemStmt = $pdo->prepare("
            INSERT INTO tblinventory_transfer_items (
                transfer_items_transfer_id,
                transfer_items_item_id,
                transfer_items_quantity,
                transfer_items_remarks
            ) VALUES (?, ?, ?, ?)
        ");
        
        foreach ($items as $item) {
            $itemId = filter_var($item['item_id'] ?? '', FILTER_VALIDATE_INT);
            $quantity = filter_var($item['quantity'] ?? 0, FILTER_VALIDATE_INT);
            $remarks = sanitizeInput($item['remarks'] ?? '');
            
            if (!$itemId || $quantity <= 0) {
                continue;
            }
            
            $itemStmt->execute([$transferId, $itemId, $quantity, $remarks]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Transfer created successfully',
            'id' => $transferId
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Create transfer error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create transfer']);
    }
}

function completeTransfer($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $transferId = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    
    if (!$transferId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid transfer ID']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get transfer details
        $stmt = $pdo->prepare("
            SELECT transfer_status, transfer_source_warehouse_id, transfer_destination_warehouse_id
            FROM tblinventory_transfer
            WHERE transfer_id = ?
        ");
        $stmt->execute([$transferId]);
        $transfer = $stmt->fetch();
        
        if (!$transfer || $transfer['transfer_status'] !== 'Pending') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Transfer is not pending']);
            $pdo->rollBack();
            return;
        }
        
        // Get transfer items
        $itemsStmt = $pdo->prepare("
            SELECT transfer_items_item_id as item_id, transfer_items_quantity as quantity
            FROM tblinventory_transfer_items
            WHERE transfer_items_transfer_id = ?
        ");
        $itemsStmt->execute([$transferId]);
        $items = $itemsStmt->fetchAll();
        
        // Update stock levels: decrease source, increase destination
        $checkStockStmt = $pdo->prepare("
            SELECT stocklevels_id, stocklevels_quantity_in_stock
            FROM tblstocklevels
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        $updateSourceStmt = $pdo->prepare("
            UPDATE tblstocklevels
            SET stocklevels_quantity_in_stock = stocklevels_quantity_in_stock - ?
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        $insertDestStmt = $pdo->prepare("
            INSERT INTO tblstocklevels (
                stocklevels_item_id,
                stocklevels_warehouse_id,
                stocklevels_quantity_in_stock
            ) VALUES (?, ?, ?)
        ");
        
        $updateDestStmt = $pdo->prepare("
            UPDATE tblstocklevels
            SET stocklevels_quantity_in_stock = stocklevels_quantity_in_stock + ?
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        
        foreach ($items as $item) {
            $itemId = $item['item_id'];
            $quantity = intval($item['quantity']);
            $sourceWarehouseId = $transfer['transfer_source_warehouse_id'];
            $destWarehouseId = $transfer['transfer_destination_warehouse_id'];
            
            // Check source stock
            $checkStockStmt->execute([$itemId, $sourceWarehouseId]);
            $sourceStock = $checkStockStmt->fetch();
            
            if (!$sourceStock || $sourceStock['stocklevels_quantity_in_stock'] < $quantity) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Insufficient stock in source warehouse']);
                return;
            }
            
            // Decrease source stock
            $updateSourceStmt->execute([$quantity, $itemId, $sourceWarehouseId]);
            
            // Check destination stock
            $checkStockStmt->execute([$itemId, $destWarehouseId]);
            $destStock = $checkStockStmt->fetch();
            
            if ($destStock) {
                // Update existing destination stock
                $updateDestStmt->execute([$quantity, $itemId, $destWarehouseId]);
            } else {
                // Insert new destination stock
                $insertDestStmt->execute([$itemId, $destWarehouseId, $quantity]);
            }
        }
        
        // Update transfer status
        $updateStmt = $pdo->prepare("
            UPDATE tblinventory_transfer
            SET transfer_status = 'Completed'
            WHERE transfer_id = ?
        ");
        $updateStmt->execute([$transferId]);
        
        auditLog($pdo, 'tblinventory_transfer', $transferId, 'UPDATE', $currentUserId);
        
        $pdo->commit();
        
        echo json_encode(['success' => true, 'message' => 'Transfer completed successfully']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Complete transfer error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to complete transfer']);
    }
}

function cancelTransfer($pdo, $currentUserId) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $transferId = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    
    if (!$transferId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid transfer ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            UPDATE tblinventory_transfer
            SET transfer_status = 'Cancelled'
            WHERE transfer_id = ? AND transfer_status = 'Pending'
        ");
        $stmt->execute([$transferId]);
        
        if ($stmt->rowCount() > 0) {
            auditLog($pdo, 'tblinventory_transfer', $transferId, 'UPDATE', $currentUserId);
            echo json_encode(['success' => true, 'message' => 'Transfer cancelled']);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Transfer not found or cannot be cancelled']);
        }
    } catch (PDOException $e) {
        error_log('Cancel transfer error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to cancel transfer']);
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

function getItems($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT items_id as id, items_name as name
            FROM tblitems ORDER BY items_name
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
            SELECT stocklevels_quantity_in_stock as quantity_in_stock
            FROM tblstocklevels
            WHERE stocklevels_item_id = ? AND stocklevels_warehouse_id = ?
        ");
        $stmt->execute([$itemId, $warehouseId]);
        $stockLevel = $stmt->fetch();
        
        echo json_encode(['success' => true, 'data' => ['quantity_in_stock' => $stockLevel ? $stockLevel['quantity_in_stock'] : 0]]);
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

