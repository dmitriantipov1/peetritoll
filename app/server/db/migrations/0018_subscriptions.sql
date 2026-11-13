-- Подписка на рассылку с сайта (8.2, решение 13.11.2026): double opt-in — подписка
-- включается после перехода по ссылке из письма; до этого — не лид.
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"locale" text NOT NULL,
	"token_hash" text NOT NULL,
	"policy_version" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"lead_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "subscriptions_locale" CHECK ("subscriptions"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscriptions_email" ON "subscriptions" USING btree ("email");