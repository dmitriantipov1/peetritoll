CREATE TABLE "lead_tags" (
	"lead_id" integer NOT NULL,
	"tag" text NOT NULL,
	"auto" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_tags_lead_id_tag_pk" PRIMARY KEY("lead_id","tag")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"phone_key" text,
	"locale" text NOT NULL,
	"marketing" text DEFAULT 'no' NOT NULL,
	"marketing_at" timestamp with time zone,
	"marketing_source" text,
	"last_event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_email_unique" UNIQUE("email"),
	CONSTRAINT "leads_locale" CHECK ("leads"."locale" in ('et', 'en', 'ru')),
	CONSTRAINT "leads_marketing" CHECK ("leads"."marketing" in ('no', 'pending', 'yes')),
	CONSTRAINT "leads_contact" CHECK ("leads"."email" is not null or "leads"."phone_key" is not null)
);
--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "lead_id" integer;--> statement-breakpoint
ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_tags_tag" ON "lead_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "leads_phone_key" ON "leads" USING btree ("phone_key");--> statement-breakpoint
CREATE INDEX "leads_last_event" ON "leads" USING btree ("last_event_at");--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "requests_lead" ON "requests" USING btree ("lead_id");