<?php
session_start();
header('Content-Type: application/json');
require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

$currentUserId = intval($_SESSION['user_id'] ?? 0);
setDbActorVars($pdo, $currentUserId);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list': listPO($pdo); break;
    case 'get': getPO($pdo); break;
    case 'create': createPO($pdo, $currentUserId); break;
    case 'update': updatePO($pdo, $currentUserId); break;
    case 'delete': deletePO($pdo, $currentUserId); break;
    case 'suppliers': getSuppliers($pdo); break;
    case 'items': getItemsBySupplier($pdo); break;
    default: echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

/**
 * Set MySQL session variables used by triggers (status tracking, audit helpers, etc.)
 */
function setDbActorVars($pdo, $userId)
{
    try {
        $uid = intval($userId);
        // Used by tblpurchaseorders AFTER UPDATE trigger
        $pdo->exec("SET @current_user_id = {$uid}");
        // Used by tblitems BEFORE UPDATE trigger (cost changes)
        $pdo->exec("SET @actor_user_id = {$uid}");
    } catch (Exception $e) {
        // Non-fatal; triggers may fall back to 0/system
        error_log('Failed setting DB actor vars: ' . $e->getMessage());
    }
}

/**
 * Basic audit trail into tbl_audit_log
 */
function auditLog($pdo, $tableName, $recordId, $actionType, $userId)
{
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

function listPO($pdo) {
    $stmt = $pdo->query("
        SELECT po.purchaseorders_id as id, po.purchaseorders_number as po_number,
               s.suppliers_name as supplier_name, po.purchaseorders_order_date as order_date,
               po.purchaseorders_delivery_date as expected_delivery_date,
               (
                    SELECT MAX(r.receiving_date)
                    FROM tblreceiving r
                    WHERE r.receiving_po_id = po.purchaseorders_id
               ) as actual_delivery_date,
               po.purchaseorders_total_cost as total_cost,
               ps.purchaseorders_statuses_status_name as status_name,
               COALESCE(CONCAT(u.users_firstname, ' ', u.users_lastname), 'N/A') AS created_by,
               (
                    SELECT CONCAT(u2.users_firstname, ' ', u2.users_lastname)
                    FROM tblpurchaseorders_status_update su
                    LEFT JOIN tblusers u2 ON su.purchaseorders_status_update_created_by = u2.users_id
                    WHERE su.purchaseorders_status_update_purchaseorders_id = po.purchaseorders_id
                      AND su.purchaseorders_status_update_new_status_id = 3
                    ORDER BY su.purchaseorders_status_update_created_at DESC
                    LIMIT 1
               ) AS cancelled_by,
               CASE 
                    WHEN ps.purchaseorders_statuses_status_name = 'RECEIVING_COMPLETE' THEN 'COMPLETE'
                    ELSE ps.purchaseorders_statuses_status_name
               END as status_name_display,
               CASE
                    WHEN ps.purchaseorders_statuses_status_name IN ('COMPLETED','RECEIVING_COMPLETE') THEN 'completed'
                    WHEN ps.purchaseorders_statuses_status_name = 'RECEIVING_PARTIAL' THEN 'receiving_partial'
                    WHEN ps.purchaseorders_statuses_status_name = 'APPROVED' THEN 'approved'
                    WHEN ps.purchaseorders_statuses_status_name = 'CANCELLED' THEN 'cancelled'
                    WHEN ps.purchaseorders_statuses_status_name IN ('RECEIVING_OVER') THEN 'cancelled'
                    ELSE 'pending'
               END as status_class
        FROM tblpurchaseorders po
        LEFT JOIN tblsuppliers s ON po.purchaseorders_supplier_id = s.suppliers_id
        LEFT JOIN tblpurchaseorders_statuses ps ON po.purchaseorders_status = ps.purchaseorders_statuses_status_id
        LEFT JOIN tbl_audit_log al 
            ON al.table_name = 'tblpurchaseorders'
           AND al.record_id = po.purchaseorders_id
           AND al.action_type = 'INSERT'
        LEFT JOIN tblusers u ON al.user_id = u.users_id
        ORDER BY po.purchaseorders_id DESC
    ");
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

function getPO($pdo) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    
    $stmt = $pdo->prepare("
        SELECT po.purchaseorders_id as id, po.purchaseorders_number as po_number,
               po.purchaseorders_supplier_id as supplier_id, s.suppliers_name as supplier_name,
               po.purchaseorders_order_date as order_date, 
               po.purchaseorders_delivery_date as expected_delivery_date,
               (
                    SELECT MAX(r.receiving_date)
                    FROM tblreceiving r
                    WHERE r.receiving_po_id = po.purchaseorders_id
               ) as actual_delivery_date,
               po.purchaseorders_total_cost as total_cost, po.purchaseorders_status as status,
               po.purchaseorders_remarks as remarks,
               ps.purchaseorders_statuses_status_name as status_name,
               COALESCE(CONCAT(u.users_firstname, ' ', u.users_lastname), 'N/A') AS created_by,
               (
                    SELECT CONCAT(u2.users_firstname, ' ', u2.users_lastname)
                    FROM tblpurchaseorders_status_update su
                    LEFT JOIN tblusers u2 ON su.purchaseorders_status_update_created_by = u2.users_id
                    WHERE su.purchaseorders_status_update_purchaseorders_id = po.purchaseorders_id
                      AND su.purchaseorders_status_update_new_status_id = 3
                    ORDER BY su.purchaseorders_status_update_created_at DESC
                    LIMIT 1
               ) AS cancelled_by,
               CASE 
                    WHEN ps.purchaseorders_statuses_status_name = 'RECEIVING_COMPLETE' THEN 'COMPLETE'
                    ELSE ps.purchaseorders_statuses_status_name
               END as status_name_display,
               CASE
                    WHEN ps.purchaseorders_statuses_status_name IN ('COMPLETED','RECEIVING_COMPLETE') THEN 'completed'
                    WHEN ps.purchaseorders_statuses_status_name = 'RECEIVING_PARTIAL' THEN 'receiving_partial'
                    WHEN ps.purchaseorders_statuses_status_name = 'APPROVED' THEN 'approved'
                    WHEN ps.purchaseorders_statuses_status_name = 'CANCELLED' THEN 'cancelled'
                    WHEN ps.purchaseorders_statuses_status_name IN ('RECEIVING_OVER') THEN 'cancelled'
                    ELSE 'pending'
               END as status_class
        FROM tblpurchaseorders po
        LEFT JOIN tblsuppliers s ON po.purchaseorders_supplier_id = s.suppliers_id
        LEFT JOIN tblpurchaseorders_statuses ps ON po.purchaseorders_status = ps.purchaseorders_statuses_status_id
        LEFT JOIN tbl_audit_log al 
            ON al.table_name = 'tblpurchaseorders'
           AND al.record_id = po.purchaseorders_id
           AND al.action_type = 'INSERT'
        LEFT JOIN tblusers u ON al.user_id = u.users_id
        WHERE po.purchaseorders_id = ?
    ");
    $stmt->execute([$id]);
    $po = $stmt->fetch();

    if (!$po) {
        echo json_encode(['success' => false, 'message' => 'PO not found']);
        return;
    }

    $itemsStmt = $pdo->prepare("
        SELECT poi.purchaseorder_items_item_id as item_id, i.items_name as item_name,
               poi.purchaseorder_items_quantity_ordered as quantity,
               poi.purchaseorder_items_unit_cost as unit_cost,
               poi.purchaseorder_items_total_cost as total_cost
        FROM tblpurchaseorder_items poi
        LEFT JOIN tblitems i ON poi.purchaseorder_items_item_id = i.items_id
        WHERE poi.purchaseorder_items_po_id = ?
    ");
    $itemsStmt->execute([$id]);
    $po['items'] = $itemsStmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $po]);
}

function createPO($pdo, $currentUserId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $poNumber = sanitizeInput($input['po_number'] ?? '');
    $supplierId = filter_var($input['supplier_id'] ?? '', FILTER_VALIDATE_INT);
    $status = filter_var($input['status'] ?? 1, FILTER_VALIDATE_INT);
    $orderDate = $input['order_date'] ?? '';
    $deliveryDate = $input['delivery_date'] ?? null;
    $remarks = sanitizeInput($input['remarks'] ?? '');
    $items = $input['items'] ?? [];

    if (empty($poNumber) || !$supplierId || empty($orderDate) || empty($items)) {
        echo json_encode(['success' => false, 'message' => 'Required fields missing']);
        return;
    }

    try {
        $pdo->beginTransaction();

        // ensure triggers see the right user in this txn
        setDbActorVars($pdo, $currentUserId);

        $totalCost = 0;
        foreach ($items as $item) {
            $totalCost += floatval($item['quantity']) * floatval($item['unit_cost']);
        }

        $stmt = $pdo->prepare("
            INSERT INTO tblpurchaseorders (purchaseorders_number, purchaseorders_supplier_id, purchaseorders_order_date,
                                           purchaseorders_delivery_date, purchaseorders_total_cost, purchaseorders_status, purchaseorders_remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$poNumber, $supplierId, $orderDate, $deliveryDate ?: null, $totalCost, $status, $remarks]);
        $poId = $pdo->lastInsertId();

        $itemStmt = $pdo->prepare("
            INSERT INTO tblpurchaseorder_items (purchaseorder_items_po_id, purchaseorder_items_item_id,
                                                purchaseorder_items_quantity_ordered, purchaseorder_items_unit_cost, purchaseorder_items_total_cost)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($items as $item) {
            $itemTotal = floatval($item['quantity']) * floatval($item['unit_cost']);
            $itemStmt->execute([$poId, $item['item_id'], $item['quantity'], $item['unit_cost'], $itemTotal]);
        }

        // audit trail (header only)
        auditLog($pdo, 'tblpurchaseorders', $poId, 'INSERT', $currentUserId);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Purchase Order created successfully', 'id' => $poId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Create PO error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to create PO']);
    }
}

function updatePO($pdo, $currentUserId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
    $poNumber = sanitizeInput($input['po_number'] ?? '');
    $supplierId = filter_var($input['supplier_id'] ?? '', FILTER_VALIDATE_INT);
    $status = filter_var($input['status'] ?? 1, FILTER_VALIDATE_INT);
    $orderDate = $input['order_date'] ?? '';
    $deliveryDate = $input['delivery_date'] ?? null;
    $remarks = sanitizeInput($input['remarks'] ?? '');
    $items = $input['items'] ?? [];

    if (!$id || empty($poNumber) || !$supplierId || empty($items)) {
        echo json_encode(['success' => false, 'message' => 'Required fields missing']);
        return;
    }

    try {
        $pdo->beginTransaction();
        setDbActorVars($pdo, $currentUserId);

        // Load current status to enforce edit rules
        $statusStmt = $pdo->prepare("SELECT purchaseorders_status FROM tblpurchaseorders WHERE purchaseorders_id = ? FOR UPDATE");
        $statusStmt->execute([$id]);
        $row = $statusStmt->fetch();
        if (!$row) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Purchase Order not found']);
            return;
        }

        $currentStatus = (int)$row['purchaseorders_status'];
        // Disallow edits on FINAL states
        $lockedStatuses = [2, 3, 6, 7]; // COMPLETED, CANCELLED, RECEIVING_COMPLETE, RECEIVING_OVER
        if (in_array($currentStatus, $lockedStatuses, true)) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'This Purchase Order is already completed or cancelled and can no longer be edited.']);
            return;
        }

        $totalCost = 0;
        foreach ($items as $item) {
            $totalCost += floatval($item['quantity']) * floatval($item['unit_cost']);
        }

        $stmt = $pdo->prepare("
            UPDATE tblpurchaseorders SET purchaseorders_number = ?, purchaseorders_supplier_id = ?,
                   purchaseorders_order_date = ?, purchaseorders_delivery_date = ?,
                   purchaseorders_total_cost = ?, purchaseorders_status = ?, purchaseorders_remarks = ?
            WHERE purchaseorders_id = ?
        ");
        $stmt->execute([$poNumber, $supplierId, $orderDate, $deliveryDate ?: null, $totalCost, $status, $remarks, $id]);

        // Delete existing items
        $pdo->prepare("DELETE FROM tblpurchaseorder_items WHERE purchaseorder_items_po_id = ?")->execute([$id]);

        // Insert new items
        $itemStmt = $pdo->prepare("
            INSERT INTO tblpurchaseorder_items (purchaseorder_items_po_id, purchaseorder_items_item_id,
                                                purchaseorder_items_quantity_ordered, purchaseorder_items_unit_cost, purchaseorder_items_total_cost)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($items as $item) {
            $itemTotal = floatval($item['quantity']) * floatval($item['unit_cost']);
            $itemStmt->execute([$id, $item['item_id'], $item['quantity'], $item['unit_cost'], $itemTotal]);
        }

        // audit trail (header only). Status changes are tracked by trigger in tblpurchaseorders_status_update.
        auditLog($pdo, 'tblpurchaseorders', $id, 'UPDATE', $currentUserId);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Purchase Order updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Update PO error: ' . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to update PO']);
    }
}

function deletePO($pdo, $currentUserId) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Invalid ID']);
        return;
    }

    try {
        $pdo->beginTransaction();
        setDbActorVars($pdo, $currentUserId);

        // Load current status to avoid double cancellation
        $statusStmt = $pdo->prepare("SELECT purchaseorders_status FROM tblpurchaseorders WHERE purchaseorders_id = ? FOR UPDATE");
        $statusStmt->execute([$id]);
        $row = $statusStmt->fetch();
        if (!$row) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Purchase Order not found']);
            return;
        }

        $currentStatus = (int)$row['purchaseorders_status'];
        if ($currentStatus === 3) { // CANCELLED
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Purchase Order is already cancelled.']);
            return;
        }

        // Soft-cancel: update status to CANCELLED (3)
        $stmt = $pdo->prepare("
            UPDATE tblpurchaseorders 
            SET purchaseorders_status = 3
            WHERE purchaseorders_id = ?
        ");
        $stmt->execute([$id]);

        // Audit as UPDATE (cancel)
        auditLog($pdo, 'tblpurchaseorders', $id, 'UPDATE', $currentUserId);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Purchase Order cancelled successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Failed to cancel Purchase Order']);
    }
}

function getSuppliers($pdo) {
    $stmt = $pdo->query("SELECT suppliers_id as id, suppliers_name as name FROM tblsuppliers ORDER BY suppliers_name");
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

function getItemsBySupplier($pdo) {
    $supplierId = filter_input(INPUT_GET, 'supplier_id', FILTER_VALIDATE_INT);
    
    if (!$supplierId) {
        echo json_encode(['success' => true, 'data' => []]);
        return;
    }

    // Get items that belong to the selected supplier
    $stmt = $pdo->prepare("
        SELECT items_id as id, items_name as name, items_unit_cost as unit_cost 
        FROM tblitems 
        WHERE items_supplier_id = ?
        ORDER BY items_name
    ");
    $stmt->execute([$supplierId]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}
