<?php
session_start();
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// Session timeout in seconds (30 minutes)
$sessionTimeout = 1800;

// Check if user is logged in
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => 'Not authenticated'
    ]);
    exit;
}

// Check session timeout
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $sessionTimeout)) {
    // Session expired
    session_unset();
    session_destroy();
    
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => 'Session expired',
        'expired' => true
    ]);
    exit;
}

// Update last activity time
$_SESSION['last_activity'] = time();

// Return user info
echo json_encode([
    'success' => true,
    'authenticated' => true,
    'user' => [
        'id' => $_SESSION['user_id'],
        'school_id' => $_SESSION['school_id'],
        'name' => $_SESSION['user_name'],
        'email' => $_SESSION['user_email'],
        'type_id' => $_SESSION['user_type_id'],
        'type_name' => $_SESSION['user_type_name'],
        'level' => $_SESSION['user_level']
    ],
    'csrf_token' => $_SESSION['csrf_token'] ?? ''
]);

