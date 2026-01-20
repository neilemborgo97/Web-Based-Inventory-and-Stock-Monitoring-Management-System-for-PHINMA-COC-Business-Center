<?php
session_start();
header('Content-Type: application/json');
require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        $stmt = $pdo->query("SELECT suppliers_id as id, suppliers_name as name, suppliers_email as email, suppliers_phone as phone, suppliers_address as address, suppliers_created_at as created_at FROM tblsuppliers ORDER BY suppliers_id DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("SELECT suppliers_id as id, suppliers_name as name, suppliers_email as email, suppliers_phone as phone, suppliers_address as address FROM tblsuppliers WHERE suppliers_id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        echo json_encode($data ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => 'Not found']);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $name = sanitizeInput($input['name'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $phone = sanitizeInput($input['phone'] ?? '');
        $address = sanitizeInput($input['address'] ?? '');
        if (empty($name)) { echo json_encode(['success' => false, 'message' => 'Name is required']); exit; }
        $stmt = $pdo->prepare("INSERT INTO tblsuppliers (suppliers_name, suppliers_email, suppliers_phone, suppliers_address) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $email, $phone, $address]);
        echo json_encode(['success' => true, 'message' => 'Supplier created successfully']);
        break;

    case 'update':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $name = sanitizeInput($input['name'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $phone = sanitizeInput($input['phone'] ?? '');
        $address = sanitizeInput($input['address'] ?? '');
        if (!$id || empty($name)) { echo json_encode(['success' => false, 'message' => 'Invalid data']); exit; }
        $stmt = $pdo->prepare("UPDATE tblsuppliers SET suppliers_name = ?, suppliers_email = ?, suppliers_phone = ?, suppliers_address = ? WHERE suppliers_id = ?");
        $stmt->execute([$name, $email, $phone, $address, $id]);
        echo json_encode(['success' => true, 'message' => 'Supplier updated successfully']);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblitems WHERE items_supplier_id = ?");
        $check->execute([$id]);
        if ($check->fetchColumn() > 0) { echo json_encode(['success' => false, 'message' => 'Cannot delete. Supplier is in use.']); exit; }
        $stmt = $pdo->prepare("DELETE FROM tblsuppliers WHERE suppliers_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Supplier deleted successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

