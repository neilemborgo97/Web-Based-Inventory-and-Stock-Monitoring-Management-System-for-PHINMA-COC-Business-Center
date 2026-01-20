<?php
require_once __DIR__ . '/../security-guard.php';
checkAuth(100, [6]); // Admin only
include __DIR__ . '/../../masterfiles/masterfiles-users.html';

