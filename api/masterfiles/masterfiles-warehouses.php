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
        $stmt = $pdo->query("SELECT warehouses_id as id, warehouses_name as name, warehouses_location as location, warehouses_created_at as created_at FROM tblwarehouses ORDER BY warehouses_id DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("SELECT warehouses_id as id, warehouses_name as name, warehouses_location as location FROM tblwarehouses WHERE warehouses_id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        echo json_encode($data ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => 'Not found']);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $name = sanitizeInput($input['name'] ?? '');
        $location = sanitizeInput($input['location'] ?? '');
        if (empty($name)) { echo json_encode(['success' => false, 'message' => 'Name is required']); exit; }
        $stmt = $pdo->prepare("INSERT INTO tblwarehouses (warehouses_name, warehouses_location) VALUES (?, ?)");
        $stmt->execute([$name, $location]);
        echo json_encode(['success' => true, 'message' => 'Warehouse created successfully']);
        break;

    case 'update':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $name = sanitizeInput($input['name'] ?? '');
        $location = sanitizeInput($input['location'] ?? '');
        if (!$id || empty($name)) { echo json_encode(['success' => false, 'message' => 'Invalid data']); exit; }
        $stmt = $pdo->prepare("UPDATE tblwarehouses SET warehouses_name = ?, warehouses_location = ? WHERE warehouses_id = ?");
        $stmt->execute([$name, $location, $id]);
        echo json_encode(['success' => true, 'message' => 'Warehouse updated successfully']);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblstocklevels WHERE stocklevels_warehouse_id = ?");
        $check->execute([$id]);
        if ($check->fetchColumn() > 0) { echo json_encode(['success' => false, 'message' => 'Cannot delete. Warehouse is in use.']); exit; }
        $stmt = $pdo->prepare("DELETE FROM tblwarehouses WHERE warehouses_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Warehouse deleted successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

