CREATE TABLE "order_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" text NOT NULL,
	"note" text,
	"user_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_history_kind" CHECK ("order_history"."kind" in ('created', 'status', 'notified'))
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"variant_id" integer,
	"name" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"pickup_only" boolean DEFAULT false NOT NULL,
	"price_cents" integer NOT NULL,
	"qty" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_items_qty" CHECK ("order_items"."qty" > 0),
	CONSTRAINT "order_items_kind" CHECK ("order_items"."kind" in ('physical', 'digital'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"comment" text,
	"staff_note" text,
	"delivery" text NOT NULL,
	"ship_to" jsonb,
	"tracking_no" text,
	"goods_cents" integer NOT NULL,
	"delivery_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"consent_at" timestamp with time zone NOT NULL,
	"policy_version" text NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"lead_id" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "orders_locale" CHECK ("orders"."locale" in ('et', 'en', 'ru')),
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('awaiting_payment', 'paid', 'packing', 'ready', 'shipped', 'done', 'cancelled')),
	CONSTRAINT "orders_delivery" CHECK ("orders"."delivery" in ('pickup', 'parcel', 'eu', 'none'))
);
--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_history_order_at" ON "order_history" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
-- Номера заказов начинаются с 2001: не путаются с заявками (с 1001)
ALTER SEQUENCE "orders_id_seq" RESTART WITH 2001;
