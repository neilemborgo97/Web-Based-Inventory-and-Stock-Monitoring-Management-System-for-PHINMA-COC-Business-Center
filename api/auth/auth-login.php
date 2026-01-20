<?php
session_start();
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

require_once '../config/connection-pdo.php';
require_once '../includes/includes-input-validation.php';

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request data']);
    exit;
}

$schoolId = sanitizeInput($input['school_id'] ?? '');
$password = $input['password'] ?? '';
$csrfToken = $input['csrf_token'] ?? '';

// Validate required fields
if (empty($schoolId) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'School ID and password are required']);
    exit;
}

// Rate limiting check
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$identifier = $clientIP . '_' . $schoolId;

if (!rateLimitCheck($identifier, 5, 900)) {
    $remainingTime = getRemainingLockoutTime($identifier);
    $minutes = ceil($remainingTime / 60);
    http_response_code(429);
    echo json_encode([
        'success' => false, 
        'message' => "Too many login attempts. Please try again in {$minutes} minutes.",
        'locked' => true,
        'remaining_seconds' => $remainingTime
    ]);
    exit;
}

try {
    // Fetch user by school ID
    $stmt = $pdo->prepare("
        SELECT 
            u.users_id,
            u.users_school_id,
            u.users_lastname,
            u.users_firstname,
            u.users_middlename,
            u.users_email,
            u.users_password,
            u.users_type_id,
            u.users_level,
            u.users_status,
            ut.usertype_name
        FROM tblusers u
        LEFT JOIN tblusertype ut ON u.users_type_id = ut.usertype_id
        WHERE u.users_school_id = ?
        LIMIT 1
    ");
    
    $stmt->execute([$schoolId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }
    
    // Check if user is active
    if ($user['users_status'] != 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Account is deactivated. Please contact administrator.']);
        exit;
    }
    
    // Verify password
    if (!password_verify($password, $user['users_password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        exit;
    }
    
    // Success - Reset login attempts
    resetLoginAttempts($identifier);
    
    // Regenerate session ID for security
    session_regenerate_id(true);
    
    // Store user data in session
    $_SESSION['user_id'] = $user['users_id'];
    $_SESSION['school_id'] = $user['users_school_id'];
    $_SESSION['user_name'] = $user['users_firstname'] . ' ' . $user['users_lastname'];
    $_SESSION['user_email'] = $user['users_email'];
    $_SESSION['user_type_id'] = $user['users_type_id'];
    $_SESSION['user_type_name'] = $user['usertype_name'];
    $_SESSION['user_level'] = $user['users_level'];
    $_SESSION['logged_in'] = true;
    $_SESSION['login_time'] = time();
    $_SESSION['last_activity'] = time();
    
    // Generate new CSRF token
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    
    // Determine redirect based on user type
    $redirectUrl = getRedirectUrl($user['users_type_id']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['users_id'],
            'name' => $user['users_firstname'] . ' ' . $user['users_lastname'],
            'email' => $user['users_email'],
            'type' => $user['usertype_name'],
            'level' => $user['users_level']
        ],
        'redirect' => $redirectUrl,
        'csrf_token' => $_SESSION['csrf_token']
    ]);
    
} catch (PDOException $e) {
    error_log('Login error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred. Please try again.']);
}

function getRedirectUrl($userTypeId) {
    $routes = [
        1 => '../inventory_clerk/inventory-clerk-dashboard.html',      // Inventory Clerk
        2 => '../warehouse_manager/warehouse-manager-dashboard.html',  // Warehouse Manager
        3 => '../department_head/department-head-dashboard.html',      // Department Head
        4 => '../admin/admin-dashboard.html',                          // IT Coordinator
        5 => '../procurement_officer/procurement-officer-dashboard.html', // Procurement Manager
        6 => '../admin/admin-dashboard.html'                           // Administrator
    ];
    
    return $routes[$userTypeId] ?? '../auth/login.html';
}

