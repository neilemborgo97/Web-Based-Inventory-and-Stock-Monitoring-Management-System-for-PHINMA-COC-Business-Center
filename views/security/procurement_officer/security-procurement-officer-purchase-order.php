<?php
require_once __DIR__ . '/../security-guard.php';

checkAuth(50, [5, 6]);

include __DIR__ . '/../../procurement_officer/procurement-officer-purchase-order.html';

