<?php
require_once __DIR__ . '/../security-guard.php';

// Inventory Clerk (1), Admin (6)
checkAuth(10, [1, 6]);

include __DIR__ . '/../../inventory_clerk/inventory-clerk-dashboard.html';

