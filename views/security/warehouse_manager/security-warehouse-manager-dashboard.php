<?php
require_once __DIR__ . '/../security-guard.php';

// Warehouse Manager (2), Admin (6)
checkAuth(50, [2, 6]);

include __DIR__ . '/../../warehouse_manager/warehouse-manager-dashboard.html';

