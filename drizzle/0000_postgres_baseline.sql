CREATE TYPE "public"."shop_classification" AS ENUM('KESARI', 'GREEN');--> statement-breakpoint
CREATE TYPE "public"."consent_type" AS ENUM('TERMS_AND_PRIVACY', 'MARKETING_COMMUNICATIONS');--> statement-breakpoint
CREATE TYPE "public"."delivery_order_status" AS ENUM('OFFERED', 'ACCEPTED', 'REJECTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."delivery_partner_status" AS ENUM('REGISTERED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."delivery_window" AS ENUM('EXPRESS_30', 'STANDARD_60', 'SCHEDULED');--> statement-breakpoint
CREATE TYPE "public"."department" AS ENUM('GROCERY_KIRANA', 'SUPERMARKET', 'CONVENIENCE_STORE', 'FRUIT_VEGETABLE', 'DAIRY', 'BAKERY', 'MEAT_SHOP', 'SWEET_SHOP', 'PHARMACY', 'OPTICAL_STORE', 'CLOTHING_STORE', 'FOOTWEAR_STORE', 'JEWELLERY_STORE', 'COSMETICS_BEAUTY', 'MOBILE_PHONE_STORE', 'ELECTRONICS_STORE', 'COMPUTER_STORE', 'FURNITURE_STORE', 'HOME_APPLIANCE_STORE', 'HARDWARE_STORE', 'PAINT_SANITARY_STORE', 'STATIONERY_STORE', 'BOOKSTORE', 'TOY_STORE', 'SPORTS_STORE', 'PET_STORE', 'AUTO_SPARE_PARTS', 'AUTO_ACCESSORIES', 'MOBILE_ELECTRONICS_REPAIR', 'GIFT_SHOP', 'FLOWER_SHOP', 'BUILDING_MATERIALS', 'ELECTRICAL_SHOP', 'AGRICULTURAL_SUPPLY', 'POULTRY_SUPPLY', 'RESTAURANT', 'FAST_FOOD', 'CAFE', 'MEDICAL_EQUIPMENT', 'PRINTING_PHOTOCOPY', 'GENERAL_TRADING', 'PACKAGING_MATERIALS', 'WHOLESALE_STORE', 'ONLINE_STORE');--> statement-breakpoint
CREATE TYPE "public"."excel_row_status" AS ENUM('VALID', 'NO_CHANGE', 'INVALID_PRICE', 'DUPLICATE', 'NOT_FOUND', 'MISSING_FIELD', 'NEW_PRODUCT');--> statement-breakpoint
CREATE TYPE "public"."excel_upload_status" AS ENUM('VALIDATED', 'APPLIED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."excel_upload_type" AS ENUM('GOODS', 'PRICES');--> statement-breakpoint
CREATE TYPE "public"."fee_payment_status" AS ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."grievance_category" AS ENUM('PAYMENT', 'WALLET', 'ORDER', 'SUBSCRIPTION', 'SELLER', 'PRODUCT', 'PRIVACY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."grievance_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."gst_status" AS ENUM('UNKNOWN', 'NOT_REGISTERED', 'PENDING_VERIFICATION', 'REGISTERED', 'COMPOSITION', 'VERIFICATION_FAILED');--> statement-breakpoint
CREATE TYPE "public"."identity_verification_source" AS ENUM('PROVIDER_VERIFIED', 'SELF_DECLARED', 'ADMIN_VERIFIED');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('DIRECT', 'SUBSCRIPTION');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'WALLET_INSUFFICIENT', 'REFUND_PENDING', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."override_type" AS ENUM('QUANTITY', 'SKIP');--> statement-breakpoint
CREATE TYPE "public"."pan_status" AS ENUM('UNKNOWN', 'PENDING_VERIFICATION', 'VERIFIED', 'VERIFICATION_FAILED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."price_request_source" AS ENUM('SHOP_OWNER', 'OPERATOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."price_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."product_approval_status" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('ACTIVE', 'INACTIVE', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."shop_payment_method" AS ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'RAZORPAY', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."shop_payment_type" AS ENUM('REGISTRATION_FEE', 'RENEWAL', 'ADJUSTMENT', 'REFUND', 'REVERSAL');--> statement-breakpoint
CREATE TYPE "public"."shop_status" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."shop_type" AS ENUM('GROCERY_KIRANA', 'SUPERMARKET', 'CONVENIENCE_STORE', 'FRUIT_VEGETABLE', 'DAIRY', 'BAKERY', 'MEAT_SHOP', 'SWEET_SHOP', 'PHARMACY', 'OPTICAL_STORE', 'CLOTHING_STORE', 'FOOTWEAR_STORE', 'JEWELLERY_STORE', 'COSMETICS_BEAUTY', 'MOBILE_PHONE_STORE', 'ELECTRONICS_STORE', 'COMPUTER_STORE', 'FURNITURE_STORE', 'HOME_APPLIANCE_STORE', 'HARDWARE_STORE', 'PAINT_SANITARY_STORE', 'STATIONERY_STORE', 'BOOKSTORE', 'TOY_STORE', 'SPORTS_STORE', 'PET_STORE', 'AUTO_SPARE_PARTS', 'AUTO_ACCESSORIES', 'MOBILE_ELECTRONICS_REPAIR', 'GIFT_SHOP', 'FLOWER_SHOP', 'BUILDING_MATERIALS', 'ELECTRICAL_SHOP', 'AGRICULTURAL_SUPPLY', 'POULTRY_SUPPLY', 'RESTAURANT', 'FAST_FOOD', 'CAFE', 'MEDICAL_EQUIPMENT', 'PRINTING_PHOTOCOPY', 'GENERAL_TRADING', 'PACKAGING_MATERIALS', 'WHOLESALE_STORE', 'ONLINE_STORE');--> statement-breakpoint
CREATE TYPE "public"."subscription_frequency" AS ENUM('DAILY', 'WEEKLY');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED', 'PAYMENT_PENDING');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'SHOP_OWNER', 'OPERATOR', 'ADMIN', 'DELIVERY_PARTNER');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."voucher_apply_mode" AS ENUM('CODE', 'AUTO_APPLY');--> statement-breakpoint
CREATE TYPE "public"."voucher_redemption_status" AS ENUM('PENDING', 'APPLIED', 'REVERSED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."voucher_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'BUDGET_EXHAUSTED');--> statement-breakpoint
CREATE TYPE "public"."voucher_upload_row_status" AS ENUM('VALID', 'DUPLICATE_IN_FILE', 'DUPLICATE_EXISTING', 'INVALID');--> statement-breakpoint
CREATE TYPE "public"."voucher_upload_status" AS ENUM('VALIDATED', 'APPLIED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."wallet_txn_status" AS ENUM('COMPLETED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."wallet_txn_type" AS ENUM('TOP_UP', 'PRODUCT_PURCHASE', 'SUBSCRIPTION_DEDUCTION', 'REFUND', 'PROMOTIONAL_CREDIT', 'MANUAL_CREDIT', 'MANUAL_DEBIT', 'REVERSAL');--> statement-breakpoint
CREATE SEQUENCE "public"."grievance_ticket_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."product_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."shop_registration_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"line1" text NOT NULL,
	"line2" text,
	"area" text,
	"city" text NOT NULL,
	"state" text,
	"pincode" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"landmark" text,
	"delivery_instructions" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"location_verified" boolean DEFAULT false NOT NULL,
	"location_verified_at" timestamp with time zone,
	"location_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" "user_role",
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"previous_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"shop_product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_earnings_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_fee_paise" bigint NOT NULL,
	"per_km_fee_paise" bigint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_earnings_config_non_negative" CHECK ("delivery_earnings_config"."base_fee_paise" >= 0 AND "delivery_earnings_config"."per_km_fee_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "delivery_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"delivery_partner_id" uuid NOT NULL,
	"status" "delivery_order_status" DEFAULT 'OFFERED' NOT NULL,
	"distance_km" text,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_partner_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_partner_id" uuid NOT NULL,
	"delivery_order_id" uuid NOT NULL,
	"base_paise" bigint NOT NULL,
	"distance_paise" bigint NOT NULL,
	"total_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text,
	"date_of_birth" date,
	"profile_photo_url" text,
	"pan_number" text,
	"government_id_type" text,
	"government_id_number" text,
	"bank_account_holder_name" text,
	"bank_account_number" text,
	"bank_ifsc" text,
	"vehicle_type" text NOT NULL,
	"vehicle_registration_number" text,
	"driving_licence_number" text,
	"latitude" text,
	"longitude" text,
	"operating_radius_km" integer DEFAULT 5 NOT NULL,
	"location_verified" boolean DEFAULT false NOT NULL,
	"location_verified_at" timestamp with time zone,
	"location_source" text,
	"status" "delivery_partner_status" DEFAULT 'REGISTERED' NOT NULL,
	"review_notes" text,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"is_online" boolean DEFAULT false NOT NULL,
	"last_location_latitude" text,
	"last_location_longitude" text,
	"last_location_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "excel_upload_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw_data" jsonb,
	"product_code" text,
	"product_name" text,
	"unit" text,
	"parsed_price_paise" bigint,
	"previous_price_paise" bigint,
	"matched_shop_product_id" uuid,
	"matched_product_id" uuid,
	"possible_duplicate_product_id" uuid,
	"status" "excel_row_status" NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "excel_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"upload_type" "excel_upload_type" DEFAULT 'PRICES' NOT NULL,
	"status" "excel_upload_status" DEFAULT 'VALIDATED' NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"unchanged_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"not_found_rows" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"error_message" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text DEFAULT 'GRV-' || lpad(nextval('grievance_ticket_seq')::text, 6, '0') NOT NULL,
	"submitted_by_user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"category" "grievance_category" DEFAULT 'OTHER' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "grievance_status" DEFAULT 'OPEN' NOT NULL,
	"assigned_to_user_id" uuid,
	"resolution_notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_product_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"delta_units" integer NOT NULL,
	"previous_units" integer NOT NULL,
	"new_units" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maps_api_call_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" text NOT NULL,
	"purpose" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"success" boolean NOT NULL,
	"response_time_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" DEFAULT 'IN_APP' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_url" text,
	"metadata" jsonb,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"shop_product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"unit_snapshot" text NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"quantity_milli" integer NOT NULL,
	"line_total_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity_milli" > 0),
	CONSTRAINT "order_items_amounts_non_negative" CHECK ("order_items"."unit_price_paise" >= 0 AND "order_items"."line_total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"previous_status" "order_status",
	"new_status" "order_status" NOT NULL,
	"changed_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"address_id" uuid,
	"delivery_address_snapshot" jsonb,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"source" "order_source" DEFAULT 'DIRECT' NOT NULL,
	"subtotal_paise" bigint NOT NULL,
	"delivery_fee_paise" bigint DEFAULT 0 NOT NULL,
	"tax_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint NOT NULL,
	"paid_at" timestamp with time zone,
	"delivery_date" date,
	"notes" text,
	"cancellation_reason" text,
	"delivery_window" "delivery_window",
	"promised_by_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_totals_non_negative" CHECK ("orders"."subtotal_paise" >= 0 AND "orders"."total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gateway" text DEFAULT 'CASHFREE' NOT NULL,
	"gateway_order_id" text NOT NULL,
	"gateway_payment_id" text,
	"gateway_signature" text,
	"amount_paise" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"purpose" text DEFAULT 'WALLET_TOPUP' NOT NULL,
	"failure_reason" text,
	"raw_payload" jsonb,
	"voucher_code" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_update_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"source" "price_request_source" NOT NULL,
	"submitted_by" uuid NOT NULL,
	"excel_upload_id" uuid,
	"status" "price_request_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_update_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"shop_product_id" uuid NOT NULL,
	"price_type" text NOT NULL,
	"previous_price_paise" bigint,
	"proposed_price_paise" bigint NOT NULL,
	"status" "price_request_status" DEFAULT 'PENDING' NOT NULL,
	"source" "price_request_source" NOT NULL,
	"submitted_by" uuid NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"rejection_reason" text,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_update_requests_price_non_negative" CHECK ("price_update_requests"."proposed_price_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" "department" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_product_id" uuid NOT NULL,
	"price_type" text NOT NULL,
	"previous_price_paise" bigint,
	"new_price_paise" bigint NOT NULL,
	"changed_by" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"code" text DEFAULT 'P' || lpad(nextval('product_code_seq')::text, 5, '0') NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"specifications" text,
	"sub_category" text,
	"image_url" text,
	"unit" text NOT NULL,
	"unit_size_milli" integer DEFAULT 1000 NOT NULL,
	"subscribable" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"approval_status" "product_approval_status" DEFAULT 'APPROVED' NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text,
	"referrer_name" text,
	"referrer_user_id" uuid,
	"status" "referral_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" date,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"registration_fee_paise" bigint,
	"redeemed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_fee_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_fee_id" uuid NOT NULL,
	"previous_amount_paise" bigint,
	"new_amount_paise" bigint NOT NULL,
	"effective_from" date NOT NULL,
	"changed_by" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount_paise" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"effective_from" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_fees_amount_non_negative" CHECK ("registration_fees"."amount_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_key" "user_role" NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_key_permission_key_pk" PRIMARY KEY("role_key","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"key" "user_role" PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_classification_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"previous_value" "shop_classification",
	"new_value" "shop_classification" NOT NULL,
	"changed_by" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"shop_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"payment_type" "shop_payment_type" NOT NULL,
	"amount_paise" bigint NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"method" "shop_payment_method" DEFAULT 'CASH' NOT NULL,
	"transaction_id" text,
	"fee_snapshot_paise" bigint,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"receipt_url" text,
	"reversal_of_id" uuid,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_payments_amount_non_zero" CHECK ("shop_payments"."amount_paise" <> 0)
);
--> statement-breakpoint
CREATE TABLE "shop_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"description" text,
	"image_url" text,
	"online_price_paise" bigint,
	"offline_price_paise" bigint,
	"online_sale_enabled" boolean DEFAULT false NOT NULL,
	"offline_sale_enabled" boolean DEFAULT false NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"online_stock" integer DEFAULT 0 NOT NULL,
	"offline_stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "shop_products_online_requires_price" CHECK (("shop_products"."online_sale_enabled" = false) OR ("shop_products"."online_price_paise" IS NOT NULL)),
	CONSTRAINT "shop_products_offline_requires_price" CHECK (("shop_products"."offline_sale_enabled" = false) OR ("shop_products"."offline_price_paise" IS NOT NULL)),
	CONSTRAINT "shop_products_prices_non_negative" CHECK (("shop_products"."online_price_paise" IS NULL OR "shop_products"."online_price_paise" >= 0)
          AND ("shop_products"."offline_price_paise" IS NULL OR "shop_products"."offline_price_paise" >= 0)),
	CONSTRAINT "shop_products_stock_non_negative" CHECK ("shop_products"."online_stock" >= 0 AND "shop_products"."offline_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"area" text,
	"city" text NOT NULL,
	"state" text,
	"pincode" text NOT NULL,
	"latitude" text,
	"longitude" text,
	"shop_type" "shop_type" NOT NULL,
	"status" "shop_status" DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"classification" "shop_classification",
	"logo_url" text,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opening_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivery_available" boolean DEFAULT false NOT NULL,
	"delivery_fee_paise" bigint DEFAULT 0 NOT NULL,
	"free_delivery_above_paise" bigint,
	"preparation_time_minutes" integer DEFAULT 15 NOT NULL,
	"description" text,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"registration_number" text DEFAULT 'BKS-' || lpad(nextval('shop_registration_seq')::text, 6, '0') NOT NULL,
	"registration_date" date,
	"registration_fee_paise" bigint,
	"registration_fee_id" uuid,
	"referral_code_id" uuid,
	"fee_payment_status" "fee_payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount_paid_paise" bigint DEFAULT 0 NOT NULL,
	"legal_business_name" text,
	"gstin" text,
	"fssai_license_number" text,
	"gst_status" "gst_status" DEFAULT 'UNKNOWN' NOT NULL,
	"gst_trade_name" text,
	"gst_verification_source" "identity_verification_source",
	"gst_verified_at" timestamp with time zone,
	"gst_verified_by" uuid,
	"pan_status" "pan_status" DEFAULT 'UNKNOWN' NOT NULL,
	"pan_number_encrypted" text,
	"pan_last4" text,
	"pan_holder_name" text,
	"pan_verification_source" "identity_verification_source",
	"pan_verified_at" timestamp with time zone,
	"pan_verified_by" uuid,
	"return_policy_text" text,
	"pickup_latitude" text,
	"pickup_longitude" text,
	"pickup_instructions" text,
	"landmark" text,
	"location_verified" boolean DEFAULT false NOT NULL,
	"location_verified_at" timestamp with time zone,
	"location_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "shops_delivery_fee_non_negative" CHECK ("shops"."delivery_fee_paise" >= 0),
	CONSTRAINT "shops_registration_amounts_non_negative" CHECK (("shops"."registration_fee_paise" IS NULL OR "shops"."registration_fee_paise" >= 0)
          AND "shops"."amount_paid_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_daily_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"delivery_date" date NOT NULL,
	"type" "override_type" NOT NULL,
	"quantity_milli" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sub_override_quantity_matches_type" CHECK (("subscription_daily_overrides"."type" = 'SKIP' AND "subscription_daily_overrides"."quantity_milli" IS NULL)
          OR ("subscription_daily_overrides"."type" = 'QUANTITY' AND "subscription_daily_overrides"."quantity_milli" IS NOT NULL AND "subscription_daily_overrides"."quantity_milli" > 0))
);
--> statement-breakpoint
CREATE TABLE "subscription_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"order_id" uuid,
	"delivery_date" date NOT NULL,
	"quantity_milli" integer NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"total_paise" bigint NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"failure_reason" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"shop_product_id" uuid NOT NULL,
	"address_id" uuid,
	"quantity_milli" integer NOT NULL,
	"frequency" "subscription_frequency" DEFAULT 'DAILY' NOT NULL,
	"weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_delivery_date" date,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"pause_from" date,
	"pause_until" date,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_quantity_positive" CHECK ("subscriptions"."quantity_milli" > 0),
	CONSTRAINT "subscriptions_pause_window_valid" CHECK (("subscriptions"."pause_from" IS NULL AND "subscriptions"."pause_until" IS NULL)
          OR ("subscriptions"."pause_from" IS NOT NULL AND "subscriptions"."pause_until" IS NOT NULL AND "subscriptions"."pause_until" >= "subscriptions"."pause_from"))
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"version" text NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"phone" text,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "voucher_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"voucher_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"payment_id" uuid,
	"topup_amount_paise" bigint NOT NULL,
	"bonus_percent" bigint NOT NULL,
	"bonus_amount_paise" bigint NOT NULL,
	"status" "voucher_redemption_status" DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_redemptions_amounts_non_negative" CHECK ("voucher_redemptions"."topup_amount_paise" >= 0 AND "voucher_redemptions"."bonus_amount_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "voucher_upload_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw_data" jsonb,
	"voucher_name" text,
	"voucher_code" text,
	"status" "voucher_upload_row_status" NOT NULL,
	"error_message" text,
	"created_voucher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"file_name" text NOT NULL,
	"status" "voucher_upload_status" DEFAULT 'VALIDATED' NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"successful_records" integer DEFAULT 0 NOT NULL,
	"failed_records" integer DEFAULT 0 NOT NULL,
	"summary" jsonb,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"terms_and_conditions" text,
	"apply_mode" "voucher_apply_mode" DEFAULT 'CODE' NOT NULL,
	"bonus_percent" bigint NOT NULL,
	"minimum_topup_paise" bigint DEFAULT 0 NOT NULL,
	"maximum_bonus_paise" bigint,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"usage_limit" integer,
	"per_customer_limit" integer DEFAULT 1 NOT NULL,
	"total_budget_paise" bigint,
	"budget_used_paise" bigint DEFAULT 0 NOT NULL,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"status" "voucher_status" DEFAULT 'DRAFT' NOT NULL,
	"applicable_scope" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_bonus_percent_range" CHECK ("vouchers"."bonus_percent" > 0 AND "vouchers"."bonus_percent" <= 100),
	CONSTRAINT "vouchers_minimum_topup_non_negative" CHECK ("vouchers"."minimum_topup_paise" >= 0),
	CONSTRAINT "vouchers_maximum_bonus_non_negative" CHECK ("vouchers"."maximum_bonus_paise" IS NULL OR "vouchers"."maximum_bonus_paise" >= 0),
	CONSTRAINT "vouchers_dates_valid" CHECK ("vouchers"."end_date" >= "vouchers"."start_date"),
	CONSTRAINT "vouchers_usage_limit_positive" CHECK ("vouchers"."usage_limit" IS NULL OR "vouchers"."usage_limit" > 0),
	CONSTRAINT "vouchers_per_customer_limit_positive" CHECK ("vouchers"."per_customer_limit" > 0),
	CONSTRAINT "vouchers_budget_non_negative" CHECK (("vouchers"."total_budget_paise" IS NULL OR "vouchers"."total_budget_paise" >= 0) AND "vouchers"."budget_used_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "wallet_txn_type" NOT NULL,
	"status" "wallet_txn_status" DEFAULT 'COMPLETED' NOT NULL,
	"amount_paise" bigint NOT NULL,
	"previous_balance_paise" bigint NOT NULL,
	"new_balance_paise" bigint NOT NULL,
	"promotional_amount_paise" bigint DEFAULT 0 NOT NULL,
	"order_id" uuid,
	"subscription_id" uuid,
	"payment_id" uuid,
	"reversal_of_id" uuid,
	"voucher_redemption_id" uuid,
	"idempotency_key" text NOT NULL,
	"description" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_txn_amount_non_zero" CHECK ("wallet_transactions"."amount_paise" <> 0),
	CONSTRAINT "wallet_txn_balances_non_negative" CHECK ("wallet_transactions"."previous_balance_paise" >= 0 AND "wallet_transactions"."new_balance_paise" >= 0),
	CONSTRAINT "wallet_txn_arithmetic" CHECK ("wallet_transactions"."new_balance_paise" = "wallet_transactions"."previous_balance_paise" + "wallet_transactions"."amount_paise"),
	CONSTRAINT "wallet_txn_promotional_within_amount" CHECK (("wallet_transactions"."amount_paise" >= 0 AND "wallet_transactions"."promotional_amount_paise" >= 0 AND "wallet_transactions"."promotional_amount_paise" <= "wallet_transactions"."amount_paise")
          OR ("wallet_transactions"."amount_paise" < 0 AND "wallet_transactions"."promotional_amount_paise" <= 0 AND "wallet_transactions"."promotional_amount_paise" >= "wallet_transactions"."amount_paise"))
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance_paise" bigint DEFAULT 0 NOT NULL,
	"promotional_balance_paise" bigint DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"low_balance_threshold_paise" bigint DEFAULT 50000 NOT NULL,
	"auto_recharge_enabled" boolean DEFAULT false NOT NULL,
	"auto_recharge_trigger_paise" bigint,
	"auto_recharge_amount_paise" bigint,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"low_balance_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_balance_non_negative" CHECK ("wallets"."balance_paise" >= 0),
	CONSTRAINT "wallets_promotional_balance_bounded" CHECK ("wallets"."promotional_balance_paise" >= 0 AND "wallets"."promotional_balance_paise" <= "wallets"."balance_paise")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_shop_product_id_shop_products_id_fk" FOREIGN KEY ("shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_earnings_config" ADD CONSTRAINT "delivery_earnings_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_delivery_partner_id_delivery_partners_id_fk" FOREIGN KEY ("delivery_partner_id") REFERENCES "public"."delivery_partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_partner_earnings" ADD CONSTRAINT "delivery_partner_earnings_delivery_partner_id_delivery_partners_id_fk" FOREIGN KEY ("delivery_partner_id") REFERENCES "public"."delivery_partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_partner_earnings" ADD CONSTRAINT "delivery_partner_earnings_delivery_order_id_delivery_orders_id_fk" FOREIGN KEY ("delivery_order_id") REFERENCES "public"."delivery_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_partners" ADD CONSTRAINT "delivery_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_partners" ADD CONSTRAINT "delivery_partners_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_upload_items" ADD CONSTRAINT "excel_upload_items_upload_id_excel_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."excel_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_upload_items" ADD CONSTRAINT "excel_upload_items_matched_shop_product_id_shop_products_id_fk" FOREIGN KEY ("matched_shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_upload_items" ADD CONSTRAINT "excel_upload_items_matched_product_id_products_id_fk" FOREIGN KEY ("matched_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_upload_items" ADD CONSTRAINT "excel_upload_items_possible_duplicate_product_id_products_id_fk" FOREIGN KEY ("possible_duplicate_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_uploads" ADD CONSTRAINT "excel_uploads_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_uploads" ADD CONSTRAINT "excel_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_shop_product_id_shop_products_id_fk" FOREIGN KEY ("shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_product_id_shop_products_id_fk" FOREIGN KEY ("shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_batches" ADD CONSTRAINT "price_update_batches_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_batches" ADD CONSTRAINT "price_update_batches_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_batches" ADD CONSTRAINT "price_update_batches_excel_upload_id_excel_uploads_id_fk" FOREIGN KEY ("excel_upload_id") REFERENCES "public"."excel_uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_batches" ADD CONSTRAINT "price_update_batches_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_requests" ADD CONSTRAINT "price_update_requests_batch_id_price_update_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."price_update_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_requests" ADD CONSTRAINT "price_update_requests_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_requests" ADD CONSTRAINT "price_update_requests_shop_product_id_shop_products_id_fk" FOREIGN KEY ("shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_requests" ADD CONSTRAINT "price_update_requests_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_update_requests" ADD CONSTRAINT "price_update_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_shop_product_id_shop_products_id_fk" FOREIGN KEY ("shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_redemptions" ADD CONSTRAINT "referral_redemptions_redeemed_by_users_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_fee_history" ADD CONSTRAINT "registration_fee_history_registration_fee_id_registration_fees_id_fk" FOREIGN KEY ("registration_fee_id") REFERENCES "public"."registration_fees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_fee_history" ADD CONSTRAINT "registration_fee_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_fees" ADD CONSTRAINT "registration_fees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_key_roles_key_fk" FOREIGN KEY ("role_key") REFERENCES "public"."roles"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_classification_history" ADD CONSTRAINT "shop_classification_history_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_classification_history" ADD CONSTRAINT "shop_classification_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_payments" ADD CONSTRAINT "shop_payments_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_payments" ADD CONSTRAINT "shop_payments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_payments" ADD CONSTRAINT "shop_payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_gst_verified_by_users_id_fk" FOREIGN KEY ("gst_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_pan_verified_by_users_id_fk" FOREIGN KEY ("pan_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_daily_overrides" ADD CONSTRAINT "subscription_daily_overrides_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_daily_overrides" ADD CONSTRAINT "subscription_daily_overrides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_shop_product_id_shop_products_id_fk" FOREIGN KEY ("shop_product_id") REFERENCES "public"."shop_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_upload_items" ADD CONSTRAINT "voucher_upload_items_upload_id_voucher_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."voucher_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_upload_items" ADD CONSTRAINT "voucher_upload_items_created_voucher_id_vouchers_id_fk" FOREIGN KEY ("created_voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_uploads" ADD CONSTRAINT "voucher_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "addresses_user_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "addresses_pincode_idx" ON "addresses" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_product_unique" ON "cart_items" USING btree ("cart_id","shop_product_id");--> statement-breakpoint
CREATE INDEX "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_user_unique" ON "carts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_orders_order_id_unique" ON "delivery_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "delivery_orders_partner_idx" ON "delivery_orders" USING btree ("delivery_partner_id");--> statement-breakpoint
CREATE INDEX "delivery_orders_status_idx" ON "delivery_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_partner_earnings_order_unique" ON "delivery_partner_earnings" USING btree ("delivery_order_id");--> statement-breakpoint
CREATE INDEX "delivery_partner_earnings_partner_idx" ON "delivery_partner_earnings" USING btree ("delivery_partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_partners_user_id_unique" ON "delivery_partners" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "delivery_partners_status_idx" ON "delivery_partners" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "excel_upload_items_row_unique" ON "excel_upload_items" USING btree ("upload_id","row_number");--> statement-breakpoint
CREATE INDEX "excel_upload_items_upload_idx" ON "excel_upload_items" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "excel_uploads_shop_idx" ON "excel_uploads" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "excel_uploads_uploader_idx" ON "excel_uploads" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "excel_uploads_created_idx" ON "excel_uploads" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "grievances_ticket_number_unique" ON "grievances" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "grievances_status_idx" ON "grievances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grievances_email_idx" ON "grievances" USING btree ("email");--> statement-breakpoint
CREATE INDEX "grievances_submitted_by_idx" ON "grievances" USING btree ("submitted_by_user_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_sp_idx" ON "inventory_movements" USING btree ("shop_product_id");--> statement-breakpoint
CREATE INDEX "maps_api_call_log_service_idx" ON "maps_api_call_log" USING btree ("service");--> statement-breakpoint
CREATE INDEX "maps_api_call_log_created_idx" ON "maps_api_call_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "maps_api_call_log_entity_idx" ON "maps_api_call_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_unique" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_shop_idx" ON "orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_gateway_order_unique" ON "payments" USING btree ("gateway_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_gateway_payment_unique" ON "payments" USING btree ("gateway_payment_id");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "price_update_batches_shop_idx" ON "price_update_batches" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "price_update_batches_status_idx" ON "price_update_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_update_requests_batch_idx" ON "price_update_requests" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "price_update_requests_shop_idx" ON "price_update_requests" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "price_update_requests_status_idx" ON "price_update_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_update_requests_sp_idx" ON "price_update_requests" USING btree ("shop_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_slug_unique" ON "product_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_categories_dept_idx" ON "product_categories" USING btree ("department");--> statement-breakpoint
CREATE INDEX "price_history_shop_product_idx" ON "product_price_history" USING btree ("shop_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_code_unique" ON "products" USING btree ("code");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_approval_status_idx" ON "products" USING btree ("approval_status");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_codes_code_unique" ON "referral_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "referral_codes_status_idx" ON "referral_codes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_redemptions_shop_unique" ON "referral_redemptions" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "referral_redemptions_code_idx" ON "referral_redemptions" USING btree ("referral_code_id");--> statement-breakpoint
CREATE INDEX "registration_fee_history_created_idx" ON "registration_fee_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "registration_fees_effective_idx" ON "registration_fees" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shop_class_hist_shop_idx" ON "shop_classification_history" USING btree ("shop_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_payments_reference_unique" ON "shop_payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "shop_payments_shop_idx" ON "shop_payments" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shop_payments_owner_idx" ON "shop_payments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "shop_payments_paid_idx" ON "shop_payments" USING btree ("paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_products_shop_product_unique" ON "shop_products" USING btree ("shop_id","product_id");--> statement-breakpoint
CREATE INDEX "shop_products_shop_idx" ON "shop_products" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "shop_products_product_idx" ON "shop_products" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_slug_unique" ON "shops" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_registration_number_unique" ON "shops" USING btree ("registration_number");--> statement-breakpoint
CREATE INDEX "shops_owner_idx" ON "shops" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "shops_status_idx" ON "shops" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shops_city_idx" ON "shops" USING btree ("city");--> statement-breakpoint
CREATE INDEX "shops_pincode_idx" ON "shops" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "shops_fee_status_idx" ON "shops" USING btree ("fee_payment_status");--> statement-breakpoint
CREATE INDEX "shops_referral_idx" ON "shops" USING btree ("referral_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_override_sub_date_unique" ON "subscription_daily_overrides" USING btree ("subscription_id","delivery_date");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_orders_sub_date_unique" ON "subscription_orders" USING btree ("subscription_id","delivery_date");--> statement-breakpoint
CREATE INDEX "subscription_orders_date_idx" ON "subscription_orders" USING btree ("delivery_date");--> statement-breakpoint
CREATE INDEX "subscription_orders_status_idx" ON "subscription_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_shop_idx" ON "subscriptions" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_next_delivery_idx" ON "subscriptions" USING btree ("next_delivery_date");--> statement-breakpoint
CREATE INDEX "user_consents_user_idx" ON "user_consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_consents_type_idx" ON "user_consents" USING btree ("consent_type");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "voucher_redemptions_idempotency_unique" ON "voucher_redemptions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_voucher_idx" ON "voucher_redemptions" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "voucher_redemptions_user_idx" ON "voucher_redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "voucher_upload_items_row_unique" ON "voucher_upload_items" USING btree ("upload_id","row_number");--> statement-breakpoint
CREATE INDEX "voucher_upload_items_upload_idx" ON "voucher_upload_items" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "voucher_uploads_uploader_idx" ON "voucher_uploads" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "vouchers_code_unique" ON "vouchers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "vouchers_status_idx" ON "vouchers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vouchers_dates_idx" ON "vouchers" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_txn_idempotency_unique" ON "wallet_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "wallet_txn_wallet_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_user_idx" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_txn_created_idx" ON "wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_unique" ON "wallets" USING btree ("user_id");