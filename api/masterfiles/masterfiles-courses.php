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
        $stmt = $pdo->query("
            SELECT c.courses_id as id, c.courses_code as code, c.courses_name as name, 
                   c.courses_department_id as department_id, d.departments_name as department_name
            FROM tblcourses c
            LEFT JOIN tbldepartments d ON c.courses_department_id = d.departments_id
            ORDER BY c.courses_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("SELECT courses_id as id, courses_code as code, courses_name as name, courses_department_id as department_id FROM tblcourses WHERE courses_id = ?");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        echo json_encode($data ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => 'Not found']);
        break;

    case 'departments':
        $stmt = $pdo->query("SELECT departments_id as id, departments_name as name FROM tbldepartments ORDER BY departments_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $code = sanitizeInput($input['code'] ?? '');
        $name = sanitizeInput($input['name'] ?? '');
        $deptId = filter_var($input['department_id'] ?? '', FILTER_VALIDATE_INT);
        if (empty($code) || empty($name) || !$deptId) { echo json_encode(['success' => false, 'message' => 'All fields are required']); exit; }
        $stmt = $pdo->prepare("INSERT INTO tblcourses (courses_code, courses_name, courses_department_id) VALUES (?, ?, ?)");
        $stmt->execute([$code, $name, $deptId]);
        echo json_encode(['success' => true, 'message' => 'Course created successfully']);
        break;

    case 'update':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $code = sanitizeInput($input['code'] ?? '');
        $name = sanitizeInput($input['name'] ?? '');
        $deptId = filter_var($input['department_id'] ?? '', FILTER_VALIDATE_INT);
        if (!$id || empty($code) || empty($name)) { echo json_encode(['success' => false, 'message' => 'Invalid data']); exit; }
        $stmt = $pdo->prepare("UPDATE tblcourses SET courses_code = ?, courses_name = ?, courses_department_id = ? WHERE courses_id = ?");
        $stmt->execute([$code, $name, $deptId, $id]);
        echo json_encode(['success' => true, 'message' => 'Course updated successfully']);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblusers WHERE users_course_id = ?");
        $check->execute([$id]);
        if ($check->fetchColumn() > 0) { echo json_encode(['success' => false, 'message' => 'Cannot delete. Course has users.']); exit; }
        $stmt = $pdo->prepare("DELETE FROM tblcourses WHERE courses_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Course deleted successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

