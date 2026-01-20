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
        $stmt = $pdo->query("SELECT sizes_id as id, sizes_name as name, sizes_created_at as created_at FROM tblsizes ORDER BY sizes_id DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("SELECT sizes_id as id, sizes_name as name FROM tblsizes WHERE sizes_id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        echo json_encode($data ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => 'Not found']);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $name = sanitizeInput($input['name'] ?? '');
        if (empty($name)) { echo json_encode(['success' => false, 'message' => 'Name is required']); exit; }
        $stmt = $pdo->prepare("INSERT INTO tblsizes (sizes_name) VALUES (?)");
        $stmt->execute([$name]);
        echo json_encode(['success' => true, 'message' => 'Size created successfully']);
        break;

    case 'update':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $name = sanitizeInput($input['name'] ?? '');
        if (!$id || empty($name)) { echo json_encode(['success' => false, 'message' => 'Invalid data']); exit; }
        $stmt = $pdo->prepare("UPDATE tblsizes SET sizes_name = ? WHERE sizes_id = ?");
        $stmt->execute([$name, $id]);
        echo json_encode(['success' => true, 'message' => 'Size updated successfully']);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblitems WHERE items_size_id = ?");
        $check->execute([$id]);
        if ($check->fetchColumn() > 0) { echo json_encode(['success' => false, 'message' => 'Cannot delete. Size is in use.']); exit; }
        $stmt = $pdo->prepare("DELETE FROM tblsizes WHERE sizes_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Size deleted successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

