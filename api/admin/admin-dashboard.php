<?php
session_start();
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once '../config/connection-pdo.php';

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// Check user level (Admin or IT Coordinator)
if ($_SESSION['user_level'] < 50) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'stats':
        getStats($pdo);
        break;
    case 'recent_po':
        getRecentPurchaseOrders($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getStats($pdo) {
    try {
        // Get total items
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblitems");
        $items = $stmt->fetch()['count'];

        // Get total purchase orders
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblpurchaseorders");
        $purchaseOrders = $stmt->fetch()['count'];

        // Get total suppliers
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblsuppliers");
        $suppliers = $stmt->fetch()['count'];

        // Get total warehouses
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM tblwarehouses");
        $warehouses = $stmt->fetch()['count'];

        echo json_encode([
            'success' => true,
            'data' => [
                'items' => (int)$items,
                'purchase_orders' => (int)$purchaseOrders,
                'suppliers' => (int)$suppliers,
                'warehouses' => (int)$warehouses
            ]
        ]);
    } catch (PDOException $e) {
        error_log('Stats error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load stats']);
    }
}

function getRecentPurchaseOrders($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 
                po.purchaseorders_id as id,
                po.purchaseorders_number as po_number,
                s.suppliers_name as supplier_name,
                po.purchaseorders_order_date as order_date,
                po.purchaseorders_delivery_date as expected_delivery_date,
                (
                    SELECT MAX(r.receiving_date)
                    FROM tblreceiving r
                    WHERE r.receiving_po_id = po.purchaseorders_id
                ) as actual_delivery_date,
                po.purchaseorders_total_cost as total_cost,
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
                END as status_name,
                CASE 
                    WHEN ps.purchaseorders_statuses_status_name IN ('COMPLETED','RECEIVING_COMPLETE') THEN 'completed'
                    WHEN ps.purchaseorders_statuses_status_name = 'RECEIVING_PARTIAL' THEN 'receiving_partial'
                    WHEN ps.purchaseorders_statuses_status_name = 'APPROVED' THEN 'approved'
                    WHEN ps.purchaseorders_statuses_status_name = 'CANCELLED' THEN 'cancelled'
                    WHEN ps.purchaseorders_statuses_status_name = 'RECEIVING_OVER' THEN 'cancelled'
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
            ORDER BY po.purchaseorders_created_at DESC
            LIMIT 5
        ");

        $orders = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'data' => $orders
        ]);
    } catch (PDOException $e) {
        error_log('Recent PO error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load purchase orders']);
    }
}

