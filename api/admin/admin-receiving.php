<?php
session_start();
header('Content-Type: application/json');
require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

// Basic auth guard
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$currentUserId = intval($_SESSION['user_id'] ?? 0);
setDbActorVars($pdo, $currentUserId);

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'po_details':
        getPODetailsForReceiving($pdo);
        break;
    case 'warehouses':
        getWarehouses($pdo);
        break;
    case 'create':
        createReceiving($pdo, $currentUserId);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

/**
 * Set MySQL session variables used by triggers (status tracking, etc.)
 */
function setDbActorVars($pdo, $userId)
{
    try {
        $uid = intval($userId);
        $pdo->exec("SET @current_user_id = {$uid}");
        $pdo->exec("SET @actor_user_id = {$uid}");
    } catch (Exception $e) {
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

/**
 * Load PO header + items for receiving
 */
function getPODetailsForReceiving($pdo)
{
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid PO ID']);
        return;
    }

    // PO header
    $stmt = $pdo->prepare("
        SELECT 
            po.purchaseorders_id AS id,
            po.purchaseorders_number AS po_number,
            po.purchaseorders_supplier_id AS supplier_id,
            s.suppliers_name AS supplier_name,
            po.purchaseorders_order_date AS order_date,
            po.purchaseorders_delivery_date AS expected_delivery_date,
            (
                SELECT MAX(r2.receiving_date)
                FROM tblreceiving r2
                WHERE r2.receiving_po_id = po.purchaseorders_id
            ) AS actual_delivery_date,
            po.purchaseorders_total_cost AS total_cost,
            ps.purchaseorders_statuses_status_name AS status_name,
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
        echo json_encode(['success' => false, 'message' => 'Purchase order not found']);
        return;
    }

    // Items (ordered)
    $itemsStmt = $pdo->prepare("
        SELECT 
            poi.purchaseorder_items_item_id AS item_id,
            i.items_name AS item_name,
            poi.purchaseorder_items_quantity_ordered AS quantity_ordered,
            poi.purchaseorder_items_unit_cost AS unit_cost,
            poi.purchaseorder_items_total_cost AS total_cost
        FROM tblpurchaseorder_items poi
        LEFT JOIN tblitems i ON poi.purchaseorder_items_item_id = i.items_id
        WHERE poi.purchaseorder_items_po_id = ?
    ");
    $itemsStmt->execute([$id]);
    $items = $itemsStmt->fetchAll();

    // Aggregate quantities already received per item for this PO
    $receivedStmt = $pdo->prepare("
        SELECT 
            ri.receiving_items_item_id AS item_id,
            SUM(ri.receiving_items_quantity_received) AS qty_received
        FROM tblreceiving r
        INNER JOIN tblreceiving_items ri 
            ON ri.receiving_items_receiving_id = r.receiving_id
        WHERE r.receiving_po_id = ?
        GROUP BY ri.receiving_items_item_id
    ");
    $receivedStmt->execute([$id]);
    $receivedRows = $receivedStmt->fetchAll();

    $receivedMap = [];
    foreach ($receivedRows as $row) {
        $receivedMap[(int)$row['item_id']] = (float)($row['qty_received'] ?? 0);
    }

    foreach ($items as &$item) {
        $itemId = (int)$item['item_id'];
        $orderedQty = (float)($item['quantity_ordered'] ?? 0);
        $alreadyReceived = $receivedMap[$itemId] ?? 0;
        $remaining = max($orderedQty - $alreadyReceived, 0);

        $item['quantity_received_total'] = $alreadyReceived;
        $item['quantity_remaining'] = $remaining;
    }
    unset($item);

    $po['items'] = $items;

    // Receiving history (header-level) for this PO, including user who received
    $historyStmt = $pdo->prepare("
        SELECT 
            r.receiving_id,
            r.receiving_rr_number,
            r.receiving_dr_number,
            r.receiving_date,
            r.receiving_total_with_discount,
            r.receiving_created_at,
            COALESCE(w.warehouses_name, '') AS warehouse_name,
            CONCAT(u.users_firstname, ' ', u.users_lastname) AS received_by
        FROM tblreceiving r
        LEFT JOIN tblwarehouses w ON r.receiving_warehouses_id = w.warehouses_id
        LEFT JOIN tbl_audit_log al 
            ON al.table_name = 'tblreceiving'
           AND al.record_id = r.receiving_id
           AND al.action_type = 'INSERT'
        LEFT JOIN tblusers u 
            ON al.user_id = u.users_id
        WHERE r.receiving_po_id = ?
        GROUP BY 
            r.receiving_id,
            r.receiving_rr_number,
            r.receiving_dr_number,
            r.receiving_date,
            r.receiving_total_with_discount,
            r.receiving_created_at,
            w.warehouses_name,
            u.users_firstname,
            u.users_lastname
        ORDER BY r.receiving_date DESC, r.receiving_id DESC
    ");
    $historyStmt->execute([$id]);
    $po['receiving_history'] = $historyStmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $po]);
}

/**
 * List warehouses for receiving
 */
function getWarehouses($pdo)
{
    $stmt = $pdo->query("
        SELECT 
            warehouses_id AS id,
            warehouses_name AS name
        FROM tblwarehouses
        ORDER BY warehouses_name
    ");

    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
}

/**
 * Create receiving record + receiving items
 */
function createReceiving($pdo, $currentUserId)
{
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request data']);
        return;
    }

    $poId         = filter_var($input['po_id'] ?? '', FILTER_VALIDATE_INT);
    $rrNumber     = sanitizeInput($input['rr_number'] ?? '');
    $drNumber     = sanitizeInput($input['dr_number'] ?? '');
    $warehouseId  = filter_var($input['warehouse_id'] ?? '', FILTER_VALIDATE_INT);
    $supplierId   = filter_var($input['supplier_id'] ?? '', FILTER_VALIDATE_INT);
    $date         = $input['date'] ?? '';
    $discount     = isset($input['discount']) ? floatval($input['discount']) : 0;
    $remarks      = sanitizeInput($input['remarks'] ?? '');
    $items        = $input['items'] ?? [];

    if (!$poId || !$rrNumber || !$drNumber || !$warehouseId || !$supplierId || !$date || empty($items)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Please complete all required receiving fields.']);
        return;
    }

    try {
        $pdo->beginTransaction();

        // make sure triggers see the correct user in this txn
        setDbActorVars($pdo, $currentUserId);

        // Compute totals
        $totalCost = 0;
        foreach ($items as $item) {
            $qty   = floatval($item['quantity_received'] ?? 0);
            $cost  = floatval($item['unit_cost'] ?? 0);
            $total = $qty * $cost;
            $totalCost += $total;
        }

        $totalWithDiscount = max($totalCost - $discount, 0);

        // Insert receiving header
        $stmt = $pdo->prepare("
            INSERT INTO tblreceiving (
                receiving_po_id,
                receiving_rr_number,
                receiving_dr_number,
                receiving_warehouses_id,
                receiving_supplier_id,
                receiving_date,
                receiving_total_cost,
                receiving_discount,
                receiving_total_with_discount,
                receiving_remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $poId,
            $rrNumber,
            $drNumber,
            $warehouseId,
            $supplierId,
            $date,
            $totalCost,
            $discount,
            $totalWithDiscount,
            $remarks
        ]);

        $receivingId = $pdo->lastInsertId();

        // audit trail - receiving header insert
        auditLog($pdo, 'tblreceiving', $receivingId, 'INSERT', $currentUserId);

        // Insert items
        $itemStmt = $pdo->prepare("
            INSERT INTO tblreceiving_items (
                receiving_items_receiving_id,
                receiving_items_item_id,
                receiving_items_quantity_received,
                receiving_items_unit_cost,
                receiving_items_total_cost
            ) VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($items as $item) {
            $itemId = filter_var($item['item_id'] ?? '', FILTER_VALIDATE_INT);
            $qty    = floatval($item['quantity_received'] ?? 0);
            $cost   = floatval($item['unit_cost'] ?? 0);
            if (!$itemId || $qty <= 0) {
                continue;
            }
            $total = $qty * $cost;
            $itemStmt->execute([
                $receivingId,
                $itemId,
                $qty,
                $cost,
                $total
            ]);
        }

        /**
         * Update stock levels in tblstocklevels for received items
         */
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
            $itemId = filter_var($item['item_id'] ?? '', FILTER_VALIDATE_INT);
            $qty    = intval($item['quantity_received'] ?? 0);
            
            if (!$itemId || $qty <= 0) {
                continue;
            }
            
            // Check if stock level exists for this item-warehouse combination
            $checkStockStmt->execute([$itemId, $warehouseId]);
            $existingStock = $checkStockStmt->fetch();
            
            if ($existingStock) {
                // Update existing stock level (increase by received quantity)
                $updateStockStmt->execute([$qty, $itemId, $warehouseId]);
            } else {
                // Insert new stock level record
                $insertStockStmt->execute([$itemId, $warehouseId, $qty]);
            }
        }

        /**
         * Automated PO status update based on CUMULATIVE receiving quantities:
         * - RECEIVING_PARTIAL (5): at least one item still not fully received
         * - RECEIVING_COMPLETE (6): all items fully received (no over)
         * - RECEIVING_OVER (7): any item received > ordered
         */
        $orderedStmt = $pdo->prepare("
            SELECT purchaseorder_items_item_id AS item_id, purchaseorder_items_quantity_ordered AS qty_ordered
            FROM tblpurchaseorder_items
            WHERE purchaseorder_items_po_id = ?
        ");
        $orderedStmt->execute([$poId]);
        $orderedRows = $orderedStmt->fetchAll();

        // Aggregate all received quantities from DB for this PO
        $aggReceivedStmt = $pdo->prepare("
            SELECT 
                ri.receiving_items_item_id AS item_id,
                SUM(ri.receiving_items_quantity_received) AS qty_received
            FROM tblreceiving r
            INNER JOIN tblreceiving_items ri 
                ON ri.receiving_items_receiving_id = r.receiving_id
            WHERE r.receiving_po_id = ?
            GROUP BY ri.receiving_items_item_id
        ");
        $aggReceivedStmt->execute([$poId]);
        $receivedRows = $aggReceivedStmt->fetchAll();

        $receivedMap = [];
        foreach ($receivedRows as $row) {
            $receivedMap[(int)$row['item_id']] = (float)($row['qty_received'] ?? 0);
        }

        $hasPartial = false;
        $hasOver = false;
        $allComplete = true;

        foreach ($orderedRows as $r) {
            $iid = intval($r['item_id']);
            $orderedQty = floatval($r['qty_ordered'] ?? 0);
            $receivedQty = floatval($receivedMap[$iid] ?? 0);

            if ($receivedQty < $orderedQty) {
                $hasPartial = true;
                $allComplete = false;
            } elseif ($receivedQty > $orderedQty) {
                $hasOver = true;
                $allComplete = false;
            }
        }

        $newStatusId = 5; // default partial
        if ($hasOver) {
            $newStatusId = 7;
        } elseif ($allComplete && !$hasPartial) {
            $newStatusId = 6;
        }

        $updateStatusStmt = $pdo->prepare("
            UPDATE tblpurchaseorders
            SET purchaseorders_status = ?
            WHERE purchaseorders_id = ?
        ");
        $updateStatusStmt->execute([$newStatusId, $poId]);

        // audit trail - PO update (status change is also tracked by tblpurchaseorders_status_update trigger)
        auditLog($pdo, 'tblpurchaseorders', $poId, 'UPDATE', $currentUserId);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Receiving record saved successfully.'
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log('Receiving create error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to save receiving. Please try again.'
        ]);
    }
}


