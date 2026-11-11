-- Групповое меню — «Трапезы групп» (ответы заказчицы 12.11.2026): готовые обеды
-- с ценой с человека вместо каталога блюд и калькулятора. Каталог группы удаляем —
-- поступившие заявки не меняются: в них расчёт снимком.
CREATE TABLE "group_menu_translations" (
	"menu_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"items" text,
	CONSTRAINT "group_menu_translations_menu_id_locale_pk" PRIMARY KEY("menu_id","locale"),
	CONSTRAINT "group_menu_translations_locale" CHECK ("group_menu_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "group_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_menus_price_positive" CHECK ("group_menus"."price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "catalog_categories" DROP CONSTRAINT "catalog_categories_kind";--> statement-breakpoint
ALTER TABLE "group_menu_translations" ADD CONSTRAINT "group_menu_translations_menu_id_group_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."group_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_menus" ADD CONSTRAINT "group_menus_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_menus_number" ON "group_menus" USING btree ("number");--> statement-breakpoint
-- Блюда и категории группового каталога (на банкетные сеты не ссылаются: сеты — только из банкетного)
DELETE FROM "catalog_dishes" WHERE "category_id" IN (SELECT "id" FROM "catalog_categories" WHERE "kind" = 'group');--> statement-breakpoint
DELETE FROM "catalog_categories" WHERE "kind" = 'group';--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_kind" CHECK ("catalog_categories"."kind" in ('banquet'));;--> statement-breakpoint
-- Шесть обедов из документа заказчицы (как в прототипе group.html), пока только по-русски
INSERT INTO "group_menus" ("number", "price_cents") VALUES (1, 1600), (2, 1750), (3, 1000), (4, 1050), (5, 2150), (6, 1000);--> statement-breakpoint
INSERT INTO "group_menu_translations" ("menu_id", "locale", "name", "items")
SELECT m.id, 'ru', t.name, t.items FROM "group_menus" m JOIN (VALUES
  (1, 'Таможенное', 'Буженина: свинина, фаршированная чесноком, запечённый картофель, салат, соус
Чизкейк с соусом из свежей клубники
Вода с лимоном, чай или кофе'),
  (2, 'Купеческое', 'Котлета по-киевски: рулет из куриного филе с укропом, запечённый картофель, салат, соус
Брауни со взбитыми сливками
Вода с лимоном, чай или кофе'),
  (3, 'Путевое', 'Солянка
Пирожок с капустой
Вода с лимоном, чай или кофе'),
  (4, 'Ямское', 'Борщ
Блины с карамельным соусом
Вода с лимоном, чай или кофе'),
  (5, 'Шкиперское', 'Морской окунь на овощной подушке под сыром, картофельное пюре, салат
Фисташковый торт
Вода с лимоном, чай или кофе'),
  (6, 'Гимназическое', 'Макароны по-флотски
Творожный десерт с вареньем
Морс')
) AS t(number, name, items) ON t.number = m.number;