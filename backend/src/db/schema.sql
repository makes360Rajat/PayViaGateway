-- PayVia Gateway Production MySQL Database Schema
-- Database: u586615155_payvia_db

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'MERCHANT',
  `business_name` VARCHAR(255) NULL,
  `phone` VARCHAR(64) NULL,
  `plan_id` VARCHAR(64) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `plans` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `validity_days` INT NOT NULL,
  `max_merchant_accounts` INT NOT NULL,
  `max_orders_per_day` INT NOT NULL,
  `max_api_keys` INT NOT NULL,
  `features_json` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `tenant_id` VARCHAR(64) NOT NULL,
  `plan_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `starts_at` VARCHAR(64) NOT NULL,
  `expires_at` VARCHAR(64) NOT NULL,
  `orders_today` INT NOT NULL DEFAULT 0,
  `last_reset_date` VARCHAR(32) NOT NULL,
  INDEX (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `merchants` (
  `id` VARCHAR(64) PRIMARY KEY,
  `tenant_id` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(64) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `upi_id` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(255) NOT NULL,
  `weight` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `intent_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `gmail_connected` TINYINT(1) NOT NULL DEFAULT 0,
  `gmail_email` VARCHAR(255) NULL,
  `credentials_json` TEXT NULL,
  `sms_count` INT NOT NULL DEFAULT 0,
  `last_used_at` VARCHAR(64) NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  INDEX (`tenant_id`),
  INDEX (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `devices` (
  `id` VARCHAR(64) PRIMARY KEY,
  `tenant_id` VARCHAR(64) NOT NULL,
  `device_name` VARCHAR(255) NOT NULL,
  `device_token` VARCHAR(255) NOT NULL UNIQUE,
  `pairing_code` VARCHAR(64) NULL,
  `sim_slots_json` TEXT NULL,
  `battery_level` INT NOT NULL DEFAULT 100,
  `is_online` TINYINT(1) NOT NULL DEFAULT 1,
  `last_heartbeat_at` VARCHAR(64) NOT NULL,
  `sms_captured_count` INT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(64) NOT NULL,
  INDEX (`tenant_id`),
  INDEX (`pairing_code`),
  INDEX (`device_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` VARCHAR(64) PRIMARY KEY,
  `tenant_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `key_prefix` VARCHAR(32) NOT NULL,
  `raw_key` VARCHAR(255) NOT NULL UNIQUE,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` VARCHAR(64) NOT NULL,
  `last_used_at` VARCHAR(64) NULL,
  INDEX (`tenant_id`),
  INDEX (`raw_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `order_id` VARCHAR(128) NOT NULL UNIQUE,
  `tenant_id` VARCHAR(64) NOT NULL,
  `api_key_id` VARCHAR(64) NULL,
  `merchant_account_id` VARCHAR(64) NOT NULL,
  `merchant_account_label` VARCHAR(255) NOT NULL,
  `provider` VARCHAR(64) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `currency` VARCHAR(16) NOT NULL DEFAULT 'INR',
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `utr` VARCHAR(64) NULL,
  `gateway_txn_id` VARCHAR(128) NULL,
  `customer_mobile` VARCHAR(64) NULL,
  `customer_name` VARCHAR(255) NULL,
  `customer_email` VARCHAR(255) NULL,
  `remark1` VARCHAR(255) NULL,
  `remark2` VARCHAR(255) NULL,
  `return_url` TEXT NULL,
  `callback_url` TEXT NULL,
  `template` VARCHAR(64) NOT NULL DEFAULT 'MODERN_DARK',
  `link_token` VARCHAR(64) NOT NULL UNIQUE,
  `payment_url` TEXT NOT NULL,
  `paid_at` VARCHAR(64) NULL,
  `expires_at` VARCHAR(64) NOT NULL,
  `raw_verification_data_json` TEXT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  INDEX (`tenant_id`),
  INDEX (`order_id`),
  INDEX (`link_token`),
  INDEX (`status`),
  INDEX (`utr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `webhook_logs` (
  `id` VARCHAR(64) PRIMARY KEY,
  `order_id` VARCHAR(128) NOT NULL,
  `tenant_id` VARCHAR(64) NOT NULL,
  `url` TEXT NOT NULL,
  `event` VARCHAR(64) NOT NULL,
  `payload_json` TEXT NOT NULL,
  `response_status` INT NULL,
  `response_body` TEXT NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `attempt_count` INT NOT NULL DEFAULT 1,
  `created_at` VARCHAR(64) NOT NULL,
  INDEX (`order_id`),
  INDEX (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sms_logs` (
  `id` VARCHAR(64) PRIMARY KEY,
  `device_id` VARCHAR(64) NOT NULL,
  `tenant_id` VARCHAR(64) NOT NULL,
  `sender` VARCHAR(128) NOT NULL,
  `message` TEXT NOT NULL,
  `parsed_amount` DECIMAL(12,2) NULL,
  `parsed_utr` VARCHAR(64) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'UNMATCHED',
  `matched_order_id` VARCHAR(128) NULL,
  `received_at` VARCHAR(64) NOT NULL,
  INDEX (`tenant_id`),
  INDEX (`parsed_utr`),
  INDEX (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `template_settings` (
  `id` VARCHAR(64) PRIMARY KEY,
  `tenant_id` VARCHAR(64) NOT NULL UNIQUE,
  `template_name` VARCHAR(64) NOT NULL DEFAULT 'MODERN_DARK',
  `brand_name` VARCHAR(255) NULL,
  `primary_color` VARCHAR(32) NULL,
  `logo_url` TEXT NULL,
  `custom_css` TEXT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  INDEX (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
