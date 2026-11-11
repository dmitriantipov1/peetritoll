-- Ответы заказчицы по меню (12.11.2026): у меню дня нет «обеда целиком»; категория меню
-- может быть на отдельной странице (алкогольные напитки); кнопки отметок в фильтре меню.
ALTER TABLE "lunch_days" DROP CONSTRAINT "lunch_days_prices_positive";--> statement-breakpoint
ALTER TABLE "diet_tags" ADD COLUMN "filter_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dish_labels" ADD COLUMN "in_filter" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dish_labels" ADD COLUMN "filter_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD COLUMN "own_page" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lunch_days" DROP COLUMN "full_cents";--> statement-breakpoint
ALTER TABLE "lunch_days" ADD CONSTRAINT "lunch_days_prices_positive" CHECK (coalesce("lunch_days"."soup_cents", 0) >= 0 and coalesce("lunch_days"."main_cents", 0) >= 0);--> statement-breakpoint
-- «Острое» из фильтра убрано (11.11.2026) — значок на блюде остаётся
UPDATE "diet_tags" SET "filter_hidden" = true WHERE "key" = 'spicy';--> statement-breakpoint
-- «Новинки» — подборка в фильтре
UPDATE "dish_labels" SET "in_filter" = true WHERE "key" = 'new';
