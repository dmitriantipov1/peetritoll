ALTER TABLE "orders" ADD COLUMN "sumup_checkout_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "transaction_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_started_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "orders_sumup_checkout" ON "orders" USING btree ("sumup_checkout_id");