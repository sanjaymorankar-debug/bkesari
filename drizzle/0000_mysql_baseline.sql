CREATE TABLE `accounts` (
	`user_id` varchar(36) NOT NULL,
	`type` text NOT NULL,
	`provider` varchar(255) NOT NULL,
	`provider_account_id` varchar(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	CONSTRAINT `accounts_provider_provider_account_id_pk` PRIMARY KEY(`provider`,`provider_account_id`)
);
--> statement-breakpoint
CREATE TABLE `addresses` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`label` text,
	`line1` text NOT NULL,
	`line2` text,
	`area` text,
	`city` varchar(160) NOT NULL,
	`state` text,
	`pincode` varchar(12) NOT NULL,
	`latitude` text,
	`longitude` text,
	`landmark` text,
	`delivery_instructions` text,
	`is_default` boolean NOT NULL DEFAULT false,
	`location_verified` boolean NOT NULL DEFAULT false,
	`location_verified_at` timestamp(6),
	`location_source` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`actor_role` enum('CUSTOMER','SHOP_OWNER','OPERATOR','ADMIN','DELIVERY_PARTNER'),
	`action` text NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` varchar(64),
	`previous_value` json,
	`new_value` json,
	`ip_address` text,
	`user_agent` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` varchar(36) NOT NULL,
	`cart_id` varchar(36) NOT NULL,
	`shop_product_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_cart_product_unique` UNIQUE(`cart_id`,`shop_product_id`),
	CONSTRAINT `cart_items_quantity_positive` CHECK(`cart_items`.`quantity` > 0)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_user_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_earnings_config` (
	`id` varchar(36) NOT NULL,
	`base_fee_paise` bigint NOT NULL,
	`per_km_fee_paise` bigint NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`note` text,
	`created_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `delivery_earnings_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_earnings_config_non_negative` CHECK(`delivery_earnings_config`.`base_fee_paise` >= 0 AND `delivery_earnings_config`.`per_km_fee_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `delivery_orders` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`delivery_partner_id` varchar(36) NOT NULL,
	`status` enum('OFFERED','ACCEPTED','REJECTED','PICKED_UP','DELIVERED','CANCELLED') NOT NULL DEFAULT 'OFFERED',
	`distance_km` text,
	`offered_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`accepted_at` timestamp(6),
	`picked_up_at` timestamp(6),
	`delivered_at` timestamp(6),
	`cancelled_at` timestamp(6),
	`cancellation_reason` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `delivery_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_orders_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_partner_earnings` (
	`id` varchar(36) NOT NULL,
	`delivery_partner_id` varchar(36) NOT NULL,
	`delivery_order_id` varchar(36) NOT NULL,
	`base_paise` bigint NOT NULL,
	`distance_paise` bigint NOT NULL,
	`total_paise` bigint NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `delivery_partner_earnings_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_partner_earnings_order_unique` UNIQUE(`delivery_order_id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_partners` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`full_name` text NOT NULL,
	`mobile` text NOT NULL,
	`email` varchar(255),
	`date_of_birth` date,
	`profile_photo_url` text,
	`pan_number` text,
	`government_id_type` text,
	`government_id_number` text,
	`bank_account_holder_name` text,
	`bank_account_number` text,
	`bank_ifsc` text,
	`vehicle_type` text NOT NULL,
	`vehicle_registration_number` text,
	`driving_licence_number` text,
	`latitude` text,
	`longitude` text,
	`operating_radius_km` int NOT NULL DEFAULT 5,
	`location_verified` boolean NOT NULL DEFAULT false,
	`location_verified_at` timestamp(6),
	`location_source` text,
	`status` enum('REGISTERED','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED','DEACTIVATED') NOT NULL DEFAULT 'REGISTERED',
	`review_notes` text,
	`rejection_reason` text,
	`reviewed_by` varchar(36),
	`reviewed_at` timestamp(6),
	`is_online` boolean NOT NULL DEFAULT false,
	`last_location_latitude` text,
	`last_location_longitude` text,
	`last_location_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `delivery_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_partners_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `excel_upload_items` (
	`id` varchar(36) NOT NULL,
	`upload_id` varchar(36) NOT NULL,
	`row_number` int NOT NULL,
	`raw_data` json,
	`product_code` text,
	`product_name` text,
	`unit` text,
	`parsed_price_paise` bigint,
	`previous_price_paise` bigint,
	`matched_shop_product_id` varchar(36),
	`matched_product_id` varchar(36),
	`possible_duplicate_product_id` varchar(36),
	`status` enum('VALID','NO_CHANGE','INVALID_PRICE','DUPLICATE','NOT_FOUND','MISSING_FIELD','NEW_PRODUCT') NOT NULL,
	`error_message` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `excel_upload_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `excel_upload_items_row_unique` UNIQUE(`upload_id`,`row_number`)
);
--> statement-breakpoint
CREATE TABLE `excel_uploads` (
	`id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`uploaded_by` varchar(36) NOT NULL,
	`upload_type` enum('GOODS','PRICES') NOT NULL DEFAULT 'PRICES',
	`status` enum('VALIDATED','APPLIED','CANCELLED','FAILED') NOT NULL DEFAULT 'VALIDATED',
	`file_name` text NOT NULL,
	`file_size_bytes` int NOT NULL DEFAULT 0,
	`total_rows` int NOT NULL DEFAULT 0,
	`valid_rows` int NOT NULL DEFAULT 0,
	`invalid_rows` int NOT NULL DEFAULT 0,
	`unchanged_rows` int NOT NULL DEFAULT 0,
	`duplicate_rows` int NOT NULL DEFAULT 0,
	`not_found_rows` int NOT NULL DEFAULT 0,
	`summary` json,
	`error_message` text,
	`applied_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `excel_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grievance_ticket_seq` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	CONSTRAINT `grievance_ticket_seq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grievances` (
	`id` varchar(36) NOT NULL,
	`ticket_number` varchar(32) NOT NULL,
	`submitted_by_user_id` varchar(36),
	`name` text NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` text,
	`category` enum('PAYMENT','WALLET','ORDER','SUBSCRIPTION','SELLER','PRODUCT','PRIVACY','OTHER') NOT NULL DEFAULT 'OTHER',
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`status` enum('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`assigned_to_user_id` varchar(36),
	`resolution_notes` text,
	`resolved_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `grievances_id` PRIMARY KEY(`id`),
	CONSTRAINT `grievances_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` varchar(36) NOT NULL,
	`shop_product_id` varchar(36) NOT NULL,
	`channel` text NOT NULL,
	`delta_units` int NOT NULL,
	`previous_units` int NOT NULL,
	`new_units` int NOT NULL,
	`reason` text NOT NULL,
	`order_id` varchar(36),
	`created_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maps_api_call_log` (
	`id` varchar(36) NOT NULL,
	`service` varchar(32) NOT NULL,
	`purpose` text NOT NULL,
	`entity_type` varchar(64),
	`entity_id` varchar(64),
	`success` boolean NOT NULL,
	`response_time_ms` int,
	`error_message` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `maps_api_call_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` text NOT NULL,
	`channel` enum('IN_APP','EMAIL','SMS','PUSH') NOT NULL DEFAULT 'IN_APP',
	`title` text NOT NULL,
	`body` text NOT NULL,
	`action_url` text,
	`metadata` json,
	`read_at` timestamp(6),
	`sent_at` timestamp(6),
	`dedupe_key` varchar(191),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_dedupe_unique` UNIQUE(`dedupe_key`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`shop_product_id` varchar(36) NOT NULL,
	`product_name_snapshot` text NOT NULL,
	`unit_snapshot` text NOT NULL,
	`unit_price_paise` bigint NOT NULL,
	`quantity_milli` int NOT NULL,
	`line_total_paise` bigint NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_items_quantity_positive` CHECK(`order_items`.`quantity_milli` > 0),
	CONSTRAINT `order_items_amounts_non_negative` CHECK(`order_items`.`unit_price_paise` >= 0 AND `order_items`.`line_total_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`previous_status` enum('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','PAYMENT_FAILED','WALLET_INSUFFICIENT','REFUND_PENDING','REFUNDED'),
	`new_status` enum('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','PAYMENT_FAILED','WALLET_INSUFFICIENT','REFUND_PENDING','REFUNDED') NOT NULL,
	`changed_by` varchar(36),
	`note` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(32) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`address_id` varchar(36),
	`delivery_address_snapshot` json,
	`status` enum('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','PAYMENT_FAILED','WALLET_INSUFFICIENT','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'PENDING',
	`source` enum('DIRECT','SUBSCRIPTION') NOT NULL DEFAULT 'DIRECT',
	`subtotal_paise` bigint NOT NULL,
	`delivery_fee_paise` bigint NOT NULL DEFAULT 0,
	`tax_paise` bigint NOT NULL DEFAULT 0,
	`total_paise` bigint NOT NULL,
	`paid_at` timestamp(6),
	`delivery_date` date,
	`notes` text,
	`cancellation_reason` text,
	`delivery_window` enum('EXPRESS_30','STANDARD_60','SCHEDULED'),
	`promised_by_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_number_unique` UNIQUE(`order_number`),
	CONSTRAINT `orders_totals_non_negative` CHECK(`orders`.`subtotal_paise` >= 0 AND `orders`.`total_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`gateway` text NOT NULL DEFAULT ('CASHFREE'),
	`gateway_order_id` varchar(128) NOT NULL,
	`gateway_payment_id` varchar(128),
	`gateway_signature` text,
	`amount_paise` bigint NOT NULL,
	`currency` text NOT NULL DEFAULT ('INR'),
	`status` enum('CREATED','PENDING','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'CREATED',
	`purpose` text NOT NULL DEFAULT ('WALLET_TOPUP'),
	`failure_reason` text,
	`raw_payload` json,
	`voucher_code` text,
	`verified_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_gateway_order_unique` UNIQUE(`gateway_order_id`),
	CONSTRAINT `payments_gateway_payment_unique` UNIQUE(`gateway_payment_id`),
	CONSTRAINT `payments_amount_positive` CHECK(`payments`.`amount_paise` > 0)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`key` varchar(128) NOT NULL,
	`description` text NOT NULL,
	CONSTRAINT `permissions_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `price_update_batches` (
	`id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`source` enum('SHOP_OWNER','OPERATOR','ADMIN') NOT NULL,
	`submitted_by` varchar(36) NOT NULL,
	`excel_upload_id` varchar(36),
	`status` enum('PENDING','APPROVED','REJECTED','SUPERSEDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`note` text,
	`decided_by` varchar(36),
	`decided_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `price_update_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_update_requests` (
	`id` varchar(36) NOT NULL,
	`batch_id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`shop_product_id` varchar(36) NOT NULL,
	`price_type` text NOT NULL,
	`previous_price_paise` bigint,
	`proposed_price_paise` bigint NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED','SUPERSEDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`source` enum('SHOP_OWNER','OPERATOR','ADMIN') NOT NULL,
	`submitted_by` varchar(36) NOT NULL,
	`decided_by` varchar(36),
	`decided_at` timestamp(6),
	`rejection_reason` text,
	`applied_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `price_update_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_update_requests_price_non_negative` CHECK(`price_update_requests`.`proposed_price_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` varchar(36) NOT NULL,
	`department` enum('GROCERY_KIRANA','SUPERMARKET','CONVENIENCE_STORE','FRUIT_VEGETABLE','DAIRY','BAKERY','MEAT_SHOP','SWEET_SHOP','PHARMACY','OPTICAL_STORE','CLOTHING_STORE','FOOTWEAR_STORE','JEWELLERY_STORE','COSMETICS_BEAUTY','MOBILE_PHONE_STORE','ELECTRONICS_STORE','COMPUTER_STORE','FURNITURE_STORE','HOME_APPLIANCE_STORE','HARDWARE_STORE','PAINT_SANITARY_STORE','STATIONERY_STORE','BOOKSTORE','TOY_STORE','SPORTS_STORE','PET_STORE','AUTO_SPARE_PARTS','AUTO_ACCESSORIES','MOBILE_ELECTRONICS_REPAIR','GIFT_SHOP','FLOWER_SHOP','BUILDING_MATERIALS','ELECTRICAL_SHOP','AGRICULTURAL_SUPPLY','POULTRY_SUPPLY','RESTAURANT','FAST_FOOD','CAFE','MEDICAL_EQUIPMENT','PRINTING_PHOTOCOPY','GENERAL_TRADING','PACKAGING_MATERIALS','WHOLESALE_STORE','ONLINE_STORE') NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`image_url` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_code_seq` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	CONSTRAINT `product_code_seq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_price_history` (
	`id` varchar(36) NOT NULL,
	`shop_product_id` varchar(36) NOT NULL,
	`price_type` text NOT NULL,
	`previous_price_paise` bigint,
	`new_price_paise` bigint NOT NULL,
	`changed_by` varchar(36) NOT NULL,
	`reason` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `product_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`category_id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`specifications` text,
	`sub_category` text,
	`image_url` text,
	`unit` text NOT NULL,
	`unit_size_milli` int NOT NULL DEFAULT 1000,
	`subscribable` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`approval_status` enum('PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'APPROVED',
	`created_by` varchar(36),
	`approved_by` varchar(36),
	`approved_at` timestamp(6),
	`rejection_reason` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `products_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`label` text,
	`referrer_name` text,
	`referrer_user_id` varchar(36),
	`status` enum('ACTIVE','INACTIVE','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
	`expires_at` date,
	`note` text,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referral_redemptions` (
	`id` varchar(36) NOT NULL,
	`referral_code_id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`registration_fee_paise` bigint,
	`redeemed_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `referral_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_redemptions_shop_unique` UNIQUE(`shop_id`)
);
--> statement-breakpoint
CREATE TABLE `registration_fee_history` (
	`id` varchar(36) NOT NULL,
	`registration_fee_id` varchar(36) NOT NULL,
	`previous_amount_paise` bigint,
	`new_amount_paise` bigint NOT NULL,
	`effective_from` date NOT NULL,
	`changed_by` varchar(36) NOT NULL,
	`reason` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `registration_fee_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registration_fees` (
	`id` varchar(36) NOT NULL,
	`amount_paise` bigint NOT NULL,
	`currency` text NOT NULL DEFAULT ('INR'),
	`effective_from` date NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`note` text,
	`created_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `registration_fees_id` PRIMARY KEY(`id`),
	CONSTRAINT `registration_fees_amount_non_negative` CHECK(`registration_fees`.`amount_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_key` enum('CUSTOMER','SHOP_OWNER','OPERATOR','ADMIN','DELIVERY_PARTNER') NOT NULL,
	`permission_key` varchar(128) NOT NULL,
	CONSTRAINT `role_permissions_role_key_permission_key_pk` PRIMARY KEY(`role_key`,`permission_key`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`key` enum('CUSTOMER','SHOP_OWNER','OPERATOR','ADMIN','DELIVERY_PARTNER') NOT NULL,
	`label` text NOT NULL,
	`description` text,
	CONSTRAINT `roles_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` varchar(255) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires` timestamp(6) NOT NULL,
	CONSTRAINT `sessions_session_token` PRIMARY KEY(`session_token`)
);
--> statement-breakpoint
CREATE TABLE `shop_classification_history` (
	`id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`previous_value` enum('KESARI','GREEN'),
	`new_value` enum('KESARI','GREEN') NOT NULL,
	`changed_by` varchar(36) NOT NULL,
	`reason` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `shop_classification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_payments` (
	`id` varchar(36) NOT NULL,
	`reference` varchar(255) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`payment_type` enum('REGISTRATION_FEE','RENEWAL','ADJUSTMENT','REFUND','REVERSAL') NOT NULL,
	`amount_paise` bigint NOT NULL,
	`currency` text NOT NULL DEFAULT ('INR'),
	`method` enum('CASH','UPI','BANK_TRANSFER','CARD','CHEQUE','RAZORPAY','OTHER') NOT NULL DEFAULT 'CASH',
	`transaction_id` text,
	`fee_snapshot_paise` bigint,
	`paid_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`note` text,
	`receipt_url` text,
	`reversal_of_id` varchar(36),
	`recorded_by` varchar(36) NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `shop_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_payments_reference_unique` UNIQUE(`reference`),
	CONSTRAINT `shop_payments_amount_non_zero` CHECK(`shop_payments`.`amount_paise` <> 0)
);
--> statement-breakpoint
CREATE TABLE `shop_products` (
	`id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`description` text,
	`image_url` text,
	`online_price_paise` bigint,
	`offline_price_paise` bigint,
	`online_sale_enabled` boolean NOT NULL DEFAULT false,
	`offline_sale_enabled` boolean NOT NULL DEFAULT false,
	`track_inventory` boolean NOT NULL DEFAULT true,
	`online_stock` int NOT NULL DEFAULT 0,
	`offline_stock` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_available` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `shop_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `shop_products_shop_product_unique` UNIQUE(`shop_id`,`product_id`),
	CONSTRAINT `shop_products_online_requires_price` CHECK((`shop_products`.`online_sale_enabled` = false) OR (`shop_products`.`online_price_paise` IS NOT NULL)),
	CONSTRAINT `shop_products_offline_requires_price` CHECK((`shop_products`.`offline_sale_enabled` = false) OR (`shop_products`.`offline_price_paise` IS NOT NULL)),
	CONSTRAINT `shop_products_prices_non_negative` CHECK((`shop_products`.`online_price_paise` IS NULL OR `shop_products`.`online_price_paise` >= 0)
          AND (`shop_products`.`offline_price_paise` IS NULL OR `shop_products`.`offline_price_paise` >= 0)),
	CONSTRAINT `shop_products_stock_non_negative` CHECK(`shop_products`.`online_stock` >= 0 AND `shop_products`.`offline_stock` >= 0)
);
--> statement-breakpoint
CREATE TABLE `shop_registration_seq` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	CONSTRAINT `shop_registration_seq_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255) NOT NULL,
	`owner_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` varchar(255),
	`address_line1` text NOT NULL,
	`address_line2` text,
	`area` text,
	`city` varchar(160) NOT NULL,
	`state` text,
	`pincode` varchar(12) NOT NULL,
	`latitude` text,
	`longitude` text,
	`shop_type` enum('GROCERY_KIRANA','SUPERMARKET','CONVENIENCE_STORE','FRUIT_VEGETABLE','DAIRY','BAKERY','MEAT_SHOP','SWEET_SHOP','PHARMACY','OPTICAL_STORE','CLOTHING_STORE','FOOTWEAR_STORE','JEWELLERY_STORE','COSMETICS_BEAUTY','MOBILE_PHONE_STORE','ELECTRONICS_STORE','COMPUTER_STORE','FURNITURE_STORE','HOME_APPLIANCE_STORE','HARDWARE_STORE','PAINT_SANITARY_STORE','STATIONERY_STORE','BOOKSTORE','TOY_STORE','SPORTS_STORE','PET_STORE','AUTO_SPARE_PARTS','AUTO_ACCESSORIES','MOBILE_ELECTRONICS_REPAIR','GIFT_SHOP','FLOWER_SHOP','BUILDING_MATERIALS','ELECTRICAL_SHOP','AGRICULTURAL_SUPPLY','POULTRY_SUPPLY','RESTAURANT','FAST_FOOD','CAFE','MEDICAL_EQUIPMENT','PRINTING_PHOTOCOPY','GENERAL_TRADING','PACKAGING_MATERIALS','WHOLESALE_STORE','ONLINE_STORE') NOT NULL,
	`status` enum('PENDING_APPROVAL','APPROVED','REJECTED','SUSPENDED','INACTIVE') NOT NULL DEFAULT 'PENDING_APPROVAL',
	`classification` enum('KESARI','GREEN'),
	`logo_url` text,
	`photos` json NOT NULL DEFAULT ('[]'),
	`opening_hours` json NOT NULL DEFAULT ('[]'),
	`delivery_available` boolean NOT NULL DEFAULT false,
	`delivery_fee_paise` bigint NOT NULL DEFAULT 0,
	`free_delivery_above_paise` bigint,
	`preparation_time_minutes` int NOT NULL DEFAULT 15,
	`description` text,
	`rejection_reason` text,
	`approved_at` timestamp(6),
	`approved_by` varchar(36),
	`registration_number` varchar(64) NOT NULL,
	`registration_date` date,
	`registration_fee_paise` bigint,
	`registration_fee_id` varchar(36),
	`referral_code_id` varchar(36),
	`fee_payment_status` enum('PENDING','PARTIALLY_PAID','PAID','REFUNDED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`amount_paid_paise` bigint NOT NULL DEFAULT 0,
	`legal_business_name` text,
	`gstin` text,
	`fssai_license_number` text,
	`gst_status` enum('UNKNOWN','NOT_REGISTERED','PENDING_VERIFICATION','REGISTERED','COMPOSITION','VERIFICATION_FAILED') NOT NULL DEFAULT 'UNKNOWN',
	`gst_trade_name` text,
	`gst_verification_source` enum('PROVIDER_VERIFIED','SELF_DECLARED','ADMIN_VERIFIED'),
	`gst_verified_at` timestamp(6),
	`gst_verified_by` varchar(36),
	`pan_status` enum('UNKNOWN','PENDING_VERIFICATION','VERIFIED','VERIFICATION_FAILED') NOT NULL DEFAULT 'UNKNOWN',
	`pan_number_encrypted` text,
	`pan_last4` text,
	`pan_holder_name` text,
	`pan_verification_source` enum('PROVIDER_VERIFIED','SELF_DECLARED','ADMIN_VERIFIED'),
	`pan_verified_at` timestamp(6),
	`pan_verified_by` varchar(36),
	`return_policy_text` text,
	`pickup_latitude` text,
	`pickup_longitude` text,
	`pickup_instructions` text,
	`landmark` text,
	`location_verified` boolean NOT NULL DEFAULT false,
	`location_verified_at` timestamp(6),
	`location_source` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `shops_registration_number_unique` UNIQUE(`registration_number`),
	CONSTRAINT `shops_delivery_fee_non_negative` CHECK(`shops`.`delivery_fee_paise` >= 0),
	CONSTRAINT `shops_registration_amounts_non_negative` CHECK((`shops`.`registration_fee_paise` IS NULL OR `shops`.`registration_fee_paise` >= 0)
          AND `shops`.`amount_paid_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `subscription_daily_overrides` (
	`id` varchar(36) NOT NULL,
	`subscription_id` varchar(36) NOT NULL,
	`delivery_date` date NOT NULL,
	`type` enum('QUANTITY','SKIP') NOT NULL,
	`quantity_milli` int,
	`created_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `subscription_daily_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `sub_override_sub_date_unique` UNIQUE(`subscription_id`,`delivery_date`),
	CONSTRAINT `sub_override_quantity_matches_type` CHECK((`subscription_daily_overrides`.`type` = 'SKIP' AND `subscription_daily_overrides`.`quantity_milli` IS NULL)
          OR (`subscription_daily_overrides`.`type` = 'QUANTITY' AND `subscription_daily_overrides`.`quantity_milli` IS NOT NULL AND `subscription_daily_overrides`.`quantity_milli` > 0))
);
--> statement-breakpoint
CREATE TABLE `subscription_orders` (
	`id` varchar(36) NOT NULL,
	`subscription_id` varchar(36) NOT NULL,
	`order_id` varchar(36),
	`delivery_date` date NOT NULL,
	`quantity_milli` int NOT NULL,
	`unit_price_paise` bigint NOT NULL,
	`total_paise` bigint NOT NULL,
	`status` enum('PENDING','CONFIRMED','PREPARING','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','PAYMENT_FAILED','WALLET_INSUFFICIENT','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'PENDING',
	`failure_reason` text,
	`generated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `subscription_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_orders_sub_date_unique` UNIQUE(`subscription_id`,`delivery_date`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`shop_id` varchar(36) NOT NULL,
	`shop_product_id` varchar(36) NOT NULL,
	`address_id` varchar(36),
	`quantity_milli` int NOT NULL,
	`frequency` enum('DAILY','WEEKLY') NOT NULL DEFAULT 'DAILY',
	`weekdays` json NOT NULL DEFAULT ('[]'),
	`start_date` date NOT NULL,
	`end_date` date,
	`next_delivery_date` date,
	`status` enum('ACTIVE','PAUSED','CANCELLED','COMPLETED','PAYMENT_PENDING') NOT NULL DEFAULT 'ACTIVE',
	`pause_from` date,
	`pause_until` date,
	`cancelled_at` timestamp(6),
	`cancellation_reason` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_quantity_positive` CHECK(`subscriptions`.`quantity_milli` > 0),
	CONSTRAINT `subscriptions_pause_window_valid` CHECK((`subscriptions`.`pause_from` IS NULL AND `subscriptions`.`pause_until` IS NULL)
          OR (`subscriptions`.`pause_from` IS NOT NULL AND `subscriptions`.`pause_until` IS NOT NULL AND `subscriptions`.`pause_until` >= `subscriptions`.`pause_from`))
);
--> statement-breakpoint
CREATE TABLE `user_consents` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`consent_type` enum('TERMS_AND_PRIVACY','MARKETING_COMMUNICATIONS') NOT NULL,
	`version` text NOT NULL,
	`ip_address` text,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `user_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` text,
	`email` varchar(255) NOT NULL,
	`email_verified` timestamp(6),
	`image` text,
	`phone` text,
	`role` enum('CUSTOMER','SHOP_OWNER','OPERATOR','ADMIN','DELIVERY_PARTNER') NOT NULL DEFAULT 'CUSTOMER',
	`status` enum('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`deleted_at` timestamp(6),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` timestamp(6) NOT NULL,
	CONSTRAINT `verification_tokens_identifier_token_pk` PRIMARY KEY(`identifier`,`token`)
);
--> statement-breakpoint
CREATE TABLE `voucher_redemptions` (
	`id` varchar(36) NOT NULL,
	`voucher_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`wallet_id` varchar(36) NOT NULL,
	`payment_id` varchar(36),
	`topup_amount_paise` bigint NOT NULL,
	`bonus_percent` bigint NOT NULL,
	`bonus_amount_paise` bigint NOT NULL,
	`status` enum('PENDING','APPLIED','REVERSED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`idempotency_key` varchar(255) NOT NULL,
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `voucher_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `voucher_redemptions_idempotency_unique` UNIQUE(`idempotency_key`),
	CONSTRAINT `voucher_redemptions_amounts_non_negative` CHECK(`voucher_redemptions`.`topup_amount_paise` >= 0 AND `voucher_redemptions`.`bonus_amount_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `voucher_upload_items` (
	`id` varchar(36) NOT NULL,
	`upload_id` varchar(36) NOT NULL,
	`row_number` int NOT NULL,
	`raw_data` json,
	`voucher_name` text,
	`voucher_code` text,
	`status` enum('VALID','DUPLICATE_IN_FILE','DUPLICATE_EXISTING','INVALID') NOT NULL,
	`error_message` text,
	`created_voucher_id` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `voucher_upload_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `voucher_upload_items_row_unique` UNIQUE(`upload_id`,`row_number`)
);
--> statement-breakpoint
CREATE TABLE `voucher_uploads` (
	`id` varchar(36) NOT NULL,
	`uploaded_by` varchar(36) NOT NULL,
	`file_name` text NOT NULL,
	`status` enum('VALIDATED','APPLIED','CANCELLED') NOT NULL DEFAULT 'VALIDATED',
	`total_records` int NOT NULL DEFAULT 0,
	`successful_records` int NOT NULL DEFAULT 0,
	`failed_records` int NOT NULL DEFAULT 0,
	`summary` json,
	`applied_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `voucher_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`code` varchar(64),
	`description` text,
	`terms_and_conditions` text,
	`apply_mode` enum('CODE','AUTO_APPLY') NOT NULL DEFAULT 'CODE',
	`bonus_percent` bigint NOT NULL,
	`minimum_topup_paise` bigint NOT NULL DEFAULT 0,
	`maximum_bonus_paise` bigint,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`usage_limit` int,
	`per_customer_limit` int NOT NULL DEFAULT 1,
	`total_budget_paise` bigint,
	`budget_used_paise` bigint NOT NULL DEFAULT 0,
	`redemption_count` int NOT NULL DEFAULT 0,
	`status` enum('DRAFT','ACTIVE','PAUSED','EXPIRED','BUDGET_EXHAUSTED') NOT NULL DEFAULT 'DRAFT',
	`applicable_scope` text,
	`created_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `vouchers_code_unique` UNIQUE(`code`),
	CONSTRAINT `vouchers_bonus_percent_range` CHECK(`vouchers`.`bonus_percent` > 0 AND `vouchers`.`bonus_percent` <= 100),
	CONSTRAINT `vouchers_minimum_topup_non_negative` CHECK(`vouchers`.`minimum_topup_paise` >= 0),
	CONSTRAINT `vouchers_maximum_bonus_non_negative` CHECK(`vouchers`.`maximum_bonus_paise` IS NULL OR `vouchers`.`maximum_bonus_paise` >= 0),
	CONSTRAINT `vouchers_dates_valid` CHECK(`vouchers`.`end_date` >= `vouchers`.`start_date`),
	CONSTRAINT `vouchers_usage_limit_positive` CHECK(`vouchers`.`usage_limit` IS NULL OR `vouchers`.`usage_limit` > 0),
	CONSTRAINT `vouchers_per_customer_limit_positive` CHECK(`vouchers`.`per_customer_limit` > 0),
	CONSTRAINT `vouchers_budget_non_negative` CHECK((`vouchers`.`total_budget_paise` IS NULL OR `vouchers`.`total_budget_paise` >= 0) AND `vouchers`.`budget_used_paise` >= 0)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` varchar(36) NOT NULL,
	`wallet_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` enum('TOP_UP','PRODUCT_PURCHASE','SUBSCRIPTION_DEDUCTION','REFUND','PROMOTIONAL_CREDIT','MANUAL_CREDIT','MANUAL_DEBIT','REVERSAL') NOT NULL,
	`status` enum('COMPLETED','REVERSED') NOT NULL DEFAULT 'COMPLETED',
	`amount_paise` bigint NOT NULL,
	`previous_balance_paise` bigint NOT NULL,
	`new_balance_paise` bigint NOT NULL,
	`promotional_amount_paise` bigint NOT NULL DEFAULT 0,
	`order_id` varchar(36),
	`subscription_id` varchar(36),
	`payment_id` varchar(36),
	`reversal_of_id` varchar(36),
	`voucher_redemption_id` varchar(36),
	`idempotency_key` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`created_by` varchar(36),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_txn_idempotency_unique` UNIQUE(`idempotency_key`),
	CONSTRAINT `wallet_txn_amount_non_zero` CHECK(`wallet_transactions`.`amount_paise` <> 0),
	CONSTRAINT `wallet_txn_balances_non_negative` CHECK(`wallet_transactions`.`previous_balance_paise` >= 0 AND `wallet_transactions`.`new_balance_paise` >= 0),
	CONSTRAINT `wallet_txn_arithmetic` CHECK(`wallet_transactions`.`new_balance_paise` = `wallet_transactions`.`previous_balance_paise` + `wallet_transactions`.`amount_paise`),
	CONSTRAINT `wallet_txn_promotional_within_amount` CHECK((`wallet_transactions`.`amount_paise` >= 0 AND `wallet_transactions`.`promotional_amount_paise` >= 0 AND `wallet_transactions`.`promotional_amount_paise` <= `wallet_transactions`.`amount_paise`)
          OR (`wallet_transactions`.`amount_paise` < 0 AND `wallet_transactions`.`promotional_amount_paise` <= 0 AND `wallet_transactions`.`promotional_amount_paise` >= `wallet_transactions`.`amount_paise`))
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`balance_paise` bigint NOT NULL DEFAULT 0,
	`promotional_balance_paise` bigint NOT NULL DEFAULT 0,
	`currency` text NOT NULL DEFAULT ('INR'),
	`low_balance_threshold_paise` bigint NOT NULL DEFAULT 50000,
	`auto_recharge_enabled` boolean NOT NULL DEFAULT false,
	`auto_recharge_trigger_paise` bigint,
	`auto_recharge_amount_paise` bigint,
	`status` text NOT NULL DEFAULT ('ACTIVE'),
	`low_balance_notified_at` timestamp(6),
	`created_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	`updated_at` timestamp(6) NOT NULL DEFAULT (now(6)),
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallets_user_unique` UNIQUE(`user_id`),
	CONSTRAINT `wallets_balance_non_negative` CHECK(`wallets`.`balance_paise` >= 0),
	CONSTRAINT `wallets_promotional_balance_bounded` CHECK(`wallets`.`promotional_balance_paise` >= 0 AND `wallets`.`promotional_balance_paise` <= `wallets`.`balance_paise`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_carts_id_fk` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_shop_product_id_shop_products_id_fk` FOREIGN KEY (`shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_earnings_config` ADD CONSTRAINT `delivery_earnings_config_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_delivery_partner_id_delivery_partners_id_fk` FOREIGN KEY (`delivery_partner_id`) REFERENCES `delivery_partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_partner_earnings` ADD CONSTRAINT `dp_earnings_partner_fk` FOREIGN KEY (`delivery_partner_id`) REFERENCES `delivery_partners`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_partner_earnings` ADD CONSTRAINT `dp_earnings_order_fk` FOREIGN KEY (`delivery_order_id`) REFERENCES `delivery_orders`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_partners` ADD CONSTRAINT `delivery_partners_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_partners` ADD CONSTRAINT `delivery_partners_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excel_upload_items` ADD CONSTRAINT `excel_upload_items_upload_id_excel_uploads_id_fk` FOREIGN KEY (`upload_id`) REFERENCES `excel_uploads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excel_upload_items` ADD CONSTRAINT `excel_upload_items_matched_shop_product_id_shop_products_id_fk` FOREIGN KEY (`matched_shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excel_upload_items` ADD CONSTRAINT `excel_upload_items_matched_product_id_products_id_fk` FOREIGN KEY (`matched_product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excel_upload_items` ADD CONSTRAINT `excel_upload_items_possible_duplicate_product_id_products_id_fk` FOREIGN KEY (`possible_duplicate_product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excel_uploads` ADD CONSTRAINT `excel_uploads_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excel_uploads` ADD CONSTRAINT `excel_uploads_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grievances` ADD CONSTRAINT `grievances_submitted_by_user_id_users_id_fk` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grievances` ADD CONSTRAINT `grievances_assigned_to_user_id_users_id_fk` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_shop_product_id_shop_products_id_fk` FOREIGN KEY (`shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_shop_product_id_shop_products_id_fk` FOREIGN KEY (`shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_address_id_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_batches` ADD CONSTRAINT `price_update_batches_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_batches` ADD CONSTRAINT `price_update_batches_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_batches` ADD CONSTRAINT `price_update_batches_excel_upload_id_excel_uploads_id_fk` FOREIGN KEY (`excel_upload_id`) REFERENCES `excel_uploads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_batches` ADD CONSTRAINT `price_update_batches_decided_by_users_id_fk` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_requests` ADD CONSTRAINT `price_update_requests_batch_id_price_update_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `price_update_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_requests` ADD CONSTRAINT `price_update_requests_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_requests` ADD CONSTRAINT `price_update_requests_shop_product_id_shop_products_id_fk` FOREIGN KEY (`shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_requests` ADD CONSTRAINT `price_update_requests_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_update_requests` ADD CONSTRAINT `price_update_requests_decided_by_users_id_fk` FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_price_history` ADD CONSTRAINT `product_price_history_shop_product_id_shop_products_id_fk` FOREIGN KEY (`shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_price_history` ADD CONSTRAINT `product_price_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_codes` ADD CONSTRAINT `referral_codes_referrer_user_id_users_id_fk` FOREIGN KEY (`referrer_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_codes` ADD CONSTRAINT `referral_codes_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_redemptions` ADD CONSTRAINT `referral_redemptions_referral_code_id_referral_codes_id_fk` FOREIGN KEY (`referral_code_id`) REFERENCES `referral_codes`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_redemptions` ADD CONSTRAINT `referral_redemptions_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_redemptions` ADD CONSTRAINT `referral_redemptions_redeemed_by_users_id_fk` FOREIGN KEY (`redeemed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registration_fee_history` ADD CONSTRAINT `registration_fee_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registration_fee_history` ADD CONSTRAINT `reg_fee_history_fee_fk` FOREIGN KEY (`registration_fee_id`) REFERENCES `registration_fees`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registration_fees` ADD CONSTRAINT `registration_fees_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_key_roles_key_fk` FOREIGN KEY (`role_key`) REFERENCES `roles`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_key_permissions_key_fk` FOREIGN KEY (`permission_key`) REFERENCES `permissions`(`key`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_classification_history` ADD CONSTRAINT `shop_classification_history_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_classification_history` ADD CONSTRAINT `shop_classification_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_payments` ADD CONSTRAINT `shop_payments_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_payments` ADD CONSTRAINT `shop_payments_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_payments` ADD CONSTRAINT `shop_payments_recorded_by_users_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_products` ADD CONSTRAINT `shop_products_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_products` ADD CONSTRAINT `shop_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_gst_verified_by_users_id_fk` FOREIGN KEY (`gst_verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shops` ADD CONSTRAINT `shops_pan_verified_by_users_id_fk` FOREIGN KEY (`pan_verified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_daily_overrides` ADD CONSTRAINT `subscription_daily_overrides_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_daily_overrides` ADD CONSTRAINT `subscription_daily_overrides_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_orders` ADD CONSTRAINT `subscription_orders_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_orders` ADD CONSTRAINT `subscription_orders_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_shop_id_shops_id_fk` FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_shop_product_id_shop_products_id_fk` FOREIGN KEY (`shop_product_id`) REFERENCES `shop_products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_address_id_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_consents` ADD CONSTRAINT `user_consents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_voucher_id_vouchers_id_fk` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_wallet_id_wallets_id_fk` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_redemptions` ADD CONSTRAINT `voucher_redemptions_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_upload_items` ADD CONSTRAINT `voucher_upload_items_upload_id_voucher_uploads_id_fk` FOREIGN KEY (`upload_id`) REFERENCES `voucher_uploads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_upload_items` ADD CONSTRAINT `voucher_upload_items_created_voucher_id_vouchers_id_fk` FOREIGN KEY (`created_voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `voucher_uploads` ADD CONSTRAINT `voucher_uploads_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vouchers` ADD CONSTRAINT `vouchers_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_wallet_id_wallets_id_fk` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_payment_id_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `addresses_user_idx` ON `addresses` (`user_id`);--> statement-breakpoint
CREATE INDEX `addresses_pincode_idx` ON `addresses` (`pincode`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `cart_items_cart_idx` ON `cart_items` (`cart_id`);--> statement-breakpoint
CREATE INDEX `delivery_orders_partner_idx` ON `delivery_orders` (`delivery_partner_id`);--> statement-breakpoint
CREATE INDEX `delivery_orders_status_idx` ON `delivery_orders` (`status`);--> statement-breakpoint
CREATE INDEX `delivery_partner_earnings_partner_idx` ON `delivery_partner_earnings` (`delivery_partner_id`);--> statement-breakpoint
CREATE INDEX `delivery_partners_status_idx` ON `delivery_partners` (`status`);--> statement-breakpoint
CREATE INDEX `excel_upload_items_upload_idx` ON `excel_upload_items` (`upload_id`);--> statement-breakpoint
CREATE INDEX `excel_uploads_shop_idx` ON `excel_uploads` (`shop_id`);--> statement-breakpoint
CREATE INDEX `excel_uploads_uploader_idx` ON `excel_uploads` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `excel_uploads_created_idx` ON `excel_uploads` (`created_at`);--> statement-breakpoint
CREATE INDEX `grievances_status_idx` ON `grievances` (`status`);--> statement-breakpoint
CREATE INDEX `grievances_email_idx` ON `grievances` (`email`);--> statement-breakpoint
CREATE INDEX `grievances_submitted_by_idx` ON `grievances` (`submitted_by_user_id`);--> statement-breakpoint
CREATE INDEX `inventory_movements_sp_idx` ON `inventory_movements` (`shop_product_id`);--> statement-breakpoint
CREATE INDEX `maps_api_call_log_service_idx` ON `maps_api_call_log` (`service`);--> statement-breakpoint
CREATE INDEX `maps_api_call_log_created_idx` ON `maps_api_call_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `maps_api_call_log_entity_idx` ON `maps_api_call_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_status_history_order_idx` ON `order_status_history` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_shop_idx` ON `orders` (`shop_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `price_update_batches_shop_idx` ON `price_update_batches` (`shop_id`);--> statement-breakpoint
CREATE INDEX `price_update_batches_status_idx` ON `price_update_batches` (`status`);--> statement-breakpoint
CREATE INDEX `price_update_requests_batch_idx` ON `price_update_requests` (`batch_id`);--> statement-breakpoint
CREATE INDEX `price_update_requests_shop_idx` ON `price_update_requests` (`shop_id`);--> statement-breakpoint
CREATE INDEX `price_update_requests_status_idx` ON `price_update_requests` (`status`);--> statement-breakpoint
CREATE INDEX `price_update_requests_sp_idx` ON `price_update_requests` (`shop_product_id`);--> statement-breakpoint
CREATE INDEX `product_categories_dept_idx` ON `product_categories` (`department`);--> statement-breakpoint
CREATE INDEX `price_history_shop_product_idx` ON `product_price_history` (`shop_product_id`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_approval_status_idx` ON `products` (`approval_status`);--> statement-breakpoint
CREATE INDEX `referral_codes_status_idx` ON `referral_codes` (`status`);--> statement-breakpoint
CREATE INDEX `referral_redemptions_code_idx` ON `referral_redemptions` (`referral_code_id`);--> statement-breakpoint
CREATE INDEX `registration_fee_history_created_idx` ON `registration_fee_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `registration_fees_effective_idx` ON `registration_fees` (`effective_from`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `shop_class_hist_shop_idx` ON `shop_classification_history` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_payments_shop_idx` ON `shop_payments` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_payments_owner_idx` ON `shop_payments` (`owner_id`);--> statement-breakpoint
CREATE INDEX `shop_payments_paid_idx` ON `shop_payments` (`paid_at`);--> statement-breakpoint
CREATE INDEX `shop_products_shop_idx` ON `shop_products` (`shop_id`);--> statement-breakpoint
CREATE INDEX `shop_products_product_idx` ON `shop_products` (`product_id`);--> statement-breakpoint
CREATE INDEX `shops_owner_idx` ON `shops` (`owner_id`);--> statement-breakpoint
CREATE INDEX `shops_status_idx` ON `shops` (`status`);--> statement-breakpoint
CREATE INDEX `shops_city_idx` ON `shops` (`city`);--> statement-breakpoint
CREATE INDEX `shops_pincode_idx` ON `shops` (`pincode`);--> statement-breakpoint
CREATE INDEX `shops_fee_status_idx` ON `shops` (`fee_payment_status`);--> statement-breakpoint
CREATE INDEX `shops_referral_idx` ON `shops` (`referral_code_id`);--> statement-breakpoint
CREATE INDEX `subscription_orders_date_idx` ON `subscription_orders` (`delivery_date`);--> statement-breakpoint
CREATE INDEX `subscription_orders_status_idx` ON `subscription_orders` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_shop_idx` ON `subscriptions` (`shop_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_next_delivery_idx` ON `subscriptions` (`next_delivery_date`);--> statement-breakpoint
CREATE INDEX `user_consents_user_idx` ON `user_consents` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_consents_type_idx` ON `user_consents` (`consent_type`);--> statement-breakpoint
CREATE INDEX `voucher_redemptions_voucher_idx` ON `voucher_redemptions` (`voucher_id`);--> statement-breakpoint
CREATE INDEX `voucher_redemptions_user_idx` ON `voucher_redemptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `voucher_upload_items_upload_idx` ON `voucher_upload_items` (`upload_id`);--> statement-breakpoint
CREATE INDEX `voucher_uploads_uploader_idx` ON `voucher_uploads` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `vouchers_status_idx` ON `vouchers` (`status`);--> statement-breakpoint
CREATE INDEX `vouchers_dates_idx` ON `vouchers` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `wallet_txn_wallet_idx` ON `wallet_transactions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `wallet_txn_user_idx` ON `wallet_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `wallet_txn_created_idx` ON `wallet_transactions` (`created_at`);