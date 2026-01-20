<?php
require_once __DIR__ . '/../security-guard.php';

// Only Admin (6) and IT Coordinator (4) can access
checkAuth(50, [4, 6]);

// Include the actual HTML content
include __DIR__ . '/../../admin/admin-dashboard.html';

