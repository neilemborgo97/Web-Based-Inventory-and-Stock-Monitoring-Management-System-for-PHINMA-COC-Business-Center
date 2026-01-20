<?php
session_start();
header('Content-Type: application/json');
require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

// Admin only
if ($_SESSION['user_level'] < 100) {
    http_response_code(403);
    die(json_encode(['success' => false, 'message' => 'Access denied']));
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        $stmt = $pdo->query("
            SELECT u.users_id as id, u.users_school_id as school_id,
                   CONCAT(u.users_firstname, ' ', u.users_lastname) as full_name,
                   u.users_email as email, u.users_status as status,
                   ut.usertype_name as user_type
            FROM tblusers u
            LEFT JOIN tblusertype ut ON u.users_type_id = ut.usertype_id
            ORDER BY u.users_id DESC
        ");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        $stmt = $pdo->prepare("
            SELECT users_id as id, users_school_id as school_id, users_lastname as lastname,
                   users_firstname as firstname, users_middlename as middlename,
                   users_email as email, users_contact as contact,
                   users_type_id as type_id, users_status as status
            FROM tblusers WHERE users_id = ?
        ");
        $stmt->execute([$id]);
        $data = $stmt->fetch();
        echo json_encode($data ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => 'Not found']);
        break;

    case 'usertypes':
        $stmt = $pdo->query("SELECT usertype_id as id, usertype_name as name FROM tblusertype ORDER BY usertype_name");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'create':
        $input = json_decode(file_get_contents('php://input'), true);
        $schoolId = sanitizeInput($input['school_id'] ?? '');
        $lastname = sanitizeInput($input['lastname'] ?? '');
        $firstname = sanitizeInput($input['firstname'] ?? '');
        $middlename = sanitizeInput($input['middlename'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $contact = sanitizeInput($input['contact'] ?? '');
        $typeId = filter_var($input['type_id'] ?? '', FILTER_VALIDATE_INT);
        $status = filter_var($input['status'] ?? 1, FILTER_VALIDATE_INT);
        $password = $input['password'] ?? '';

        if (empty($schoolId) || empty($lastname) || empty($firstname) || empty($email) || !$typeId || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Required fields missing']);
            exit;
        }

        // Check duplicate school_id
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblusers WHERE users_school_id = ?");
        $check->execute([$schoolId]);
        if ($check->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'School ID already exists']);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Get default level from usertype
        $levelStmt = $pdo->prepare("SELECT usertype_default_level FROM tblusertype WHERE usertype_id = ?");
        $levelStmt->execute([$typeId]);
        $level = $levelStmt->fetchColumn() ?: 10;

        $stmt = $pdo->prepare("
            INSERT INTO tblusers (users_school_id, users_lastname, users_firstname, users_middlename, 
                                  users_email, users_contact, users_password, users_type_id, users_status, users_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$schoolId, $lastname, $firstname, $middlename, $email, $contact, $hashedPassword, $typeId, $status, $level]);
        echo json_encode(['success' => true, 'message' => 'User created successfully']);
        break;

    case 'update':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        $schoolId = sanitizeInput($input['school_id'] ?? '');
        $lastname = sanitizeInput($input['lastname'] ?? '');
        $firstname = sanitizeInput($input['firstname'] ?? '');
        $middlename = sanitizeInput($input['middlename'] ?? '');
        $email = sanitizeInput($input['email'] ?? '');
        $contact = sanitizeInput($input['contact'] ?? '');
        $typeId = filter_var($input['type_id'] ?? '', FILTER_VALIDATE_INT);
        $status = filter_var($input['status'] ?? 1, FILTER_VALIDATE_INT);
        $password = $input['password'] ?? '';

        if (!$id || empty($schoolId) || empty($lastname) || empty($firstname)) {
            echo json_encode(['success' => false, 'message' => 'Invalid data']);
            exit;
        }

        // Check duplicate school_id (exclude current)
        $check = $pdo->prepare("SELECT COUNT(*) FROM tblusers WHERE users_school_id = ? AND users_id != ?");
        $check->execute([$schoolId, $id]);
        if ($check->fetchColumn() > 0) {
            echo json_encode(['success' => false, 'message' => 'School ID already exists']);
            exit;
        }

        // Get default level from usertype
        $levelStmt = $pdo->prepare("SELECT usertype_default_level FROM tblusertype WHERE usertype_id = ?");
        $levelStmt->execute([$typeId]);
        $level = $levelStmt->fetchColumn() ?: 10;

        if (!empty($password)) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
                UPDATE tblusers SET users_school_id = ?, users_lastname = ?, users_firstname = ?, 
                       users_middlename = ?, users_email = ?, users_contact = ?, users_password = ?,
                       users_type_id = ?, users_status = ?, users_level = ?
                WHERE users_id = ?
            ");
            $stmt->execute([$schoolId, $lastname, $firstname, $middlename, $email, $contact, $hashedPassword, $typeId, $status, $level, $id]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE tblusers SET users_school_id = ?, users_lastname = ?, users_firstname = ?, 
                       users_middlename = ?, users_email = ?, users_contact = ?,
                       users_type_id = ?, users_status = ?, users_level = ?
                WHERE users_id = ?
            ");
            $stmt->execute([$schoolId, $lastname, $firstname, $middlename, $email, $contact, $typeId, $status, $level, $id]);
        }
        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT);
        
        // Prevent self-delete
        if ($id == $_SESSION['user_id']) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM tblusers WHERE users_id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

