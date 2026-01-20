<?php
session_start();
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

require_once '../config/connection-pdo.php';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'history':
        getAuditHistory($pdo);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getAuditHistory($pdo) {
    $tableName = filter_input(INPUT_GET, 'table', FILTER_SANITIZE_STRING);
    $recordId = filter_input(INPUT_GET, 'record_id', FILTER_VALIDATE_INT);
    
    if (!$tableName || !$recordId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Table name and record ID are required']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT 
                al.audit_id,
                al.action_type,
                al.action_date,
                CONCAT(u.users_firstname, ' ', u.users_lastname) as user_name,
                u.users_email as user_email,
                ut.usertype_name as user_type
            FROM tbl_audit_log al
            LEFT JOIN tblusers u ON al.user_id = u.users_id
            LEFT JOIN tblusertype ut ON u.users_type_id = ut.usertype_id
            WHERE al.table_name = ? AND al.record_id = ?
            ORDER BY al.action_date DESC
        ");
        $stmt->execute([$tableName, $recordId]);
        
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        error_log('Get audit history error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to load audit history']);
    }
}

