<?php
/**
 * Input Validation Helper Functions
 * Security-focused input sanitization and validation
 */

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

function validateSchoolId($schoolId) {
    // School ID format: XX-XXXX-XXXXX (e.g., 02-2324-13450)
    $pattern = '/^\d{2}-\d{4}-\d{5}$/';
    return preg_match($pattern, $schoolId);
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validatePassword($password) {
    // Minimum 8 characters
    return strlen($password) >= 8;
}

function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function rateLimitCheck($identifier, $maxAttempts = 5, $timeWindow = 900) {
    $key = 'login_attempts_' . md5($identifier);
    
    if (!isset($_SESSION[$key])) {
        $_SESSION[$key] = ['count' => 0, 'first_attempt' => time()];
    }
    
    $data = $_SESSION[$key];
    
    // Reset if time window has passed
    if (time() - $data['first_attempt'] > $timeWindow) {
        $_SESSION[$key] = ['count' => 1, 'first_attempt' => time()];
        return true;
    }
    
    // Check if max attempts exceeded
    if ($data['count'] >= $maxAttempts) {
        return false;
    }
    
    $_SESSION[$key]['count']++;
    return true;
}

function getRemainingLockoutTime($identifier, $timeWindow = 900) {
    $key = 'login_attempts_' . md5($identifier);
    
    if (isset($_SESSION[$key])) {
        $elapsed = time() - $_SESSION[$key]['first_attempt'];
        return max(0, $timeWindow - $elapsed);
    }
    
    return 0;
}

function resetLoginAttempts($identifier) {
    $key = 'login_attempts_' . md5($identifier);
    unset($_SESSION[$key]);
}

