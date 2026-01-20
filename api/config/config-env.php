<?php
/**
 * Environment Configuration
 * Contains sensitive configuration settings
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'bcntr_ims_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// Application Settings
define('APP_NAME', 'PHINMA COC Business Center IMS');
define('APP_URL', 'http://localhost/phinmacoc_ims');
define('APP_ENV', 'development'); // development | production

// Session Settings
define('SESSION_TIMEOUT', 1800); // 30 minutes
define('SESSION_NAME', 'PHINMACOC_IMS_SESSION');

// Security Settings
define('RATE_LIMIT_MAX_ATTEMPTS', 5);
define('RATE_LIMIT_WINDOW', 900); // 15 minutes

// User Levels
define('LEVEL_ADMIN', 100);
define('LEVEL_MANAGER', 50);
define('LEVEL_CLERK', 10);

// User Types
define('TYPE_INVENTORY_CLERK', 1);
define('TYPE_WAREHOUSE_MANAGER', 2);
define('TYPE_DEPARTMENT_HEAD', 3);
define('TYPE_IT_COORDINATOR', 4);
define('TYPE_PROCUREMENT_MANAGER', 5);
define('TYPE_ADMINISTRATOR', 6);

