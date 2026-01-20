<?php
require_once __DIR__ . '/../security-guard.php';
checkAuth(50, [4, 6]);
include __DIR__ . '/../../masterfiles/masterfiles-courses.html';

