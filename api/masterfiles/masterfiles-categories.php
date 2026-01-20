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
        $stmt = $pdo->query("SELECT items_category_id as id, items_category_name as name, items_category_created_at as created_at FROM tblitems_category ORDER BY items_category_id DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("SELECT items_category_id as id, items_category_name as name FROM tblitems_category WHERE items_category_id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        echo json_encode($data ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => 'Not found']);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $name = sanitizeInput($input['name'] ?? '');
        if (empty($name)) { echo json_encode(['success' => false, 'message' => 'Name is required']); exit; }
        $stmt = $pdo->prepare("INSERT INTO tblitems_category (items_category_name) VALUES (?)");
        $stmt->execute([$name]);
        echo json_encode(['success' => true, 'message' => 'Category created successfully']);
        break;

    case 'update':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $name = sanitizeInput($input['name'] ?? '');
        if (!$id || empty($name)) { echo json_encode(['success' => false, 'message' => 'Invalid data']); exit; }
        $stmt = $pdo->prepare("UPDATE tblitems_category SET items_category_name = ? WHERE items_category_id = ?");
        $stmt->execute([$name, $id]);
        echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblitems WHERE items_category_id = ?");
        $check->execute([$id]);
        if ($check->fetchColumn() > 0) { echo json_encode(['success' => false, 'message' => 'Cannot delete. Category is in use.']); exit; }
        $stmt = $pdo->prepare("DELETE FROM tblitems_category WHERE items_category_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

