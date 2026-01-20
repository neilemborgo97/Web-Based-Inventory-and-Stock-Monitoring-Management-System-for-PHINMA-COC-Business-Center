<?php
require_once __DIR__ . '/../security-guard.php';

// Department Head (3), Admin (6)
checkAuth(50, [3, 6]);

include __DIR__ . '/../../department_head/department-head-dashboard.html';

