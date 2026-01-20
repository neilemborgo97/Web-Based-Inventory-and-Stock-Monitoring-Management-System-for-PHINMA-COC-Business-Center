-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 20, 2026 at 09:39 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bcntr_ims_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `tblbookissuances`
--

CREATE TABLE `tblbookissuances` (
  `bookissuances_id` int(11) NOT NULL,
  `bookissuances_student_id` int(11) DEFAULT NULL,
  `bookissuances_issue_date` date DEFAULT NULL,
  `bookissuances_total_items` int(11) DEFAULT NULL,
  `bookissuances_total_amount` decimal(10,2) DEFAULT NULL,
  `bookissuances_status` enum('Pending','Issued','Returned','Cancelled') NOT NULL DEFAULT 'Pending',
  `bookissuances_remarks` text DEFAULT NULL,
  `bookissuances_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `bookissuances_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tblbookissuance_items`
--

CREATE TABLE `tblbookissuance_items` (
  `bookissuance_items_id` int(11) NOT NULL,
  `bookissuance_items_issuance_id` int(11) DEFAULT NULL,
  `bookissuance_items_item_id` int(11) DEFAULT NULL,
  `bookissuance_items_quantity` int(11) DEFAULT NULL,
  `bookissuance_items_unit_price` decimal(10,2) DEFAULT NULL,
  `bookissuance_items_total_price` decimal(10,2) DEFAULT NULL,
  `bookissuance_items_return_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tblcampus`
--

CREATE TABLE `tblcampus` (
  `campus_id` int(11) NOT NULL,
  `campus_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblcampus`
--

INSERT INTO `tblcampus` (`campus_id`, `campus_name`) VALUES
(1, 'Main Campus');

-- --------------------------------------------------------

--
-- Table structure for table `tblcourses`
--

CREATE TABLE `tblcourses` (
  `courses_id` int(11) NOT NULL,
  `courses_name` varchar(255) NOT NULL,
  `courses_code` varchar(20) NOT NULL,
  `courses_department_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblcourses`
--

INSERT INTO `tblcourses` (`courses_id`, `courses_name`, `courses_code`, `courses_department_id`) VALUES
(1, 'Bachelor of Science in Accountancy', 'BSA', 5),
(2, 'Bachelor of Science in Hospitality Management', 'BSHM', 5),
(3, 'Bachelor of Science in Tourism Management', 'BSTM', 5),
(4, 'Bachelor of Science in Business Administration', 'BSBA', 5),
(5, 'Bachelor of Science in Management Accounting', 'BSMA', 5),
(6, 'Bachelor of Elementary Educations', 'BEED', 6),
(7, 'Bachelor of Secondary Education', 'BSED', 6),
(8, 'Bachelor of Science in Early Childhood Education', 'BECED', 6),
(9, 'Bachelor of Science in Criminology', 'BSCRIM', 7),
(10, 'Bachelor of Science in Architecture', 'BSA', 3),
(11, 'Bachelor of Science in Computer Engineering', 'BSCPE', 3),
(12, 'Bachelor of Science in Civil Engineering', 'BSCE', 3),
(13, 'Bachelor of Science in Electrical Engineering', 'BSEE', 3),
(14, 'Bachelor of Science in Mechanical Engineering', 'BSME', 3),
(15, 'Bachelor of Science in Nursing', 'BSN', 1),
(16, 'Bachelor of Science in Pharmacy', 'BSPHARMA', 1),
(17, 'Bachelor of Science in Medical Technology', 'BSMT', 1),
(18, 'Bachelor of Science in Psychology', 'BSPSY', 1),
(19, 'Bachelor of Science in Information Technology ', 'BSIT', 4);

-- --------------------------------------------------------

--
-- Table structure for table `tbldepartments`
--

CREATE TABLE `tbldepartments` (
  `departments_id` int(11) NOT NULL,
  `departments_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbldepartments`
--

INSERT INTO `tbldepartments` (`departments_id`, `departments_name`) VALUES
(1, 'CAHS'),
(2, 'CAS'),
(3, 'CEA'),
(4, 'CITE'),
(5, 'CMA'),
(6, 'COED'),
(7, 'SCCJ'),
(8, 'SHS'),
(9, 'BASIC ED'),
(10, 'GRADUATE SCHOOL'),
(12, 'Registrar'),
(13, 'Marketing'),
(14, 'CSDL'),
(15, 'Finance'),
(16, 'Business Center'),
(17, 'Library'),
(18, 'ITS'),
(19, 'GSD'),
(20, 'Clinic (College)'),
(21, 'Clinic (Basic Ed & SHS)'),
(22, 'Flex Remote & RAD 2.0'),
(23, 'VocTech'),
(24, 'SIS'),
(25, 'SSG');

-- --------------------------------------------------------

--
-- Table structure for table `tblinventory_adjustment`
--

CREATE TABLE `tblinventory_adjustment` (
  `adjustment_id` int(11) NOT NULL,
  `adjustment_date` date DEFAULT NULL,
  `adjustment_type` enum('Increase','Decrease') NOT NULL,
  `adjustment_reason` text DEFAULT NULL,
  `adjustment_status` enum('Pending','Approved','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `adjustment_approved_by` int(11) DEFAULT NULL,
  `adjustment_remarks` text DEFAULT NULL,
  `adjustment_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `adjustment_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblinventory_adjustment`
--

INSERT INTO `tblinventory_adjustment` (`adjustment_id`, `adjustment_date`, `adjustment_type`, `adjustment_reason`, `adjustment_status`, `adjustment_approved_by`, `adjustment_remarks`, `adjustment_created_at`, `adjustment_updated_at`) VALUES
(1, '2026-01-21', 'Decrease', 'change', 'Approved', 2, '', '2026-01-20 20:28:51', '2026-01-20 20:29:14');

-- --------------------------------------------------------

--
-- Table structure for table `tblinventory_adjustment_items`
--

CREATE TABLE `tblinventory_adjustment_items` (
  `adjustment_items_id` int(11) NOT NULL,
  `adjustment_items_adjustment_id` int(11) DEFAULT NULL,
  `adjustment_items_item_id` int(11) DEFAULT NULL,
  `adjustment_items_quantity` int(11) DEFAULT NULL,
  `adjustment_items_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblinventory_adjustment_items`
--

INSERT INTO `tblinventory_adjustment_items` (`adjustment_items_id`, `adjustment_items_adjustment_id`, `adjustment_items_item_id`, `adjustment_items_quantity`, `adjustment_items_reason`) VALUES
(1, 1, 14, 130, 'change');

-- --------------------------------------------------------

--
-- Table structure for table `tblinventory_transfer`
--

CREATE TABLE `tblinventory_transfer` (
  `transfer_id` int(11) NOT NULL,
  `transfer_source_warehouse_id` int(11) DEFAULT NULL,
  `transfer_destination_warehouse_id` int(11) DEFAULT NULL,
  `transfer_date` date DEFAULT NULL,
  `transfer_total_items` int(11) DEFAULT NULL,
  `transfer_status` enum('Pending','In Transit','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `transfer_remarks` text DEFAULT NULL,
  `transfer_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `transfer_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblinventory_transfer`
--

INSERT INTO `tblinventory_transfer` (`transfer_id`, `transfer_source_warehouse_id`, `transfer_destination_warehouse_id`, `transfer_date`, `transfer_total_items`, `transfer_status`, `transfer_remarks`, `transfer_created_at`, `transfer_updated_at`) VALUES
(1, 1, 3, '2026-01-20', 100, 'Completed', '', '2026-01-20 20:33:30', '2026-01-20 20:33:38');

-- --------------------------------------------------------

--
-- Table structure for table `tblinventory_transfer_items`
--

CREATE TABLE `tblinventory_transfer_items` (
  `transfer_items_id` int(11) NOT NULL,
  `transfer_items_transfer_id` int(11) DEFAULT NULL,
  `transfer_items_item_id` int(11) DEFAULT NULL,
  `transfer_items_quantity` int(11) DEFAULT NULL,
  `transfer_items_remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblinventory_transfer_items`
--

INSERT INTO `tblinventory_transfer_items` (`transfer_items_id`, `transfer_items_transfer_id`, `transfer_items_item_id`, `transfer_items_quantity`, `transfer_items_remarks`) VALUES
(1, 1, 14, 100, '');

-- --------------------------------------------------------

--
-- Table structure for table `tblitems`
--

CREATE TABLE `tblitems` (
  `items_id` int(11) NOT NULL,
  `items_name` varchar(255) NOT NULL,
  `items_description` text DEFAULT NULL,
  `items_category_id` int(11) DEFAULT NULL,
  `items_supplier_id` int(11) DEFAULT NULL,
  `items_size_id` int(11) DEFAULT NULL,
  `items_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `items_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `items_unit_cost` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblitems`
--

INSERT INTO `tblitems` (`items_id`, `items_name`, `items_description`, `items_category_id`, `items_supplier_id`, `items_size_id`, `items_created_at`, `items_updated_at`, `items_unit_cost`) VALUES
(6, 'BSN White Uniform S', 'BSN All White Uniform Small Set 1', 1, 4, 2, '2025-08-28 15:35:19', '2025-09-04 17:32:04', 200.00),
(7, 'INTRO TO CRIMINOLOGY', 'INTRO TO CRIMINOLOGY BOOK FOR CRIM 1 - SEM 12', 2, 3, NULL, '2025-08-28 15:46:22', '2025-09-04 15:38:31', 325.00),
(8, 'TEST BOOK', 'This is a test book item entry', 2, 3, NULL, '2025-08-30 01:40:51', '2025-08-30 01:40:51', 275.00),
(14, 'BOOK TEST', '', 2, 3, NULL, '2025-09-04 15:37:44', '2025-09-04 17:37:00', 400.00);

--
-- Triggers `tblitems`
--
DELIMITER $$
CREATE TRIGGER `before_item_cost_update` BEFORE UPDATE ON `tblitems` FOR EACH ROW BEGIN IF OLD.items_unit_cost <> NEW.items_unit_cost THEN INSERT INTO tblitem_costs ( item_costs_item_id, item_costs_amount, item_costs_created_by, item_costs_created_at ) VALUES ( NEW.items_id, NEW.items_unit_cost, IFNULL(@actor_user_id, NULL), NOW() ); END IF; END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tblitems_category`
--

CREATE TABLE `tblitems_category` (
  `items_category_id` int(11) NOT NULL,
  `items_category_name` varchar(255) NOT NULL,
  `items_category_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `items_category_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblitems_category`
--

INSERT INTO `tblitems_category` (`items_category_id`, `items_category_name`, `items_category_created_at`, `items_category_updated_at`) VALUES
(1, 'Uniforms', '2025-08-28 12:58:14', '2025-08-28 12:58:14'),
(2, 'Books', '2025-08-28 12:58:27', '2025-08-28 13:07:12'),
(4, 'Fabrics', '2025-08-28 13:05:53', '2025-08-28 13:05:53'),
(5, 'Accessories', '2025-08-30 02:00:30', '2025-08-30 02:00:30');

-- --------------------------------------------------------

--
-- Table structure for table `tblitem_costs`
--

CREATE TABLE `tblitem_costs` (
  `item_costs_id` int(11) NOT NULL,
  `item_costs_item_id` int(11) NOT NULL,
  `item_costs_amount` decimal(10,2) NOT NULL,
  `item_costs_created_by` int(11) DEFAULT NULL,
  `item_costs_created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblitem_costs`
--

INSERT INTO `tblitem_costs` (`item_costs_id`, `item_costs_item_id`, `item_costs_amount`, `item_costs_created_by`, `item_costs_created_at`) VALUES
(1, 6, 4500.00, NULL, '2025-08-28 15:42:35'),
(2, 6, 475.00, NULL, '2025-08-28 15:43:10'),
(3, 7, 375.00, NULL, '2025-08-28 15:50:44'),
(4, 7, 325.00, NULL, '2025-08-28 15:51:26'),
(5, 6, 500.00, NULL, '2025-08-30 00:55:12'),
(6, 6, 200.00, NULL, '2025-09-04 17:32:04'),
(7, 14, 420.00, NULL, '2025-09-04 17:36:07'),
(8, 14, 400.00, NULL, '2025-09-04 17:37:00');

-- --------------------------------------------------------

--
-- Table structure for table `tblmodality`
--

CREATE TABLE `tblmodality` (
  `modality_id` int(11) NOT NULL,
  `modality_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblmodality`
--

INSERT INTO `tblmodality` (`modality_id`, `modality_name`) VALUES
(1, 'Regular');

-- --------------------------------------------------------

--
-- Table structure for table `tblpurchaseorders`
--

CREATE TABLE `tblpurchaseorders` (
  `purchaseorders_id` int(11) NOT NULL,
  `purchaseorders_number` varchar(50) NOT NULL,
  `purchaseorders_supplier_id` int(11) DEFAULT NULL,
  `purchaseorders_order_date` date DEFAULT NULL,
  `purchaseorders_delivery_date` date DEFAULT NULL,
  `purchaseorders_total_cost` decimal(10,2) DEFAULT NULL,
  `purchaseorders_status` int(11) NOT NULL,
  `purchaseorders_remarks` text DEFAULT NULL,
  `purchaseorders_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `purchaseorders_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblpurchaseorders`
--

INSERT INTO `tblpurchaseorders` (`purchaseorders_id`, `purchaseorders_number`, `purchaseorders_supplier_id`, `purchaseorders_order_date`, `purchaseorders_delivery_date`, `purchaseorders_total_cost`, `purchaseorders_status`, `purchaseorders_remarks`, `purchaseorders_created_at`, `purchaseorders_updated_at`) VALUES
(1, '2324-13450', 4, '2025-09-04', '2025-09-30', 26000.00, 6, '', '2025-09-04 14:21:25', '2026-01-20 20:31:15'),
(2, '02-234215-123', 2, '2025-09-12', '2025-10-02', 104000.00, 1, '', '2025-09-04 15:05:53', '2025-09-04 18:07:19'),
(3, '123123', 4, '2025-09-10', '2025-09-18', 500.00, 1, '', '2025-09-04 17:26:42', '2025-09-04 17:26:42'),
(4, '123123123', 4, '2025-09-05', '2025-09-16', 50400.00, 6, '', '2025-09-04 17:36:07', '2026-01-20 20:30:48'),
(5, '1231231235435', 2, '2025-09-05', '2025-09-30', 60000.00, 6, '', '2025-09-04 17:37:00', '2026-01-20 20:19:40'),
(6, '420', 3, '2026-01-21', '2026-01-30', 650.00, 7, '', '2026-01-20 19:57:01', '2026-01-20 20:14:59');

--
-- Triggers `tblpurchaseorders`
--
DELIMITER $$
CREATE TRIGGER `after_po_status_update` AFTER UPDATE ON `tblpurchaseorders` FOR EACH ROW BEGIN
    -- Only log when status actually changes
    IF OLD.purchaseorders_status <> NEW.purchaseorders_status THEN
        INSERT INTO tblpurchaseorders_status_update (
            purchaseorders_status_update_purchaseorders_id,
            purchaseorders_status_update_new_status_id,
            purchaseorders_status_update_created_by,
            purchaseorders_status_update_created_at
        ) VALUES (
            NEW.purchaseorders_id,
            NEW.purchaseorders_status,
            IFNULL(@current_user_id, 0),
            NOW()
        );
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `tblpurchaseorders_statuses`
--

CREATE TABLE `tblpurchaseorders_statuses` (
  `purchaseorders_statuses_status_id` int(11) NOT NULL,
  `purchaseorders_statuses_status_name` text NOT NULL DEFAULT 'PENDING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblpurchaseorders_statuses`
--

INSERT INTO `tblpurchaseorders_statuses` (`purchaseorders_statuses_status_id`, `purchaseorders_statuses_status_name`) VALUES
(1, 'PENDING'),
(2, 'COMPLETED'),
(3, 'CANCELLED'),
(4, 'APPROVED'),
(5, 'RECEIVING_PARTIAL'),
(6, 'RECEIVING_COMPLETE'),
(7, 'RECEIVING_OVER'),
(8, 'BACKORDER');

-- --------------------------------------------------------

--
-- Table structure for table `tblpurchaseorders_status_update`
--

CREATE TABLE `tblpurchaseorders_status_update` (
  `purchaseorders_status_update_id` int(11) NOT NULL,
  `purchaseorders_status_update_purchaseorders_id` int(11) NOT NULL,
  `purchaseorders_status_update_new_status_id` int(11) NOT NULL,
  `purchaseorders_status_update_created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `purchaseorders_status_update_created_by` int(11) DEFAULT 0 COMMENT 'User who made the status change (0 = system)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblpurchaseorders_status_update`
--

INSERT INTO `tblpurchaseorders_status_update` (`purchaseorders_status_update_id`, `purchaseorders_status_update_purchaseorders_id`, `purchaseorders_status_update_new_status_id`, `purchaseorders_status_update_created_at`, `purchaseorders_status_update_created_by`) VALUES
(1, 1, 3, '2025-09-04 14:59:37', 0),
(2, 1, 1, '2025-09-04 15:00:08', 0),
(3, 2, 2, '2025-09-04 15:08:16', 0),
(4, 2, 1, '2025-09-04 15:10:56', 0),
(8, 2, 3, '2025-09-04 15:13:30', 0),
(9, 2, 1, '2025-09-04 15:13:57', 0),
(24, 2, 2, '2025-09-04 15:22:12', 0),
(25, 2, 3, '2025-09-04 15:27:03', 0),
(26, 2, 1, '2025-09-04 15:27:19', 0),
(27, 2, 2, '2025-09-04 15:27:43', 0),
(28, 2, 1, '2025-09-04 17:19:39', 0),
(29, 1, 2, '2025-09-04 17:51:19', 0),
(30, 1, 1, '2025-09-04 17:51:22', 0),
(31, 2, 2, '2025-09-04 17:52:32', 0),
(32, 2, 1, '2025-09-04 17:52:44', 0),
(33, 2, 2, '2025-09-04 18:04:01', 0),
(34, 2, 1, '2025-09-04 18:04:03', 0),
(35, 2, 2, '2025-09-04 18:07:12', 0),
(36, 2, 3, '2025-09-04 18:07:16', 0),
(37, 2, 1, '2025-09-04 18:07:19', 0),
(38, 6, 7, '2026-01-20 20:14:59', 2),
(39, 5, 6, '2026-01-20 20:19:40', 2),
(40, 4, 6, '2026-01-20 20:30:48', 2),
(41, 1, 6, '2026-01-20 20:31:15', 2);

-- --------------------------------------------------------

--
-- Table structure for table `tblpurchaseorder_items`
--

CREATE TABLE `tblpurchaseorder_items` (
  `purchaseorder_items_id` int(11) NOT NULL,
  `purchaseorder_items_po_id` int(11) DEFAULT NULL,
  `purchaseorder_items_item_id` int(11) DEFAULT NULL,
  `purchaseorder_items_quantity_ordered` int(11) DEFAULT NULL,
  `purchaseorder_items_unit_cost` decimal(10,2) DEFAULT NULL,
  `purchaseorder_items_total_cost` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblpurchaseorder_items`
--

INSERT INTO `tblpurchaseorder_items` (`purchaseorder_items_id`, `purchaseorder_items_po_id`, `purchaseorder_items_item_id`, `purchaseorder_items_quantity_ordered`, `purchaseorder_items_unit_cost`, `purchaseorder_items_total_cost`) VALUES
(1, 1, 7, 20, 250.00, 5000.00),
(2, 1, 6, 120, 175.00, 21000.00),
(5, 3, 14, 1, 500.00, 500.00),
(12, 2, 8, 20, 5000.00, 100000.00),
(13, 2, 6, 20, 200.00, 4000.00),
(14, 4, 14, 120, 420.00, 50400.00),
(15, 5, 14, 150, 400.00, 60000.00),
(16, 6, 7, 1, 325.00, 325.00),
(17, 6, 7, 1, 325.00, 325.00);

-- --------------------------------------------------------

--
-- Table structure for table `tblpurchasereturns`
--

CREATE TABLE `tblpurchasereturns` (
  `purchasereturns_id` int(11) NOT NULL,
  `purchasereturns_po_id` int(11) DEFAULT NULL,
  `purchasereturns_supplier_id` int(11) DEFAULT NULL,
  `purchasereturns_warehouse_id` int(11) DEFAULT NULL,
  `purchasereturns_return_date` date DEFAULT NULL,
  `purchasereturns_return_reason` text DEFAULT NULL,
  `purchasereturns_total_items` int(11) DEFAULT NULL,
  `purchasereturns_total_amount` decimal(10,2) DEFAULT NULL,
  `purchasereturns_status` enum('Pending','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `purchasereturns_remarks` text DEFAULT NULL,
  `purchasereturns_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `purchasereturns_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblpurchasereturns`
--

INSERT INTO `tblpurchasereturns` (`purchasereturns_id`, `purchasereturns_po_id`, `purchasereturns_supplier_id`, `purchasereturns_warehouse_id`, `purchasereturns_return_date`, `purchasereturns_return_reason`, `purchasereturns_total_items`, `purchasereturns_total_amount`, `purchasereturns_status`, `purchasereturns_remarks`, `purchasereturns_created_at`, `purchasereturns_updated_at`) VALUES
(1, 1, 4, 1, '2026-01-20', 'broken', 140, 26000.00, 'Completed', '', '2026-01-20 20:32:24', '2026-01-20 20:32:41');

-- --------------------------------------------------------

--
-- Table structure for table `tblpurchasereturns_items`
--

CREATE TABLE `tblpurchasereturns_items` (
  `purchasereturns_items_id` int(11) NOT NULL,
  `purchasereturns_items_return_id` int(11) DEFAULT NULL,
  `purchasereturns_items_item_id` int(11) DEFAULT NULL,
  `purchasereturns_items_quantity` int(11) DEFAULT NULL,
  `purchasereturns_items_unit_cost` decimal(10,2) DEFAULT NULL,
  `purchasereturns_items_total_cost` decimal(10,2) DEFAULT NULL,
  `purchasereturns_items_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblpurchasereturns_items`
--

INSERT INTO `tblpurchasereturns_items` (`purchasereturns_items_id`, `purchasereturns_items_return_id`, `purchasereturns_items_item_id`, `purchasereturns_items_quantity`, `purchasereturns_items_unit_cost`, `purchasereturns_items_total_cost`, `purchasereturns_items_reason`) VALUES
(1, 1, 6, 120, 175.00, 21000.00, 'broken'),
(2, 1, 7, 20, 250.00, 5000.00, 'broken');

-- --------------------------------------------------------

--
-- Table structure for table `tblreceiving`
--

CREATE TABLE `tblreceiving` (
  `receiving_id` int(11) NOT NULL,
  `receiving_po_id` int(11) DEFAULT NULL,
  `receiving_rr_number` varchar(50) NOT NULL,
  `receiving_dr_number` varchar(50) NOT NULL,
  `receiving_warehouses_id` int(11) DEFAULT NULL,
  `receiving_supplier_id` int(11) DEFAULT NULL,
  `receiving_date` date DEFAULT NULL,
  `receiving_total_cost` decimal(10,2) DEFAULT NULL,
  `receiving_discount` decimal(10,2) DEFAULT NULL,
  `receiving_total_with_discount` decimal(10,2) DEFAULT NULL,
  `receiving_remarks` text DEFAULT NULL,
  `receiving_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `receiving_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblreceiving`
--

INSERT INTO `tblreceiving` (`receiving_id`, `receiving_po_id`, `receiving_rr_number`, `receiving_dr_number`, `receiving_warehouses_id`, `receiving_supplier_id`, `receiving_date`, `receiving_total_cost`, `receiving_discount`, `receiving_total_with_discount`, `receiving_remarks`, `receiving_created_at`, `receiving_updated_at`) VALUES
(1, 6, '4250', '4250', 1, 3, '2026-01-21', 650.00, 0.00, 650.00, '', '2026-01-20 20:14:59', '2026-01-20 20:14:59'),
(2, 5, '2250', '1520', 1, 2, '2026-01-21', 60000.00, 0.00, 60000.00, '', '2026-01-20 20:19:40', '2026-01-20 20:19:40'),
(3, 4, '1235', '123545', 1, 4, '2026-01-21', 50400.00, 0.00, 50400.00, '', '2026-01-20 20:30:48', '2026-01-20 20:30:48'),
(4, 1, '4520', '3450', 1, 4, '2026-01-21', 26000.00, 0.00, 26000.00, '', '2026-01-20 20:31:15', '2026-01-20 20:31:15');

-- --------------------------------------------------------

--
-- Table structure for table `tblreceiving_items`
--

CREATE TABLE `tblreceiving_items` (
  `receiving_items_id` int(11) NOT NULL,
  `receiving_items_receiving_id` int(11) DEFAULT NULL,
  `receiving_items_item_id` int(11) DEFAULT NULL,
  `receiving_items_quantity_received` int(11) DEFAULT NULL,
  `receiving_items_unit_cost` decimal(10,2) DEFAULT NULL,
  `receiving_items_total_cost` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblreceiving_items`
--

INSERT INTO `tblreceiving_items` (`receiving_items_id`, `receiving_items_receiving_id`, `receiving_items_item_id`, `receiving_items_quantity_received`, `receiving_items_unit_cost`, `receiving_items_total_cost`) VALUES
(1, 1, 7, 1, 325.00, 325.00),
(2, 1, 7, 1, 325.00, 325.00),
(3, 2, 14, 150, 400.00, 60000.00),
(4, 3, 14, 120, 420.00, 50400.00),
(5, 4, 7, 20, 250.00, 5000.00),
(6, 4, 6, 120, 175.00, 21000.00);

-- --------------------------------------------------------

--
-- Table structure for table `tblschoolyear`
--

CREATE TABLE `tblschoolyear` (
  `schoolyear_id` int(11) NOT NULL,
  `schoolyear_name` varchar(20) NOT NULL,
  `schoolyear_is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblschoolyear`
--

INSERT INTO `tblschoolyear` (`schoolyear_id`, `schoolyear_name`, `schoolyear_is_active`) VALUES
(1, '1st Year', 1),
(2, '2nd Year', 1),
(3, '3rd Year', 1),
(4, '4th Year', 1),
(5, '5th Year', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tblsizes`
--

CREATE TABLE `tblsizes` (
  `sizes_id` int(11) NOT NULL,
  `sizes_name` varchar(50) NOT NULL,
  `sizes_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sizes_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblsizes`
--

INSERT INTO `tblsizes` (`sizes_id`, `sizes_name`, `sizes_created_at`, `sizes_updated_at`) VALUES
(1, 'Large (L)', '2025-08-28 13:00:07', '2025-08-28 13:00:07'),
(2, 'Small (S)', '2025-08-28 13:00:16', '2025-08-28 13:00:16'),
(3, 'Extra Small (XS)', '2025-08-28 13:00:27', '2025-08-28 13:00:27'),
(4, 'Medium (M)', '2025-08-28 13:00:33', '2025-08-28 13:00:33');

-- --------------------------------------------------------

--
-- Table structure for table `tblstocklevels`
--

CREATE TABLE `tblstocklevels` (
  `stocklevels_id` int(11) NOT NULL,
  `stocklevels_item_id` int(11) DEFAULT NULL,
  `stocklevels_warehouse_id` int(11) DEFAULT NULL,
  `stocklevels_quantity_in_stock` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblstocklevels`
--

INSERT INTO `tblstocklevels` (`stocklevels_id`, `stocklevels_item_id`, `stocklevels_warehouse_id`, `stocklevels_quantity_in_stock`) VALUES
(1, 14, 1, 40),
(2, 7, 1, 0),
(3, 6, 1, 0),
(4, 14, 3, 100);

-- --------------------------------------------------------

--
-- Table structure for table `tblsuppliers`
--

CREATE TABLE `tblsuppliers` (
  `suppliers_id` int(11) NOT NULL,
  `suppliers_name` varchar(255) NOT NULL,
  `suppliers_address` text DEFAULT NULL,
  `suppliers_email` varchar(255) DEFAULT NULL,
  `suppliers_phone` varchar(50) DEFAULT NULL,
  `suppliers_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `suppliers_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblsuppliers`
--

INSERT INTO `tblsuppliers` (`suppliers_id`, `suppliers_name`, `suppliers_address`, `suppliers_email`, `suppliers_phone`, `suppliers_created_at`, `suppliers_updated_at`) VALUES
(1, 'Phoenix Publishing', 'Davao City, Mindanao, Philippines', 'phoenixpub@gmail.com', '09262353430', '2025-08-28 13:09:23', '2025-08-28 13:09:23'),
(2, 'Ahuk Bato', 'Ahuk, Marawi', 'ahuk@gmail.com', '09235346420', '2025-08-28 13:09:54', '2025-08-28 13:09:54'),
(3, 'JADE BOOKSTORE', '8000, Davao City, Davao del Sur', '', '', '2025-08-28 14:33:32', '2025-09-04 16:40:47'),
(4, 'D\'GARMENTS', '9000, Cagayan de Oro City, Misamis Oriental\n', '', '09262353430', '2025-08-28 14:34:07', '2025-08-28 15:12:21');

-- --------------------------------------------------------

--
-- Table structure for table `tblusers`
--

CREATE TABLE `tblusers` (
  `users_id` int(11) NOT NULL,
  `users_school_id` varchar(50) NOT NULL,
  `users_lastname` varchar(255) NOT NULL,
  `users_firstname` varchar(255) NOT NULL,
  `users_middlename` varchar(255) DEFAULT NULL,
  `users_suffix` varchar(50) DEFAULT NULL,
  `users_email` varchar(255) NOT NULL,
  `users_contact` varchar(20) NOT NULL,
  `users_password` varchar(255) NOT NULL DEFAULT 'phinma-coc',
  `users_course_id` int(11) DEFAULT NULL,
  `users_schoolyear_id` int(11) DEFAULT NULL,
  `users_campus_id` int(11) DEFAULT 1,
  `users_type_id` int(11) NOT NULL,
  `users_modality_id` int(11) DEFAULT 1,
  `users_status` tinyint(1) NOT NULL DEFAULT 1,
  `users_level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblusers`
--

INSERT INTO `tblusers` (`users_id`, `users_school_id`, `users_lastname`, `users_firstname`, `users_middlename`, `users_suffix`, `users_email`, `users_contact`, `users_password`, `users_course_id`, `users_schoolyear_id`, `users_campus_id`, `users_type_id`, `users_modality_id`, `users_status`, `users_level`) VALUES
(2, '02-2324-13450', 'Emborgo', 'Neil', '', '', 'nena.emborgo.coc@phinmaed.com', '09123456789', '$2y$10$MuwlNTWsfpU35/wG2QjDSOQVY9Y1nLvNJwA8IGQ7PK2OV5K5UGmiG', NULL, NULL, 1, 6, 1, 1, 100),
(5, '02-2342-13451', 'Pabellan', 'Romeo', 'Montes', '', 'romo.pabellan.coc@phinmaed.com', '09262353420', '$2y$10$ITDge80hgdVlNBa.Gyi46u5D0.i.bR.39kRtiGOAlG/bha2ghUUmm', NULL, NULL, 1, 5, 1, 1, 50);

-- --------------------------------------------------------

--
-- Table structure for table `tblusertype`
--

CREATE TABLE `tblusertype` (
  `usertype_id` int(11) NOT NULL,
  `usertype_name` varchar(255) NOT NULL,
  `usertype_default_level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblusertype`
--

INSERT INTO `tblusertype` (`usertype_id`, `usertype_name`, `usertype_default_level`) VALUES
(1, 'Inventory Clerk', 10),
(2, 'Warehouse Manager', 50),
(3, 'Department Head', 50),
(4, 'IT Coordinator', 50),
(5, 'Procurement Manager', 50),
(6, 'Administrator', 100);

-- --------------------------------------------------------

--
-- Table structure for table `tblwarehouses`
--

CREATE TABLE `tblwarehouses` (
  `warehouses_id` int(11) NOT NULL,
  `warehouses_name` varchar(255) NOT NULL,
  `warehouses_location` text DEFAULT NULL,
  `warehouses_created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `warehouses_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblwarehouses`
--

INSERT INTO `tblwarehouses` (`warehouses_id`, `warehouses_name`, `warehouses_location`, `warehouses_created_at`, `warehouses_updated_at`) VALUES
(1, 'Uniform Releasing Room', 'MS, Near CL5, COC, Carmen\n', '2025-08-28 13:10:51', '2025-08-28 15:13:54'),
(3, 'Warehouse 1', 'MS Lobby', '2026-01-20 20:33:08', '2026-01-20 20:33:08');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_audit_log`
--

CREATE TABLE `tbl_audit_log` (
  `audit_id` int(11) NOT NULL,
  `table_name` varchar(255) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `action_type` enum('INSERT','UPDATE','DELETE') DEFAULT NULL,
  `action_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_audit_log`
--

INSERT INTO `tbl_audit_log` (`audit_id`, `table_name`, `record_id`, `action_type`, `action_date`, `user_id`) VALUES
(1, 'tblpurchaseorders', 6, 'INSERT', '2026-01-20 19:57:01', 2),
(2, 'tblreceiving', 1, 'INSERT', '2026-01-20 20:14:59', 2),
(3, 'tblpurchaseorders', 6, 'UPDATE', '2026-01-20 20:14:59', 2),
(4, 'tblreceiving', 2, 'INSERT', '2026-01-20 20:19:40', 2),
(5, 'tblpurchaseorders', 5, 'UPDATE', '2026-01-20 20:19:40', 2),
(6, 'tblinventory_adjustment', 1, 'INSERT', '2026-01-20 20:28:51', 2),
(7, 'tblinventory_adjustment', 1, 'UPDATE', '2026-01-20 20:29:14', 2),
(8, 'tblreceiving', 3, 'INSERT', '2026-01-20 20:30:48', 2),
(9, 'tblpurchaseorders', 4, 'UPDATE', '2026-01-20 20:30:48', 2),
(10, 'tblreceiving', 4, 'INSERT', '2026-01-20 20:31:15', 2),
(11, 'tblpurchaseorders', 1, 'UPDATE', '2026-01-20 20:31:15', 2),
(12, 'tblpurchasereturns', 1, 'INSERT', '2026-01-20 20:32:24', 2),
(13, 'tblpurchasereturns', 1, 'UPDATE', '2026-01-20 20:32:41', 2),
(14, 'tblinventory_transfer', 1, 'INSERT', '2026-01-20 20:33:30', 2),
(15, 'tblinventory_transfer', 1, 'UPDATE', '2026-01-20 20:33:38', 2);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tblbookissuances`
--
ALTER TABLE `tblbookissuances`
  ADD PRIMARY KEY (`bookissuances_id`),
  ADD KEY `bookissuances_student_id` (`bookissuances_student_id`);

--
-- Indexes for table `tblbookissuance_items`
--
ALTER TABLE `tblbookissuance_items`
  ADD PRIMARY KEY (`bookissuance_items_id`),
  ADD KEY `bookissuance_items_issuance_id` (`bookissuance_items_issuance_id`),
  ADD KEY `bookissuance_items_item_id` (`bookissuance_items_item_id`);

--
-- Indexes for table `tblcampus`
--
ALTER TABLE `tblcampus`
  ADD PRIMARY KEY (`campus_id`);

--
-- Indexes for table `tblcourses`
--
ALTER TABLE `tblcourses`
  ADD PRIMARY KEY (`courses_id`),
  ADD KEY `courses_department_id` (`courses_department_id`);

--
-- Indexes for table `tbldepartments`
--
ALTER TABLE `tbldepartments`
  ADD PRIMARY KEY (`departments_id`);

--
-- Indexes for table `tblinventory_adjustment`
--
ALTER TABLE `tblinventory_adjustment`
  ADD PRIMARY KEY (`adjustment_id`),
  ADD KEY `adjustment_approved_by` (`adjustment_approved_by`);

--
-- Indexes for table `tblinventory_adjustment_items`
--
ALTER TABLE `tblinventory_adjustment_items`
  ADD PRIMARY KEY (`adjustment_items_id`),
  ADD KEY `adjustment_items_adjustment_id` (`adjustment_items_adjustment_id`),
  ADD KEY `adjustment_items_item_id` (`adjustment_items_item_id`);

--
-- Indexes for table `tblinventory_transfer`
--
ALTER TABLE `tblinventory_transfer`
  ADD PRIMARY KEY (`transfer_id`),
  ADD KEY `transfer_source_warehouse_id` (`transfer_source_warehouse_id`),
  ADD KEY `transfer_destination_warehouse_id` (`transfer_destination_warehouse_id`);

--
-- Indexes for table `tblinventory_transfer_items`
--
ALTER TABLE `tblinventory_transfer_items`
  ADD PRIMARY KEY (`transfer_items_id`),
  ADD KEY `transfer_items_transfer_id` (`transfer_items_transfer_id`),
  ADD KEY `transfer_items_item_id` (`transfer_items_item_id`);

--
-- Indexes for table `tblitems`
--
ALTER TABLE `tblitems`
  ADD PRIMARY KEY (`items_id`),
  ADD KEY `items_category_id` (`items_category_id`),
  ADD KEY `items_supplier_id` (`items_supplier_id`),
  ADD KEY `items_size_id` (`items_size_id`);

--
-- Indexes for table `tblitems_category`
--
ALTER TABLE `tblitems_category`
  ADD PRIMARY KEY (`items_category_id`);

--
-- Indexes for table `tblitem_costs`
--
ALTER TABLE `tblitem_costs`
  ADD PRIMARY KEY (`item_costs_id`),
  ADD KEY `item_costs_item_id` (`item_costs_item_id`),
  ADD KEY `item_costs_created_by` (`item_costs_created_by`);

--
-- Indexes for table `tblmodality`
--
ALTER TABLE `tblmodality`
  ADD PRIMARY KEY (`modality_id`);

--
-- Indexes for table `tblpurchaseorders`
--
ALTER TABLE `tblpurchaseorders`
  ADD PRIMARY KEY (`purchaseorders_id`),
  ADD KEY `purchaseorders_supplier_id` (`purchaseorders_supplier_id`),
  ADD KEY `purchaseorders_status` (`purchaseorders_status`) USING BTREE;

--
-- Indexes for table `tblpurchaseorders_statuses`
--
ALTER TABLE `tblpurchaseorders_statuses`
  ADD PRIMARY KEY (`purchaseorders_statuses_status_id`);

--
-- Indexes for table `tblpurchaseorders_status_update`
--
ALTER TABLE `tblpurchaseorders_status_update`
  ADD PRIMARY KEY (`purchaseorders_status_update_id`),
  ADD KEY `purchaseorders_status_update_purchaseorders_id` (`purchaseorders_status_update_purchaseorders_id`);

--
-- Indexes for table `tblpurchaseorder_items`
--
ALTER TABLE `tblpurchaseorder_items`
  ADD PRIMARY KEY (`purchaseorder_items_id`),
  ADD KEY `purchaseorder_items_po_id` (`purchaseorder_items_po_id`),
  ADD KEY `purchaseorder_items_item_id` (`purchaseorder_items_item_id`);

--
-- Indexes for table `tblpurchasereturns`
--
ALTER TABLE `tblpurchasereturns`
  ADD PRIMARY KEY (`purchasereturns_id`),
  ADD KEY `purchasereturns_po_id` (`purchasereturns_po_id`),
  ADD KEY `purchasereturns_supplier_id` (`purchasereturns_supplier_id`),
  ADD KEY `purchasereturns_warehouse_id` (`purchasereturns_warehouse_id`);

--
-- Indexes for table `tblpurchasereturns_items`
--
ALTER TABLE `tblpurchasereturns_items`
  ADD PRIMARY KEY (`purchasereturns_items_id`),
  ADD KEY `purchasereturns_items_return_id` (`purchasereturns_items_return_id`),
  ADD KEY `purchasereturns_items_item_id` (`purchasereturns_items_item_id`);

--
-- Indexes for table `tblreceiving`
--
ALTER TABLE `tblreceiving`
  ADD PRIMARY KEY (`receiving_id`),
  ADD KEY `receiving_po_id` (`receiving_po_id`),
  ADD KEY `receiving_warehouses_id` (`receiving_warehouses_id`),
  ADD KEY `receiving_supplier_id` (`receiving_supplier_id`);

--
-- Indexes for table `tblreceiving_items`
--
ALTER TABLE `tblreceiving_items`
  ADD PRIMARY KEY (`receiving_items_id`),
  ADD KEY `receiving_items_receiving_id` (`receiving_items_receiving_id`),
  ADD KEY `receiving_items_item_id` (`receiving_items_item_id`);

--
-- Indexes for table `tblschoolyear`
--
ALTER TABLE `tblschoolyear`
  ADD PRIMARY KEY (`schoolyear_id`);

--
-- Indexes for table `tblsizes`
--
ALTER TABLE `tblsizes`
  ADD PRIMARY KEY (`sizes_id`);

--
-- Indexes for table `tblstocklevels`
--
ALTER TABLE `tblstocklevels`
  ADD PRIMARY KEY (`stocklevels_id`),
  ADD KEY `stocklevels_item_id` (`stocklevels_item_id`),
  ADD KEY `stocklevels_warehouse_id` (`stocklevels_warehouse_id`);

--
-- Indexes for table `tblsuppliers`
--
ALTER TABLE `tblsuppliers`
  ADD PRIMARY KEY (`suppliers_id`);

--
-- Indexes for table `tblusers`
--
ALTER TABLE `tblusers`
  ADD PRIMARY KEY (`users_id`),
  ADD KEY `users_course_id` (`users_course_id`),
  ADD KEY `users_schoolyear_id` (`users_schoolyear_id`),
  ADD KEY `users_campus_id` (`users_campus_id`),
  ADD KEY `users_type_id` (`users_type_id`),
  ADD KEY `users_modality_id` (`users_modality_id`);

--
-- Indexes for table `tblusertype`
--
ALTER TABLE `tblusertype`
  ADD PRIMARY KEY (`usertype_id`);

--
-- Indexes for table `tblwarehouses`
--
ALTER TABLE `tblwarehouses`
  ADD PRIMARY KEY (`warehouses_id`);

--
-- Indexes for table `tbl_audit_log`
--
ALTER TABLE `tbl_audit_log`
  ADD PRIMARY KEY (`audit_id`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tblbookissuances`
--
ALTER TABLE `tblbookissuances`
  MODIFY `bookissuances_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tblbookissuance_items`
--
ALTER TABLE `tblbookissuance_items`
  MODIFY `bookissuance_items_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tblcampus`
--
ALTER TABLE `tblcampus`
  MODIFY `campus_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblcourses`
--
ALTER TABLE `tblcourses`
  MODIFY `courses_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `tbldepartments`
--
ALTER TABLE `tbldepartments`
  MODIFY `departments_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `tblinventory_adjustment`
--
ALTER TABLE `tblinventory_adjustment`
  MODIFY `adjustment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblinventory_adjustment_items`
--
ALTER TABLE `tblinventory_adjustment_items`
  MODIFY `adjustment_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblinventory_transfer`
--
ALTER TABLE `tblinventory_transfer`
  MODIFY `transfer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblinventory_transfer_items`
--
ALTER TABLE `tblinventory_transfer_items`
  MODIFY `transfer_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblitems`
--
ALTER TABLE `tblitems`
  MODIFY `items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `tblitems_category`
--
ALTER TABLE `tblitems_category`
  MODIFY `items_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tblitem_costs`
--
ALTER TABLE `tblitem_costs`
  MODIFY `item_costs_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tblmodality`
--
ALTER TABLE `tblmodality`
  MODIFY `modality_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblpurchaseorders`
--
ALTER TABLE `tblpurchaseorders`
  MODIFY `purchaseorders_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tblpurchaseorders_statuses`
--
ALTER TABLE `tblpurchaseorders_statuses`
  MODIFY `purchaseorders_statuses_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tblpurchaseorders_status_update`
--
ALTER TABLE `tblpurchaseorders_status_update`
  MODIFY `purchaseorders_status_update_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `tblpurchaseorder_items`
--
ALTER TABLE `tblpurchaseorder_items`
  MODIFY `purchaseorder_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tblpurchasereturns`
--
ALTER TABLE `tblpurchasereturns`
  MODIFY `purchasereturns_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblpurchasereturns_items`
--
ALTER TABLE `tblpurchasereturns_items`
  MODIFY `purchasereturns_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tblreceiving`
--
ALTER TABLE `tblreceiving`
  MODIFY `receiving_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tblreceiving_items`
--
ALTER TABLE `tblreceiving_items`
  MODIFY `receiving_items_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tblschoolyear`
--
ALTER TABLE `tblschoolyear`
  MODIFY `schoolyear_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tblsizes`
--
ALTER TABLE `tblsizes`
  MODIFY `sizes_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tblstocklevels`
--
ALTER TABLE `tblstocklevels`
  MODIFY `stocklevels_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tblsuppliers`
--
ALTER TABLE `tblsuppliers`
  MODIFY `suppliers_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tblusers`
--
ALTER TABLE `tblusers`
  MODIFY `users_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tblusertype`
--
ALTER TABLE `tblusertype`
  MODIFY `usertype_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tblwarehouses`
--
ALTER TABLE `tblwarehouses`
  MODIFY `warehouses_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tbl_audit_log`
--
ALTER TABLE `tbl_audit_log`
  MODIFY `audit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tblbookissuances`
--
ALTER TABLE `tblbookissuances`
  ADD CONSTRAINT `tblbookissuances_ibfk_1` FOREIGN KEY (`bookissuances_student_id`) REFERENCES `tblusers` (`users_id`);

--
-- Constraints for table `tblbookissuance_items`
--
ALTER TABLE `tblbookissuance_items`
  ADD CONSTRAINT `tblbookissuance_items_ibfk_1` FOREIGN KEY (`bookissuance_items_issuance_id`) REFERENCES `tblbookissuances` (`bookissuances_id`),
  ADD CONSTRAINT `tblbookissuance_items_ibfk_2` FOREIGN KEY (`bookissuance_items_item_id`) REFERENCES `tblitems` (`items_id`);

--
-- Constraints for table `tblcourses`
--
ALTER TABLE `tblcourses`
  ADD CONSTRAINT `tblcourses_ibfk_1` FOREIGN KEY (`courses_department_id`) REFERENCES `tbldepartments` (`departments_id`);

--
-- Constraints for table `tblinventory_adjustment`
--
ALTER TABLE `tblinventory_adjustment`
  ADD CONSTRAINT `tblinventory_adjustment_ibfk_1` FOREIGN KEY (`adjustment_approved_by`) REFERENCES `tblusers` (`users_id`);

--
-- Constraints for table `tblinventory_adjustment_items`
--
ALTER TABLE `tblinventory_adjustment_items`
  ADD CONSTRAINT `tblinventory_adjustment_items_ibfk_1` FOREIGN KEY (`adjustment_items_adjustment_id`) REFERENCES `tblinventory_adjustment` (`adjustment_id`),
  ADD CONSTRAINT `tblinventory_adjustment_items_ibfk_2` FOREIGN KEY (`adjustment_items_item_id`) REFERENCES `tblitems` (`items_id`);

--
-- Constraints for table `tblinventory_transfer`
--
ALTER TABLE `tblinventory_transfer`
  ADD CONSTRAINT `tblinventory_transfer_ibfk_1` FOREIGN KEY (`transfer_source_warehouse_id`) REFERENCES `tblwarehouses` (`warehouses_id`),
  ADD CONSTRAINT `tblinventory_transfer_ibfk_2` FOREIGN KEY (`transfer_destination_warehouse_id`) REFERENCES `tblwarehouses` (`warehouses_id`);

--
-- Constraints for table `tblinventory_transfer_items`
--
ALTER TABLE `tblinventory_transfer_items`
  ADD CONSTRAINT `tblinventory_transfer_items_ibfk_1` FOREIGN KEY (`transfer_items_transfer_id`) REFERENCES `tblinventory_transfer` (`transfer_id`),
  ADD CONSTRAINT `tblinventory_transfer_items_ibfk_2` FOREIGN KEY (`transfer_items_item_id`) REFERENCES `tblitems` (`items_id`);

--
-- Constraints for table `tblitems`
--
ALTER TABLE `tblitems`
  ADD CONSTRAINT `tblitems_ibfk_1` FOREIGN KEY (`items_category_id`) REFERENCES `tblitems_category` (`items_category_id`),
  ADD CONSTRAINT `tblitems_ibfk_2` FOREIGN KEY (`items_supplier_id`) REFERENCES `tblsuppliers` (`suppliers_id`),
  ADD CONSTRAINT `tblitems_ibfk_3` FOREIGN KEY (`items_size_id`) REFERENCES `tblsizes` (`sizes_id`);

--
-- Constraints for table `tblitem_costs`
--
ALTER TABLE `tblitem_costs`
  ADD CONSTRAINT `tblitem_costs_ibfk_1` FOREIGN KEY (`item_costs_item_id`) REFERENCES `tblitems` (`items_id`),
  ADD CONSTRAINT `tblitem_costs_ibfk_2` FOREIGN KEY (`item_costs_created_by`) REFERENCES `tblusers` (`users_id`);

--
-- Constraints for table `tblpurchaseorders`
--
ALTER TABLE `tblpurchaseorders`
  ADD CONSTRAINT `tblpurchaseorders_ibfk_1` FOREIGN KEY (`purchaseorders_supplier_id`) REFERENCES `tblsuppliers` (`suppliers_id`),
  ADD CONSTRAINT `tblpurchaseorders_ibfk_2` FOREIGN KEY (`purchaseorders_status`) REFERENCES `tblpurchaseorders_statuses` (`purchaseorders_statuses_status_id`);

--
-- Constraints for table `tblpurchaseorders_status_update`
--
ALTER TABLE `tblpurchaseorders_status_update`
  ADD CONSTRAINT `tblpurchaseorders_status_update_ibfk_1` FOREIGN KEY (`purchaseorders_status_update_purchaseorders_id`) REFERENCES `tblpurchaseorders` (`purchaseorders_id`);

--
-- Constraints for table `tblpurchaseorder_items`
--
ALTER TABLE `tblpurchaseorder_items`
  ADD CONSTRAINT `tblpurchaseorder_items_ibfk_1` FOREIGN KEY (`purchaseorder_items_po_id`) REFERENCES `tblpurchaseorders` (`purchaseorders_id`),
  ADD CONSTRAINT `tblpurchaseorder_items_ibfk_2` FOREIGN KEY (`purchaseorder_items_item_id`) REFERENCES `tblitems` (`items_id`);

--
-- Constraints for table `tblpurchasereturns`
--
ALTER TABLE `tblpurchasereturns`
  ADD CONSTRAINT `tblpurchasereturns_ibfk_1` FOREIGN KEY (`purchasereturns_po_id`) REFERENCES `tblpurchaseorders` (`purchaseorders_id`),
  ADD CONSTRAINT `tblpurchasereturns_ibfk_2` FOREIGN KEY (`purchasereturns_supplier_id`) REFERENCES `tblsuppliers` (`suppliers_id`),
  ADD CONSTRAINT `tblpurchasereturns_ibfk_3` FOREIGN KEY (`purchasereturns_warehouse_id`) REFERENCES `tblwarehouses` (`warehouses_id`);

--
-- Constraints for table `tblpurchasereturns_items`
--
ALTER TABLE `tblpurchasereturns_items`
  ADD CONSTRAINT `tblpurchasereturns_items_ibfk_1` FOREIGN KEY (`purchasereturns_items_return_id`) REFERENCES `tblpurchasereturns` (`purchasereturns_id`),
  ADD CONSTRAINT `tblpurchasereturns_items_ibfk_2` FOREIGN KEY (`purchasereturns_items_item_id`) REFERENCES `tblitems` (`items_id`);

--
-- Constraints for table `tblreceiving`
--
ALTER TABLE `tblreceiving`
  ADD CONSTRAINT `tblreceiving_ibfk_1` FOREIGN KEY (`receiving_po_id`) REFERENCES `tblpurchaseorders` (`purchaseorders_id`),
  ADD CONSTRAINT `tblreceiving_ibfk_2` FOREIGN KEY (`receiving_warehouses_id`) REFERENCES `tblwarehouses` (`warehouses_id`),
  ADD CONSTRAINT `tblreceiving_ibfk_3` FOREIGN KEY (`receiving_supplier_id`) REFERENCES `tblsuppliers` (`suppliers_id`);

--
-- Constraints for table `tblreceiving_items`
--
ALTER TABLE `tblreceiving_items`
  ADD CONSTRAINT `tblreceiving_items_ibfk_1` FOREIGN KEY (`receiving_items_receiving_id`) REFERENCES `tblreceiving` (`receiving_id`),
  ADD CONSTRAINT `tblreceiving_items_ibfk_2` FOREIGN KEY (`receiving_items_item_id`) REFERENCES `tblitems` (`items_id`);

--
-- Constraints for table `tblstocklevels`
--
ALTER TABLE `tblstocklevels`
  ADD CONSTRAINT `tblstocklevels_ibfk_1` FOREIGN KEY (`stocklevels_item_id`) REFERENCES `tblitems` (`items_id`),
  ADD CONSTRAINT `tblstocklevels_ibfk_2` FOREIGN KEY (`stocklevels_warehouse_id`) REFERENCES `tblwarehouses` (`warehouses_id`);

--
-- Constraints for table `tblusers`
--
ALTER TABLE `tblusers`
  ADD CONSTRAINT `tblusers_ibfk_1` FOREIGN KEY (`users_course_id`) REFERENCES `tblcourses` (`courses_id`),
  ADD CONSTRAINT `tblusers_ibfk_2` FOREIGN KEY (`users_schoolyear_id`) REFERENCES `tblschoolyear` (`schoolyear_id`),
  ADD CONSTRAINT `tblusers_ibfk_3` FOREIGN KEY (`users_campus_id`) REFERENCES `tblcampus` (`campus_id`),
  ADD CONSTRAINT `tblusers_ibfk_4` FOREIGN KEY (`users_type_id`) REFERENCES `tblusertype` (`usertype_id`),
  ADD CONSTRAINT `tblusers_ibfk_5` FOREIGN KEY (`users_modality_id`) REFERENCES `tblmodality` (`modality_id`);

--
-- Constraints for table `tbl_audit_log`
--
ALTER TABLE `tbl_audit_log`
  ADD CONSTRAINT `tbl_audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tblusers` (`users_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
