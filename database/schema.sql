-- Milk & Dairy Products — PostgreSQL schema for one environment's database.
--
-- GENERATED, do not hand-edit: produced by scripts/dump-schema.sh, which applies
-- every migration in drizzle/ to a scratch database and dumps it with pg_dump.
-- The migrations are generated from src/server/db/schema.ts by
-- `npm run db:generate`. Change the schema in schema.ts, never here.
--
-- Two ways to apply it, to an EMPTY database (PostgreSQL 14 or newer):
--   * npm run db:migrate   (preferred — also records the migration, so later
--                           migrations apply on top of it)
--   * psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
--     (or paste it into your provider's SQL editor). This does NOT record the
--     migration: do not run `npm run db:migrate` against the same database
--     afterwards, or it will try to create everything again.

--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: consent_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.consent_type AS ENUM (
    'TERMS_AND_PRIVACY',
    'MARKETING_COMMUNICATIONS'
);

--
-- Name: delivery_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_order_status AS ENUM (
    'OFFERED',
    'ACCEPTED',
    'REJECTED',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED'
);

--
-- Name: delivery_partner_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_partner_status AS ENUM (
    'REGISTERED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'SUSPENDED',
    'DEACTIVATED'
);

--
-- Name: delivery_window; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_window AS ENUM (
    'EXPRESS_30',
    'STANDARD_60',
    'SCHEDULED'
);

--
-- Name: department; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.department AS ENUM (
    'GROCERY_KIRANA',
    'SUPERMARKET',
    'CONVENIENCE_STORE',
    'FRUIT_VEGETABLE',
    'DAIRY',
    'BAKERY',
    'MEAT_SHOP',
    'SWEET_SHOP',
    'PHARMACY',
    'OPTICAL_STORE',
    'CLOTHING_STORE',
    'FOOTWEAR_STORE',
    'JEWELLERY_STORE',
    'COSMETICS_BEAUTY',
    'MOBILE_PHONE_STORE',
    'ELECTRONICS_STORE',
    'COMPUTER_STORE',
    'FURNITURE_STORE',
    'HOME_APPLIANCE_STORE',
    'HARDWARE_STORE',
    'PAINT_SANITARY_STORE',
    'STATIONERY_STORE',
    'BOOKSTORE',
    'TOY_STORE',
    'SPORTS_STORE',
    'PET_STORE',
    'AUTO_SPARE_PARTS',
    'AUTO_ACCESSORIES',
    'MOBILE_ELECTRONICS_REPAIR',
    'GIFT_SHOP',
    'FLOWER_SHOP',
    'BUILDING_MATERIALS',
    'ELECTRICAL_SHOP',
    'AGRICULTURAL_SUPPLY',
    'POULTRY_SUPPLY',
    'RESTAURANT',
    'FAST_FOOD',
    'CAFE',
    'MEDICAL_EQUIPMENT',
    'PRINTING_PHOTOCOPY',
    'GENERAL_TRADING',
    'PACKAGING_MATERIALS',
    'WHOLESALE_STORE',
    'ONLINE_STORE'
);

--
-- Name: excel_row_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.excel_row_status AS ENUM (
    'VALID',
    'NO_CHANGE',
    'INVALID_PRICE',
    'DUPLICATE',
    'NOT_FOUND',
    'MISSING_FIELD',
    'NEW_PRODUCT'
);

--
-- Name: excel_upload_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.excel_upload_status AS ENUM (
    'VALIDATED',
    'APPLIED',
    'CANCELLED',
    'FAILED'
);

--
-- Name: excel_upload_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.excel_upload_type AS ENUM (
    'GOODS',
    'PRICES'
);

--
-- Name: fee_payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fee_payment_status AS ENUM (
    'PENDING',
    'PARTIALLY_PAID',
    'PAID',
    'REFUNDED',
    'CANCELLED'
);

--
-- Name: grievance_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grievance_category AS ENUM (
    'PAYMENT',
    'WALLET',
    'ORDER',
    'SUBSCRIPTION',
    'SELLER',
    'PRODUCT',
    'PRIVACY',
    'OTHER'
);

--
-- Name: grievance_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grievance_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);

--
-- Name: gst_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gst_status AS ENUM (
    'UNKNOWN',
    'NOT_REGISTERED',
    'PENDING_VERIFICATION',
    'REGISTERED',
    'COMPOSITION',
    'VERIFICATION_FAILED'
);

--
-- Name: identity_verification_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.identity_verification_source AS ENUM (
    'PROVIDER_VERIFIED',
    'SELF_DECLARED',
    'ADMIN_VERIFIED'
);

--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS',
    'PUSH'
);

--
-- Name: order_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_source AS ENUM (
    'DIRECT',
    'SUBSCRIPTION'
);

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'PAYMENT_FAILED',
    'WALLET_INSUFFICIENT',
    'REFUND_PENDING',
    'REFUNDED'
);

--
-- Name: override_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.override_type AS ENUM (
    'QUANTITY',
    'SKIP'
);

--
-- Name: pan_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pan_status AS ENUM (
    'UNKNOWN',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'VERIFICATION_FAILED'
);

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'CREATED',
    'PENDING',
    'SUCCESS',
    'FAILED',
    'REFUNDED'
);

--
-- Name: price_request_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_request_source AS ENUM (
    'SHOP_OWNER',
    'OPERATOR',
    'ADMIN'
);

--
-- Name: price_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUPERSEDED',
    'CANCELLED'
);

--
-- Name: product_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_approval_status AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED'
);

--
-- Name: referral_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.referral_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'EXPIRED'
);

--
-- Name: shop_classification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shop_classification AS ENUM (
    'KESARI',
    'GREEN'
);

--
-- Name: shop_payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shop_payment_method AS ENUM (
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'CARD',
    'CHEQUE',
    'RAZORPAY',
    'OTHER'
);

--
-- Name: shop_payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shop_payment_type AS ENUM (
    'REGISTRATION_FEE',
    'RENEWAL',
    'ADJUSTMENT',
    'REFUND',
    'REVERSAL'
);

--
-- Name: shop_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shop_status AS ENUM (
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'SUSPENDED',
    'INACTIVE'
);

--
-- Name: shop_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shop_type AS ENUM (
    'GROCERY_KIRANA',
    'SUPERMARKET',
    'CONVENIENCE_STORE',
    'FRUIT_VEGETABLE',
    'DAIRY',
    'BAKERY',
    'MEAT_SHOP',
    'SWEET_SHOP',
    'PHARMACY',
    'OPTICAL_STORE',
    'CLOTHING_STORE',
    'FOOTWEAR_STORE',
    'JEWELLERY_STORE',
    'COSMETICS_BEAUTY',
    'MOBILE_PHONE_STORE',
    'ELECTRONICS_STORE',
    'COMPUTER_STORE',
    'FURNITURE_STORE',
    'HOME_APPLIANCE_STORE',
    'HARDWARE_STORE',
    'PAINT_SANITARY_STORE',
    'STATIONERY_STORE',
    'BOOKSTORE',
    'TOY_STORE',
    'SPORTS_STORE',
    'PET_STORE',
    'AUTO_SPARE_PARTS',
    'AUTO_ACCESSORIES',
    'MOBILE_ELECTRONICS_REPAIR',
    'GIFT_SHOP',
    'FLOWER_SHOP',
    'BUILDING_MATERIALS',
    'ELECTRICAL_SHOP',
    'AGRICULTURAL_SUPPLY',
    'POULTRY_SUPPLY',
    'RESTAURANT',
    'FAST_FOOD',
    'CAFE',
    'MEDICAL_EQUIPMENT',
    'PRINTING_PHOTOCOPY',
    'GENERAL_TRADING',
    'PACKAGING_MATERIALS',
    'WHOLESALE_STORE',
    'ONLINE_STORE'
);

--
-- Name: subscription_frequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_frequency AS ENUM (
    'DAILY',
    'WEEKLY'
);

--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'CANCELLED',
    'COMPLETED',
    'PAYMENT_PENDING'
);

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'CUSTOMER',
    'SHOP_OWNER',
    'OPERATOR',
    'ADMIN',
    'DELIVERY_PARTNER'
);

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);

--
-- Name: voucher_apply_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voucher_apply_mode AS ENUM (
    'CODE',
    'AUTO_APPLY'
);

--
-- Name: voucher_redemption_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voucher_redemption_status AS ENUM (
    'PENDING',
    'APPLIED',
    'REVERSED',
    'REJECTED'
);

--
-- Name: voucher_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voucher_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'EXPIRED',
    'BUDGET_EXHAUSTED'
);

--
-- Name: voucher_upload_row_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voucher_upload_row_status AS ENUM (
    'VALID',
    'DUPLICATE_IN_FILE',
    'DUPLICATE_EXISTING',
    'INVALID'
);

--
-- Name: voucher_upload_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.voucher_upload_status AS ENUM (
    'VALIDATED',
    'APPLIED',
    'CANCELLED'
);

--
-- Name: wallet_txn_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_txn_status AS ENUM (
    'COMPLETED',
    'REVERSED'
);

--
-- Name: wallet_txn_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_txn_type AS ENUM (
    'TOP_UP',
    'PRODUCT_PURCHASE',
    'SUBSCRIPTION_DEDUCTION',
    'REFUND',
    'PROMOTIONAL_CREDIT',
    'MANUAL_CREDIT',
    'MANUAL_DEBIT',
    'REVERSAL'
);

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    user_id uuid NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text,
    line1 text NOT NULL,
    line2 text,
    area text,
    city text NOT NULL,
    state text,
    pincode text NOT NULL,
    latitude text,
    longitude text,
    landmark text,
    delivery_instructions text,
    is_default boolean DEFAULT false NOT NULL,
    location_verified boolean DEFAULT false NOT NULL,
    location_verified_at timestamp with time zone,
    location_source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_role public.user_role,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    previous_value jsonb,
    new_value jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    shop_product_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_positive CHECK ((quantity > 0))
);

--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: delivery_earnings_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_earnings_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_fee_paise bigint NOT NULL,
    per_km_fee_paise bigint NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT delivery_earnings_config_non_negative CHECK (((base_fee_paise >= 0) AND (per_km_fee_paise >= 0)))
);

--
-- Name: delivery_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    delivery_partner_id uuid NOT NULL,
    status public.delivery_order_status DEFAULT 'OFFERED'::public.delivery_order_status NOT NULL,
    distance_km text,
    offered_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    delivered_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: delivery_partner_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_partner_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_partner_id uuid NOT NULL,
    delivery_order_id uuid NOT NULL,
    base_paise bigint NOT NULL,
    distance_paise bigint NOT NULL,
    total_paise bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: delivery_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    mobile text NOT NULL,
    email text,
    date_of_birth date,
    profile_photo_url text,
    pan_number text,
    government_id_type text,
    government_id_number text,
    bank_account_holder_name text,
    bank_account_number text,
    bank_ifsc text,
    vehicle_type text NOT NULL,
    vehicle_registration_number text,
    driving_licence_number text,
    latitude text,
    longitude text,
    operating_radius_km integer DEFAULT 5 NOT NULL,
    location_verified boolean DEFAULT false NOT NULL,
    location_verified_at timestamp with time zone,
    location_source text,
    status public.delivery_partner_status DEFAULT 'REGISTERED'::public.delivery_partner_status NOT NULL,
    review_notes text,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    is_online boolean DEFAULT false NOT NULL,
    last_location_latitude text,
    last_location_longitude text,
    last_location_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: excel_upload_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excel_upload_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id uuid NOT NULL,
    row_number integer NOT NULL,
    raw_data jsonb,
    product_code text,
    product_name text,
    unit text,
    parsed_price_paise bigint,
    previous_price_paise bigint,
    matched_shop_product_id uuid,
    matched_product_id uuid,
    possible_duplicate_product_id uuid,
    status public.excel_row_status NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: excel_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.excel_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    upload_type public.excel_upload_type DEFAULT 'PRICES'::public.excel_upload_type NOT NULL,
    status public.excel_upload_status DEFAULT 'VALIDATED'::public.excel_upload_status NOT NULL,
    file_name text NOT NULL,
    file_size_bytes integer DEFAULT 0 NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    valid_rows integer DEFAULT 0 NOT NULL,
    invalid_rows integer DEFAULT 0 NOT NULL,
    unchanged_rows integer DEFAULT 0 NOT NULL,
    duplicate_rows integer DEFAULT 0 NOT NULL,
    not_found_rows integer DEFAULT 0 NOT NULL,
    summary jsonb,
    error_message text,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: grievance_ticket_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grievance_ticket_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: grievances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grievances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text DEFAULT ('GRV-'::text || lpad((nextval('public.grievance_ticket_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    submitted_by_user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    category public.grievance_category DEFAULT 'OTHER'::public.grievance_category NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status public.grievance_status DEFAULT 'OPEN'::public.grievance_status NOT NULL,
    assigned_to_user_id uuid,
    resolution_notes text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_product_id uuid NOT NULL,
    channel text NOT NULL,
    delta_units integer NOT NULL,
    previous_units integer NOT NULL,
    new_units integer NOT NULL,
    reason text NOT NULL,
    order_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: maps_api_call_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maps_api_call_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service text NOT NULL,
    purpose text NOT NULL,
    entity_type text,
    entity_id text,
    success boolean NOT NULL,
    response_time_ms integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    channel public.notification_channel DEFAULT 'IN_APP'::public.notification_channel NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    action_url text,
    metadata jsonb,
    read_at timestamp with time zone,
    sent_at timestamp with time zone,
    dedupe_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_product_id uuid NOT NULL,
    product_name_snapshot text NOT NULL,
    unit_snapshot text NOT NULL,
    unit_price_paise bigint NOT NULL,
    quantity_milli integer NOT NULL,
    line_total_paise bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_amounts_non_negative CHECK (((unit_price_paise >= 0) AND (line_total_paise >= 0))),
    CONSTRAINT order_items_quantity_positive CHECK ((quantity_milli > 0))
);

--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    previous_status public.order_status,
    new_status public.order_status NOT NULL,
    changed_by uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    address_id uuid,
    delivery_address_snapshot jsonb,
    status public.order_status DEFAULT 'PENDING'::public.order_status NOT NULL,
    source public.order_source DEFAULT 'DIRECT'::public.order_source NOT NULL,
    subtotal_paise bigint NOT NULL,
    delivery_fee_paise bigint DEFAULT 0 NOT NULL,
    tax_paise bigint DEFAULT 0 NOT NULL,
    total_paise bigint NOT NULL,
    paid_at timestamp with time zone,
    delivery_date date,
    notes text,
    cancellation_reason text,
    delivery_window public.delivery_window,
    promised_by_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_totals_non_negative CHECK (((subtotal_paise >= 0) AND (total_paise >= 0)))
);

--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    gateway text DEFAULT 'CASHFREE'::text NOT NULL,
    gateway_order_id text NOT NULL,
    gateway_payment_id text,
    gateway_signature text,
    amount_paise bigint NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status public.payment_status DEFAULT 'CREATED'::public.payment_status NOT NULL,
    purpose text DEFAULT 'WALLET_TOPUP'::text NOT NULL,
    failure_reason text,
    raw_payload jsonb,
    voucher_code text,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_positive CHECK ((amount_paise > 0))
);

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    key text NOT NULL,
    description text NOT NULL
);

--
-- Name: price_update_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_update_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    source public.price_request_source NOT NULL,
    submitted_by uuid NOT NULL,
    excel_upload_id uuid,
    status public.price_request_status DEFAULT 'PENDING'::public.price_request_status NOT NULL,
    note text,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: price_update_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_update_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    shop_product_id uuid NOT NULL,
    price_type text NOT NULL,
    previous_price_paise bigint,
    proposed_price_paise bigint NOT NULL,
    status public.price_request_status DEFAULT 'PENDING'::public.price_request_status NOT NULL,
    source public.price_request_source NOT NULL,
    submitted_by uuid NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    rejection_reason text,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT price_update_requests_price_non_negative CHECK ((proposed_price_paise >= 0))
);

--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department public.department NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: product_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_product_id uuid NOT NULL,
    price_type text NOT NULL,
    previous_price_paise bigint,
    new_price_paise bigint NOT NULL,
    changed_by uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    code text DEFAULT ('P'::text || lpad((nextval('public.product_code_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    specifications text,
    sub_category text,
    image_url text,
    unit text NOT NULL,
    unit_size_milli integer DEFAULT 1000 NOT NULL,
    subscribable boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    approval_status public.product_approval_status DEFAULT 'APPROVED'::public.product_approval_status NOT NULL,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text,
    referrer_name text,
    referrer_user_id uuid,
    status public.referral_status DEFAULT 'ACTIVE'::public.referral_status NOT NULL,
    expires_at date,
    note text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: referral_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    registration_fee_paise bigint,
    redeemed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: registration_fee_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_fee_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_fee_id uuid NOT NULL,
    previous_amount_paise bigint,
    new_amount_paise bigint NOT NULL,
    effective_from date NOT NULL,
    changed_by uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: registration_fees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registration_fees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    amount_paise bigint NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    effective_from date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT registration_fees_amount_non_negative CHECK ((amount_paise >= 0))
);

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_key public.user_role NOT NULL,
    permission_key text NOT NULL
);

--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    key public.user_role NOT NULL,
    label text NOT NULL,
    description text
);

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    session_token text NOT NULL,
    user_id uuid NOT NULL,
    expires timestamp with time zone NOT NULL
);

--
-- Name: shop_classification_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_classification_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    previous_value public.shop_classification,
    new_value public.shop_classification NOT NULL,
    changed_by uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: shop_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    shop_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    payment_type public.shop_payment_type NOT NULL,
    amount_paise bigint NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    method public.shop_payment_method DEFAULT 'CASH'::public.shop_payment_method NOT NULL,
    transaction_id text,
    fee_snapshot_paise bigint,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    receipt_url text,
    reversal_of_id uuid,
    recorded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_payments_amount_non_zero CHECK ((amount_paise <> 0))
);

--
-- Name: shop_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    description text,
    image_url text,
    online_price_paise bigint,
    offline_price_paise bigint,
    online_sale_enabled boolean DEFAULT false NOT NULL,
    offline_sale_enabled boolean DEFAULT false NOT NULL,
    track_inventory boolean DEFAULT true NOT NULL,
    online_stock integer DEFAULT 0 NOT NULL,
    offline_stock integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT shop_products_offline_requires_price CHECK (((offline_sale_enabled = false) OR (offline_price_paise IS NOT NULL))),
    CONSTRAINT shop_products_online_requires_price CHECK (((online_sale_enabled = false) OR (online_price_paise IS NOT NULL))),
    CONSTRAINT shop_products_prices_non_negative CHECK ((((online_price_paise IS NULL) OR (online_price_paise >= 0)) AND ((offline_price_paise IS NULL) OR (offline_price_paise >= 0)))),
    CONSTRAINT shop_products_stock_non_negative CHECK (((online_stock >= 0) AND (offline_stock >= 0)))
);

--
-- Name: shop_registration_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shop_registration_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    owner_name text NOT NULL,
    phone text NOT NULL,
    email text,
    address_line1 text NOT NULL,
    address_line2 text,
    area text,
    city text NOT NULL,
    state text,
    pincode text NOT NULL,
    latitude text,
    longitude text,
    shop_type public.shop_type NOT NULL,
    status public.shop_status DEFAULT 'PENDING_APPROVAL'::public.shop_status NOT NULL,
    classification public.shop_classification,
    logo_url text,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    opening_hours jsonb DEFAULT '[]'::jsonb NOT NULL,
    delivery_available boolean DEFAULT false NOT NULL,
    delivery_fee_paise bigint DEFAULT 0 NOT NULL,
    free_delivery_above_paise bigint,
    preparation_time_minutes integer DEFAULT 15 NOT NULL,
    description text,
    rejection_reason text,
    approved_at timestamp with time zone,
    approved_by uuid,
    registration_number text DEFAULT ('BKS-'::text || lpad((nextval('public.shop_registration_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
    registration_date date,
    registration_fee_paise bigint,
    registration_fee_id uuid,
    referral_code_id uuid,
    fee_payment_status public.fee_payment_status DEFAULT 'PENDING'::public.fee_payment_status NOT NULL,
    amount_paid_paise bigint DEFAULT 0 NOT NULL,
    legal_business_name text,
    gstin text,
    fssai_license_number text,
    gst_status public.gst_status DEFAULT 'UNKNOWN'::public.gst_status NOT NULL,
    gst_trade_name text,
    gst_verification_source public.identity_verification_source,
    gst_verified_at timestamp with time zone,
    gst_verified_by uuid,
    pan_status public.pan_status DEFAULT 'UNKNOWN'::public.pan_status NOT NULL,
    pan_number_encrypted text,
    pan_last4 text,
    pan_holder_name text,
    pan_verification_source public.identity_verification_source,
    pan_verified_at timestamp with time zone,
    pan_verified_by uuid,
    return_policy_text text,
    pickup_latitude text,
    pickup_longitude text,
    pickup_instructions text,
    landmark text,
    location_verified boolean DEFAULT false NOT NULL,
    location_verified_at timestamp with time zone,
    location_source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT shops_delivery_fee_non_negative CHECK ((delivery_fee_paise >= 0)),
    CONSTRAINT shops_registration_amounts_non_negative CHECK ((((registration_fee_paise IS NULL) OR (registration_fee_paise >= 0)) AND (amount_paid_paise >= 0)))
);

--
-- Name: subscription_daily_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_daily_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    delivery_date date NOT NULL,
    type public.override_type NOT NULL,
    quantity_milli integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sub_override_quantity_matches_type CHECK ((((type = 'SKIP'::public.override_type) AND (quantity_milli IS NULL)) OR ((type = 'QUANTITY'::public.override_type) AND (quantity_milli IS NOT NULL) AND (quantity_milli > 0))))
);

--
-- Name: subscription_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    order_id uuid,
    delivery_date date NOT NULL,
    quantity_milli integer NOT NULL,
    unit_price_paise bigint NOT NULL,
    total_paise bigint NOT NULL,
    status public.order_status DEFAULT 'PENDING'::public.order_status NOT NULL,
    failure_reason text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    shop_product_id uuid NOT NULL,
    address_id uuid,
    quantity_milli integer NOT NULL,
    frequency public.subscription_frequency DEFAULT 'DAILY'::public.subscription_frequency NOT NULL,
    weekdays jsonb DEFAULT '[]'::jsonb NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_delivery_date date,
    status public.subscription_status DEFAULT 'ACTIVE'::public.subscription_status NOT NULL,
    pause_from date,
    pause_until date,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_pause_window_valid CHECK ((((pause_from IS NULL) AND (pause_until IS NULL)) OR ((pause_from IS NOT NULL) AND (pause_until IS NOT NULL) AND (pause_until >= pause_from)))),
    CONSTRAINT subscriptions_quantity_positive CHECK ((quantity_milli > 0))
);

--
-- Name: user_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    consent_type public.consent_type NOT NULL,
    version text NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    email text NOT NULL,
    email_verified timestamp with time zone,
    image text,
    phone text,
    role public.user_role DEFAULT 'CUSTOMER'::public.user_role NOT NULL,
    status public.user_status DEFAULT 'ACTIVE'::public.user_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp with time zone NOT NULL
);

--
-- Name: voucher_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voucher_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    payment_id uuid,
    topup_amount_paise bigint NOT NULL,
    bonus_percent bigint NOT NULL,
    bonus_amount_paise bigint NOT NULL,
    status public.voucher_redemption_status DEFAULT 'PENDING'::public.voucher_redemption_status NOT NULL,
    idempotency_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT voucher_redemptions_amounts_non_negative CHECK (((topup_amount_paise >= 0) AND (bonus_amount_paise >= 0)))
);

--
-- Name: voucher_upload_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voucher_upload_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id uuid NOT NULL,
    row_number integer NOT NULL,
    raw_data jsonb,
    voucher_name text,
    voucher_code text,
    status public.voucher_upload_row_status NOT NULL,
    error_message text,
    created_voucher_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: voucher_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voucher_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name text NOT NULL,
    status public.voucher_upload_status DEFAULT 'VALIDATED'::public.voucher_upload_status NOT NULL,
    total_records integer DEFAULT 0 NOT NULL,
    successful_records integer DEFAULT 0 NOT NULL,
    failed_records integer DEFAULT 0 NOT NULL,
    summary jsonb,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    terms_and_conditions text,
    apply_mode public.voucher_apply_mode DEFAULT 'CODE'::public.voucher_apply_mode NOT NULL,
    bonus_percent bigint NOT NULL,
    minimum_topup_paise bigint DEFAULT 0 NOT NULL,
    maximum_bonus_paise bigint,
    start_date date NOT NULL,
    end_date date NOT NULL,
    usage_limit integer,
    per_customer_limit integer DEFAULT 1 NOT NULL,
    total_budget_paise bigint,
    budget_used_paise bigint DEFAULT 0 NOT NULL,
    redemption_count integer DEFAULT 0 NOT NULL,
    status public.voucher_status DEFAULT 'DRAFT'::public.voucher_status NOT NULL,
    applicable_scope text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vouchers_bonus_percent_range CHECK (((bonus_percent > 0) AND (bonus_percent <= 100))),
    CONSTRAINT vouchers_budget_non_negative CHECK ((((total_budget_paise IS NULL) OR (total_budget_paise >= 0)) AND (budget_used_paise >= 0))),
    CONSTRAINT vouchers_dates_valid CHECK ((end_date >= start_date)),
    CONSTRAINT vouchers_maximum_bonus_non_negative CHECK (((maximum_bonus_paise IS NULL) OR (maximum_bonus_paise >= 0))),
    CONSTRAINT vouchers_minimum_topup_non_negative CHECK ((minimum_topup_paise >= 0)),
    CONSTRAINT vouchers_per_customer_limit_positive CHECK ((per_customer_limit > 0)),
    CONSTRAINT vouchers_usage_limit_positive CHECK (((usage_limit IS NULL) OR (usage_limit > 0)))
);

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    type public.wallet_txn_type NOT NULL,
    status public.wallet_txn_status DEFAULT 'COMPLETED'::public.wallet_txn_status NOT NULL,
    amount_paise bigint NOT NULL,
    previous_balance_paise bigint NOT NULL,
    new_balance_paise bigint NOT NULL,
    promotional_amount_paise bigint DEFAULT 0 NOT NULL,
    order_id uuid,
    subscription_id uuid,
    payment_id uuid,
    reversal_of_id uuid,
    voucher_redemption_id uuid,
    idempotency_key text NOT NULL,
    description text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_txn_amount_non_zero CHECK ((amount_paise <> 0)),
    CONSTRAINT wallet_txn_arithmetic CHECK ((new_balance_paise = (previous_balance_paise + amount_paise))),
    CONSTRAINT wallet_txn_balances_non_negative CHECK (((previous_balance_paise >= 0) AND (new_balance_paise >= 0))),
    CONSTRAINT wallet_txn_promotional_within_amount CHECK ((((amount_paise >= 0) AND (promotional_amount_paise >= 0) AND (promotional_amount_paise <= amount_paise)) OR ((amount_paise < 0) AND (promotional_amount_paise <= 0) AND (promotional_amount_paise >= amount_paise))))
);

--
-- Name: wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance_paise bigint DEFAULT 0 NOT NULL,
    promotional_balance_paise bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    low_balance_threshold_paise bigint DEFAULT 50000 NOT NULL,
    auto_recharge_enabled boolean DEFAULT false NOT NULL,
    auto_recharge_trigger_paise bigint,
    auto_recharge_amount_paise bigint,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    low_balance_notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallets_balance_non_negative CHECK ((balance_paise >= 0)),
    CONSTRAINT wallets_promotional_balance_bounded CHECK (((promotional_balance_paise >= 0) AND (promotional_balance_paise <= balance_paise)))
);

--
-- Name: accounts accounts_provider_provider_account_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_provider_provider_account_id_pk PRIMARY KEY (provider, provider_account_id);

--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);

--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);

--
-- Name: delivery_earnings_config delivery_earnings_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_earnings_config
    ADD CONSTRAINT delivery_earnings_config_pkey PRIMARY KEY (id);

--
-- Name: delivery_orders delivery_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_pkey PRIMARY KEY (id);

--
-- Name: delivery_partner_earnings delivery_partner_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_partner_earnings
    ADD CONSTRAINT delivery_partner_earnings_pkey PRIMARY KEY (id);

--
-- Name: delivery_partners delivery_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_partners
    ADD CONSTRAINT delivery_partners_pkey PRIMARY KEY (id);

--
-- Name: excel_upload_items excel_upload_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_upload_items
    ADD CONSTRAINT excel_upload_items_pkey PRIMARY KEY (id);

--
-- Name: excel_uploads excel_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_uploads
    ADD CONSTRAINT excel_uploads_pkey PRIMARY KEY (id);

--
-- Name: grievances grievances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_pkey PRIMARY KEY (id);

--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);

--
-- Name: maps_api_call_log maps_api_call_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maps_api_call_log
    ADD CONSTRAINT maps_api_call_log_pkey PRIMARY KEY (id);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);

--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (key);

--
-- Name: price_update_batches price_update_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_batches
    ADD CONSTRAINT price_update_batches_pkey PRIMARY KEY (id);

--
-- Name: price_update_requests price_update_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_requests
    ADD CONSTRAINT price_update_requests_pkey PRIMARY KEY (id);

--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);

--
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);

--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);

--
-- Name: referral_redemptions referral_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_redemptions
    ADD CONSTRAINT referral_redemptions_pkey PRIMARY KEY (id);

--
-- Name: registration_fee_history registration_fee_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_fee_history
    ADD CONSTRAINT registration_fee_history_pkey PRIMARY KEY (id);

--
-- Name: registration_fees registration_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_fees
    ADD CONSTRAINT registration_fees_pkey PRIMARY KEY (id);

--
-- Name: role_permissions role_permissions_role_key_permission_key_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_key_permission_key_pk PRIMARY KEY (role_key, permission_key);

--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (key);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_token);

--
-- Name: shop_classification_history shop_classification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_classification_history
    ADD CONSTRAINT shop_classification_history_pkey PRIMARY KEY (id);

--
-- Name: shop_payments shop_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_payments
    ADD CONSTRAINT shop_payments_pkey PRIMARY KEY (id);

--
-- Name: shop_products shop_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_pkey PRIMARY KEY (id);

--
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);

--
-- Name: subscription_daily_overrides subscription_daily_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_daily_overrides
    ADD CONSTRAINT subscription_daily_overrides_pkey PRIMARY KEY (id);

--
-- Name: subscription_orders subscription_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_orders
    ADD CONSTRAINT subscription_orders_pkey PRIMARY KEY (id);

--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

--
-- Name: user_consents user_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_pkey PRIMARY KEY (id);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: verification_tokens verification_tokens_identifier_token_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_tokens
    ADD CONSTRAINT verification_tokens_identifier_token_pk PRIMARY KEY (identifier, token);

--
-- Name: voucher_redemptions voucher_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_pkey PRIMARY KEY (id);

--
-- Name: voucher_upload_items voucher_upload_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_upload_items
    ADD CONSTRAINT voucher_upload_items_pkey PRIMARY KEY (id);

--
-- Name: voucher_uploads voucher_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_uploads
    ADD CONSTRAINT voucher_uploads_pkey PRIMARY KEY (id);

--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);

--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);

--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);

--
-- Name: accounts_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_idx ON public.accounts USING btree (user_id);

--
-- Name: addresses_pincode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX addresses_pincode_idx ON public.addresses USING btree (pincode);

--
-- Name: addresses_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX addresses_user_idx ON public.addresses USING btree (user_id);

--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id);

--
-- Name: audit_logs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_idx ON public.audit_logs USING btree (created_at);

--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id);

--
-- Name: cart_items_cart_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cart_items_cart_idx ON public.cart_items USING btree (cart_id);

--
-- Name: cart_items_cart_product_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_items_cart_product_unique ON public.cart_items USING btree (cart_id, shop_product_id);

--
-- Name: carts_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX carts_user_unique ON public.carts USING btree (user_id);

--
-- Name: delivery_orders_order_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX delivery_orders_order_id_unique ON public.delivery_orders USING btree (order_id);

--
-- Name: delivery_orders_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_orders_partner_idx ON public.delivery_orders USING btree (delivery_partner_id);

--
-- Name: delivery_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_orders_status_idx ON public.delivery_orders USING btree (status);

--
-- Name: delivery_partner_earnings_order_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX delivery_partner_earnings_order_unique ON public.delivery_partner_earnings USING btree (delivery_order_id);

--
-- Name: delivery_partner_earnings_partner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_partner_earnings_partner_idx ON public.delivery_partner_earnings USING btree (delivery_partner_id);

--
-- Name: delivery_partners_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX delivery_partners_status_idx ON public.delivery_partners USING btree (status);

--
-- Name: delivery_partners_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX delivery_partners_user_id_unique ON public.delivery_partners USING btree (user_id);

--
-- Name: excel_upload_items_row_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX excel_upload_items_row_unique ON public.excel_upload_items USING btree (upload_id, row_number);

--
-- Name: excel_upload_items_upload_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX excel_upload_items_upload_idx ON public.excel_upload_items USING btree (upload_id);

--
-- Name: excel_uploads_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX excel_uploads_created_idx ON public.excel_uploads USING btree (created_at);

--
-- Name: excel_uploads_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX excel_uploads_shop_idx ON public.excel_uploads USING btree (shop_id);

--
-- Name: excel_uploads_uploader_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX excel_uploads_uploader_idx ON public.excel_uploads USING btree (uploaded_by);

--
-- Name: grievances_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX grievances_email_idx ON public.grievances USING btree (email);

--
-- Name: grievances_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX grievances_status_idx ON public.grievances USING btree (status);

--
-- Name: grievances_submitted_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX grievances_submitted_by_idx ON public.grievances USING btree (submitted_by_user_id);

--
-- Name: grievances_ticket_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX grievances_ticket_number_unique ON public.grievances USING btree (ticket_number);

--
-- Name: inventory_movements_sp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_movements_sp_idx ON public.inventory_movements USING btree (shop_product_id);

--
-- Name: maps_api_call_log_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maps_api_call_log_created_idx ON public.maps_api_call_log USING btree (created_at);

--
-- Name: maps_api_call_log_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maps_api_call_log_entity_idx ON public.maps_api_call_log USING btree (entity_type, entity_id);

--
-- Name: maps_api_call_log_service_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX maps_api_call_log_service_idx ON public.maps_api_call_log USING btree (service);

--
-- Name: notifications_dedupe_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notifications_dedupe_unique ON public.notifications USING btree (dedupe_key);

--
-- Name: notifications_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_read_idx ON public.notifications USING btree (user_id, read_at);

--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id);

--
-- Name: order_items_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);

--
-- Name: order_status_history_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_status_history_order_idx ON public.order_status_history USING btree (order_id);

--
-- Name: orders_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_created_idx ON public.orders USING btree (created_at);

--
-- Name: orders_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX orders_number_unique ON public.orders USING btree (order_number);

--
-- Name: orders_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_shop_idx ON public.orders USING btree (shop_id);

--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);

--
-- Name: orders_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_user_idx ON public.orders USING btree (user_id);

--
-- Name: payments_gateway_order_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_gateway_order_unique ON public.payments USING btree (gateway_order_id);

--
-- Name: payments_gateway_payment_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_gateway_payment_unique ON public.payments USING btree (gateway_payment_id);

--
-- Name: payments_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_user_idx ON public.payments USING btree (user_id);

--
-- Name: price_history_shop_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_history_shop_product_idx ON public.product_price_history USING btree (shop_product_id);

--
-- Name: price_update_batches_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_update_batches_shop_idx ON public.price_update_batches USING btree (shop_id);

--
-- Name: price_update_batches_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_update_batches_status_idx ON public.price_update_batches USING btree (status);

--
-- Name: price_update_requests_batch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_update_requests_batch_idx ON public.price_update_requests USING btree (batch_id);

--
-- Name: price_update_requests_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_update_requests_shop_idx ON public.price_update_requests USING btree (shop_id);

--
-- Name: price_update_requests_sp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_update_requests_sp_idx ON public.price_update_requests USING btree (shop_product_id);

--
-- Name: price_update_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_update_requests_status_idx ON public.price_update_requests USING btree (status);

--
-- Name: product_categories_dept_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_categories_dept_idx ON public.product_categories USING btree (department);

--
-- Name: product_categories_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_categories_slug_unique ON public.product_categories USING btree (slug);

--
-- Name: products_approval_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_approval_status_idx ON public.products USING btree (approval_status);

--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_idx ON public.products USING btree (category_id);

--
-- Name: products_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_code_unique ON public.products USING btree (code);

--
-- Name: products_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_slug_unique ON public.products USING btree (slug);

--
-- Name: referral_codes_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referral_codes_code_unique ON public.referral_codes USING btree (code);

--
-- Name: referral_codes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_codes_status_idx ON public.referral_codes USING btree (status);

--
-- Name: referral_redemptions_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX referral_redemptions_code_idx ON public.referral_redemptions USING btree (referral_code_id);

--
-- Name: referral_redemptions_shop_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referral_redemptions_shop_unique ON public.referral_redemptions USING btree (shop_id);

--
-- Name: registration_fee_history_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registration_fee_history_created_idx ON public.registration_fee_history USING btree (created_at);

--
-- Name: registration_fees_effective_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registration_fees_effective_idx ON public.registration_fees USING btree (effective_from);

--
-- Name: sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);

--
-- Name: shop_class_hist_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_class_hist_shop_idx ON public.shop_classification_history USING btree (shop_id);

--
-- Name: shop_payments_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_payments_owner_idx ON public.shop_payments USING btree (owner_id);

--
-- Name: shop_payments_paid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_payments_paid_idx ON public.shop_payments USING btree (paid_at);

--
-- Name: shop_payments_reference_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shop_payments_reference_unique ON public.shop_payments USING btree (reference);

--
-- Name: shop_payments_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_payments_shop_idx ON public.shop_payments USING btree (shop_id);

--
-- Name: shop_products_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_products_product_idx ON public.shop_products USING btree (product_id);

--
-- Name: shop_products_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_products_shop_idx ON public.shop_products USING btree (shop_id);

--
-- Name: shop_products_shop_product_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shop_products_shop_product_unique ON public.shop_products USING btree (shop_id, product_id);

--
-- Name: shops_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_city_idx ON public.shops USING btree (city);

--
-- Name: shops_fee_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_fee_status_idx ON public.shops USING btree (fee_payment_status);

--
-- Name: shops_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_owner_idx ON public.shops USING btree (owner_id);

--
-- Name: shops_pincode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_pincode_idx ON public.shops USING btree (pincode);

--
-- Name: shops_referral_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_referral_idx ON public.shops USING btree (referral_code_id);

--
-- Name: shops_registration_number_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_registration_number_unique ON public.shops USING btree (registration_number);

--
-- Name: shops_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shops_slug_unique ON public.shops USING btree (slug);

--
-- Name: shops_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shops_status_idx ON public.shops USING btree (status);

--
-- Name: sub_override_sub_date_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sub_override_sub_date_unique ON public.subscription_daily_overrides USING btree (subscription_id, delivery_date);

--
-- Name: subscription_orders_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_orders_date_idx ON public.subscription_orders USING btree (delivery_date);

--
-- Name: subscription_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscription_orders_status_idx ON public.subscription_orders USING btree (status);

--
-- Name: subscription_orders_sub_date_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscription_orders_sub_date_unique ON public.subscription_orders USING btree (subscription_id, delivery_date);

--
-- Name: subscriptions_next_delivery_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_next_delivery_idx ON public.subscriptions USING btree (next_delivery_date);

--
-- Name: subscriptions_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_shop_idx ON public.subscriptions USING btree (shop_id);

--
-- Name: subscriptions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);

--
-- Name: subscriptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_idx ON public.subscriptions USING btree (user_id);

--
-- Name: user_consents_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_consents_type_idx ON public.user_consents USING btree (consent_type);

--
-- Name: user_consents_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_consents_user_idx ON public.user_consents USING btree (user_id);

--
-- Name: users_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_unique ON public.users USING btree (email);

--
-- Name: voucher_redemptions_idempotency_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX voucher_redemptions_idempotency_unique ON public.voucher_redemptions USING btree (idempotency_key);

--
-- Name: voucher_redemptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX voucher_redemptions_user_idx ON public.voucher_redemptions USING btree (user_id);

--
-- Name: voucher_redemptions_voucher_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX voucher_redemptions_voucher_idx ON public.voucher_redemptions USING btree (voucher_id);

--
-- Name: voucher_upload_items_row_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX voucher_upload_items_row_unique ON public.voucher_upload_items USING btree (upload_id, row_number);

--
-- Name: voucher_upload_items_upload_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX voucher_upload_items_upload_idx ON public.voucher_upload_items USING btree (upload_id);

--
-- Name: voucher_uploads_uploader_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX voucher_uploads_uploader_idx ON public.voucher_uploads USING btree (uploaded_by);

--
-- Name: vouchers_code_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vouchers_code_unique ON public.vouchers USING btree (code);

--
-- Name: vouchers_dates_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vouchers_dates_idx ON public.vouchers USING btree (start_date, end_date);

--
-- Name: vouchers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vouchers_status_idx ON public.vouchers USING btree (status);

--
-- Name: wallet_txn_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_txn_created_idx ON public.wallet_transactions USING btree (created_at);

--
-- Name: wallet_txn_idempotency_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wallet_txn_idempotency_unique ON public.wallet_transactions USING btree (idempotency_key);

--
-- Name: wallet_txn_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_txn_user_idx ON public.wallet_transactions USING btree (user_id);

--
-- Name: wallet_txn_wallet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX wallet_txn_wallet_idx ON public.wallet_transactions USING btree (wallet_id);

--
-- Name: wallets_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX wallets_user_unique ON public.wallets USING btree (user_id);

--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: addresses addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: audit_logs audit_logs_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id);

--
-- Name: cart_items cart_items_cart_id_carts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_carts_id_fk FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;

--
-- Name: cart_items cart_items_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_shop_product_id_shop_products_id_fk FOREIGN KEY (shop_product_id) REFERENCES public.shop_products(id) ON DELETE CASCADE;

--
-- Name: carts carts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: delivery_earnings_config delivery_earnings_config_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_earnings_config
    ADD CONSTRAINT delivery_earnings_config_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: delivery_orders delivery_orders_delivery_partner_id_delivery_partners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_delivery_partner_id_delivery_partners_id_fk FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id) ON DELETE RESTRICT;

--
-- Name: delivery_orders delivery_orders_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_orders
    ADD CONSTRAINT delivery_orders_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;

--
-- Name: delivery_partner_earnings delivery_partner_earnings_delivery_order_id_delivery_orders_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_partner_earnings
    ADD CONSTRAINT delivery_partner_earnings_delivery_order_id_delivery_orders_id_ FOREIGN KEY (delivery_order_id) REFERENCES public.delivery_orders(id) ON DELETE RESTRICT;

--
-- Name: delivery_partner_earnings delivery_partner_earnings_delivery_partner_id_delivery_partners; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_partner_earnings
    ADD CONSTRAINT delivery_partner_earnings_delivery_partner_id_delivery_partners FOREIGN KEY (delivery_partner_id) REFERENCES public.delivery_partners(id) ON DELETE RESTRICT;

--
-- Name: delivery_partners delivery_partners_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_partners
    ADD CONSTRAINT delivery_partners_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);

--
-- Name: delivery_partners delivery_partners_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_partners
    ADD CONSTRAINT delivery_partners_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: excel_upload_items excel_upload_items_matched_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_upload_items
    ADD CONSTRAINT excel_upload_items_matched_product_id_products_id_fk FOREIGN KEY (matched_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

--
-- Name: excel_upload_items excel_upload_items_matched_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_upload_items
    ADD CONSTRAINT excel_upload_items_matched_shop_product_id_shop_products_id_fk FOREIGN KEY (matched_shop_product_id) REFERENCES public.shop_products(id) ON DELETE SET NULL;

--
-- Name: excel_upload_items excel_upload_items_possible_duplicate_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_upload_items
    ADD CONSTRAINT excel_upload_items_possible_duplicate_product_id_products_id_fk FOREIGN KEY (possible_duplicate_product_id) REFERENCES public.products(id) ON DELETE SET NULL;

--
-- Name: excel_upload_items excel_upload_items_upload_id_excel_uploads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_upload_items
    ADD CONSTRAINT excel_upload_items_upload_id_excel_uploads_id_fk FOREIGN KEY (upload_id) REFERENCES public.excel_uploads(id) ON DELETE CASCADE;

--
-- Name: excel_uploads excel_uploads_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_uploads
    ADD CONSTRAINT excel_uploads_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

--
-- Name: excel_uploads excel_uploads_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.excel_uploads
    ADD CONSTRAINT excel_uploads_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);

--
-- Name: grievances grievances_assigned_to_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_assigned_to_user_id_users_id_fk FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: grievances grievances_submitted_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grievances
    ADD CONSTRAINT grievances_submitted_by_user_id_users_id_fk FOREIGN KEY (submitted_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: inventory_movements inventory_movements_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: inventory_movements inventory_movements_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_shop_product_id_shop_products_id_fk FOREIGN KEY (shop_product_id) REFERENCES public.shop_products(id) ON DELETE CASCADE;

--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

--
-- Name: order_items order_items_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_shop_product_id_shop_products_id_fk FOREIGN KEY (shop_product_id) REFERENCES public.shop_products(id) ON DELETE RESTRICT;

--
-- Name: order_status_history order_status_history_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);

--
-- Name: order_status_history order_status_history_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

--
-- Name: orders orders_address_id_addresses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_addresses_id_fk FOREIGN KEY (address_id) REFERENCES public.addresses(id);

--
-- Name: orders orders_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT;

--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: payments payments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: price_update_batches price_update_batches_decided_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_batches
    ADD CONSTRAINT price_update_batches_decided_by_users_id_fk FOREIGN KEY (decided_by) REFERENCES public.users(id);

--
-- Name: price_update_batches price_update_batches_excel_upload_id_excel_uploads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_batches
    ADD CONSTRAINT price_update_batches_excel_upload_id_excel_uploads_id_fk FOREIGN KEY (excel_upload_id) REFERENCES public.excel_uploads(id) ON DELETE SET NULL;

--
-- Name: price_update_batches price_update_batches_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_batches
    ADD CONSTRAINT price_update_batches_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

--
-- Name: price_update_batches price_update_batches_submitted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_batches
    ADD CONSTRAINT price_update_batches_submitted_by_users_id_fk FOREIGN KEY (submitted_by) REFERENCES public.users(id);

--
-- Name: price_update_requests price_update_requests_batch_id_price_update_batches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_requests
    ADD CONSTRAINT price_update_requests_batch_id_price_update_batches_id_fk FOREIGN KEY (batch_id) REFERENCES public.price_update_batches(id) ON DELETE CASCADE;

--
-- Name: price_update_requests price_update_requests_decided_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_requests
    ADD CONSTRAINT price_update_requests_decided_by_users_id_fk FOREIGN KEY (decided_by) REFERENCES public.users(id);

--
-- Name: price_update_requests price_update_requests_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_requests
    ADD CONSTRAINT price_update_requests_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

--
-- Name: price_update_requests price_update_requests_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_requests
    ADD CONSTRAINT price_update_requests_shop_product_id_shop_products_id_fk FOREIGN KEY (shop_product_id) REFERENCES public.shop_products(id) ON DELETE CASCADE;

--
-- Name: price_update_requests price_update_requests_submitted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_update_requests
    ADD CONSTRAINT price_update_requests_submitted_by_users_id_fk FOREIGN KEY (submitted_by) REFERENCES public.users(id);

--
-- Name: product_price_history product_price_history_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);

--
-- Name: product_price_history product_price_history_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_shop_product_id_shop_products_id_fk FOREIGN KEY (shop_product_id) REFERENCES public.shop_products(id) ON DELETE CASCADE;

--
-- Name: products products_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);

--
-- Name: products products_category_id_product_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_product_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.product_categories(id) ON DELETE RESTRICT;

--
-- Name: products products_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: referral_codes referral_codes_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: referral_codes referral_codes_referrer_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_referrer_user_id_users_id_fk FOREIGN KEY (referrer_user_id) REFERENCES public.users(id);

--
-- Name: referral_redemptions referral_redemptions_redeemed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_redemptions
    ADD CONSTRAINT referral_redemptions_redeemed_by_users_id_fk FOREIGN KEY (redeemed_by) REFERENCES public.users(id);

--
-- Name: referral_redemptions referral_redemptions_referral_code_id_referral_codes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_redemptions
    ADD CONSTRAINT referral_redemptions_referral_code_id_referral_codes_id_fk FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE RESTRICT;

--
-- Name: referral_redemptions referral_redemptions_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_redemptions
    ADD CONSTRAINT referral_redemptions_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

--
-- Name: registration_fee_history registration_fee_history_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_fee_history
    ADD CONSTRAINT registration_fee_history_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);

--
-- Name: registration_fee_history registration_fee_history_registration_fee_id_registration_fees_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_fee_history
    ADD CONSTRAINT registration_fee_history_registration_fee_id_registration_fees_ FOREIGN KEY (registration_fee_id) REFERENCES public.registration_fees(id) ON DELETE RESTRICT;

--
-- Name: registration_fees registration_fees_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registration_fees
    ADD CONSTRAINT registration_fees_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: role_permissions role_permissions_permission_key_permissions_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_key_permissions_key_fk FOREIGN KEY (permission_key) REFERENCES public.permissions(key) ON DELETE CASCADE;

--
-- Name: role_permissions role_permissions_role_key_roles_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_key_roles_key_fk FOREIGN KEY (role_key) REFERENCES public.roles(key) ON DELETE CASCADE;

--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: shop_classification_history shop_classification_history_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_classification_history
    ADD CONSTRAINT shop_classification_history_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id);

--
-- Name: shop_classification_history shop_classification_history_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_classification_history
    ADD CONSTRAINT shop_classification_history_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

--
-- Name: shop_payments shop_payments_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_payments
    ADD CONSTRAINT shop_payments_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: shop_payments shop_payments_recorded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_payments
    ADD CONSTRAINT shop_payments_recorded_by_users_id_fk FOREIGN KEY (recorded_by) REFERENCES public.users(id);

--
-- Name: shop_payments shop_payments_reversal_of_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_payments
    ADD CONSTRAINT shop_payments_reversal_of_id_fk FOREIGN KEY (reversal_of_id) REFERENCES public.shop_payments(id) ON DELETE RESTRICT;

--
-- Name: shop_payments shop_payments_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_payments
    ADD CONSTRAINT shop_payments_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT;

--
-- Name: shop_products shop_products_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

--
-- Name: shop_products shop_products_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_products
    ADD CONSTRAINT shop_products_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

--
-- Name: shops shops_approved_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_approved_by_users_id_fk FOREIGN KEY (approved_by) REFERENCES public.users(id);

--
-- Name: shops shops_gst_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_gst_verified_by_users_id_fk FOREIGN KEY (gst_verified_by) REFERENCES public.users(id);

--
-- Name: shops shops_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: shops shops_pan_verified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pan_verified_by_users_id_fk FOREIGN KEY (pan_verified_by) REFERENCES public.users(id);

--
-- Name: shops shops_referral_code_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_referral_code_id_fk FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE RESTRICT;

--
-- Name: shops shops_registration_fee_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_registration_fee_id_fk FOREIGN KEY (registration_fee_id) REFERENCES public.registration_fees(id) ON DELETE RESTRICT;

--
-- Name: subscription_daily_overrides subscription_daily_overrides_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_daily_overrides
    ADD CONSTRAINT subscription_daily_overrides_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: subscription_daily_overrides subscription_daily_overrides_subscription_id_subscriptions_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_daily_overrides
    ADD CONSTRAINT subscription_daily_overrides_subscription_id_subscriptions_id_f FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;

--
-- Name: subscription_orders subscription_orders_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_orders
    ADD CONSTRAINT subscription_orders_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);

--
-- Name: subscription_orders subscription_orders_subscription_id_subscriptions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_orders
    ADD CONSTRAINT subscription_orders_subscription_id_subscriptions_id_fk FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;

--
-- Name: subscriptions subscriptions_address_id_addresses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_address_id_addresses_id_fk FOREIGN KEY (address_id) REFERENCES public.addresses(id);

--
-- Name: subscriptions subscriptions_shop_id_shops_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_shop_id_shops_id_fk FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT;

--
-- Name: subscriptions subscriptions_shop_product_id_shop_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_shop_product_id_shop_products_id_fk FOREIGN KEY (shop_product_id) REFERENCES public.shop_products(id) ON DELETE RESTRICT;

--
-- Name: subscriptions subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_consents user_consents_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_consents
    ADD CONSTRAINT user_consents_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: voucher_redemptions voucher_redemptions_payment_id_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_payment_id_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id);

--
-- Name: voucher_redemptions voucher_redemptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: voucher_redemptions voucher_redemptions_voucher_id_vouchers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_voucher_id_vouchers_id_fk FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE RESTRICT;

--
-- Name: voucher_redemptions voucher_redemptions_wallet_id_wallets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_redemptions
    ADD CONSTRAINT voucher_redemptions_wallet_id_wallets_id_fk FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

--
-- Name: voucher_upload_items voucher_upload_items_created_voucher_id_vouchers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_upload_items
    ADD CONSTRAINT voucher_upload_items_created_voucher_id_vouchers_id_fk FOREIGN KEY (created_voucher_id) REFERENCES public.vouchers(id) ON DELETE SET NULL;

--
-- Name: voucher_upload_items voucher_upload_items_upload_id_voucher_uploads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_upload_items
    ADD CONSTRAINT voucher_upload_items_upload_id_voucher_uploads_id_fk FOREIGN KEY (upload_id) REFERENCES public.voucher_uploads(id) ON DELETE CASCADE;

--
-- Name: voucher_uploads voucher_uploads_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_uploads
    ADD CONSTRAINT voucher_uploads_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);

--
-- Name: vouchers vouchers_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: wallet_transactions wallet_transactions_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);

--
-- Name: wallet_transactions wallet_transactions_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);

--
-- Name: wallet_transactions wallet_transactions_payment_id_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_payment_id_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.payments(id);

--
-- Name: wallet_transactions wallet_transactions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

--
-- Name: wallet_transactions wallet_transactions_voucher_redemption_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_voucher_redemption_id_fk FOREIGN KEY (voucher_redemption_id) REFERENCES public.voucher_redemptions(id) ON DELETE SET NULL;

--
-- Name: wallet_transactions wallet_transactions_wallet_id_wallets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_wallets_id_fk FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE RESTRICT;

--
-- Name: wallets wallets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

