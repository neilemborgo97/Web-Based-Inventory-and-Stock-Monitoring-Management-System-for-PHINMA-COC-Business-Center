<?php
require_once __DIR__ . '/../security-guard.php';
checkAuth(10, [1, 2, 4, 5, 6]); // Inventory Clerk, Warehouse Manager, IT Coordinator, Procurement Manager, Administrator
include __DIR__ . '/../../inventory/inventory-transfers.html';

