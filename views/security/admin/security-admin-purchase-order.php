<?php
require_once __DIR__ . '/../security-guard.php';

// Only Admin (6) and IT Coordinator (4) can access
checkAuth(50, [4, 6]);

include __DIR__ . '/../../admin/admin-purchase-order.html';

