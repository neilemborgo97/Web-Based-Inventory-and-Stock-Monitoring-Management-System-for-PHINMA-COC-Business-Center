<?php
/**
 * Security Guard - Session validation for protected pages
 */
session_start();

function checkAuth($requiredLevel = 0, $allowedTypes = []) {
    // Check if logged in
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
        header('Location: /phinmacoc_ims/views/auth/login.html?unauthorized=1');
        exit;
    }
    
    // Check session timeout (30 minutes)
    $timeout = 1800;
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
        session_unset();
        session_destroy();
        header('Location: /phinmacoc_ims/views/auth/login.html?expired=1');
        exit;
    }
    
    // Update last activity
    $_SESSION['last_activity'] = time();
    
    // Check user level
    if ($requiredLevel > 0 && $_SESSION['user_level'] < $requiredLevel) {
        header('Location: /phinmacoc_ims/views/auth/login.html?unauthorized=1');
        exit;
    }
    
    // Check allowed user types
    if (!empty($allowedTypes) && !in_array($_SESSION['user_type_id'], $allowedTypes)) {
        header('Location: /phinmacoc_ims/views/auth/login.html?unauthorized=1');
        exit;
    }
    
    // Set no-cache headers
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    return true;
}

function getUserData() {
    return [
        'id' => $_SESSION['user_id'] ?? null,
        'school_id' => $_SESSION['school_id'] ?? null,
        'name' => $_SESSION['user_name'] ?? null,
        'email' => $_SESSION['user_email'] ?? null,
        'type_id' => $_SESSION['user_type_id'] ?? null,
        'type_name' => $_SESSION['user_type_name'] ?? null,
        'level' => $_SESSION['user_level'] ?? null
    ];
}

