<?php
require_once __DIR__ . '/../security-guard.php';

// Procurement Manager (5), Admin (6)
checkAuth(50, [5, 6]);

include __DIR__ . '/../../procurement_officer/procurement-officer-dashboard.html';

