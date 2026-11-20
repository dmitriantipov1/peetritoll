CREATE TABLE "tour_translations" (
	"tour_id" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"text" text,
	"duration" text,
	"terms" text,
	CONSTRAINT "tour_translations_tour_id_locale_pk" PRIMARY KEY("tour_id","locale"),
	CONSTRAINT "tour_translations_locale" CHECK ("tour_translations"."locale" in ('et', 'en', 'ru'))
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" serial PRIMARY KEY NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"price_cents" integer NOT NULL,
	"price_unit" text DEFAULT 'group' NOT NULL,
	"min_people" integer,
	"guide" text DEFAULT '' NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"photo_id" uuid,
	"legacy_photo" text,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tours_price_positive" CHECK ("tours"."price_cents" >= 0),
	CONSTRAINT "tours_price_unit" CHECK ("tours"."price_unit" in ('group', 'person')),
	CONSTRAINT "tours_min_people" CHECK ("tours"."min_people" is null or "tours"."min_people" >= 1)
);
--> statement-breakpoint
ALTER TABLE "tour_translations" ADD CONSTRAINT "tour_translations_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tours" ADD CONSTRAINT "tours_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tours_sort" ON "tours" USING btree ("sort");
-- Программы заказчицы (20.11.2026) — тексты пока русские; фото — картинки из public/images, к картам и обзорному туру — заглушки
--> statement-breakpoint
WITH t AS (
  INSERT INTO "tours" ("sort", "price_cents", "price_unit", "min_people", "guide", "languages", "legacy_photo")
  VALUES (0, 3000, 'group', NULL, 'Елена Малютина', ARRAY['et','ru','en'], '/images/weapons-2.jpg') RETURNING "id"
)
INSERT INTO "tour_translations" ("tour_id", "locale", "title", "text", "duration", "terms")
SELECT "id", 'ru', 'Экспресс-экскурсия по выставке', 'Гид покажет саблю великана, дамские стилеты, нож с открывалкой для бутылок, а также кинжал бронзового века — короткий и насыщенный обзор коллекции. Идеальное дополнение к обеду или групповой поездке.', '20 минут', 'по предварительному заказу' FROM t;
--> statement-breakpoint
WITH t AS (
  INSERT INTO "tours" ("sort", "price_cents", "price_unit", "min_people", "guide", "languages", "legacy_photo")
  VALUES (1, 5000, 'group', NULL, 'Андрей Кириллов', ARRAY['ru'], '/images/restaurant-house.jpg') RETURNING "id"
)
INSERT INTO "tour_translations" ("tour_id", "locale", "title", "text", "duration", "terms")
SELECT "id", 'ru', '«Тайны старой таможни»', 'Вы узнаете об истории дома, курьёзах таможенной службы, увидите редкие исторические документы семьи Пауля Лаана, а также секреты бережной реставрации.', '60 минут', 'по предварительному заказу' FROM t;
--> statement-breakpoint
WITH t AS (
  INSERT INTO "tours" ("sort", "price_cents", "price_unit", "min_people", "guide", "languages", "legacy_photo")
  VALUES (2, 4000, 'group', NULL, 'Елена Малютина', ARRAY['ru','en'], '/images/paldiski-history.jpg') RETURNING "id"
)
INSERT INTO "tour_translations" ("tour_id", "locale", "title", "text", "duration", "terms")
SELECT "id", 'ru', 'История Палдиски: экспресс-обзор', 'Идеальное дополнение к обеду или визиту группы с плотным графиком: за полчаса в уютных стенах старинной таможни гид проведёт вас через главные вехи истории Палдиски, иллюстрируя рассказ редкими архивными снимками, картами и другими изображениями на большом экране — без выезда на полуостров.', '30 минут', 'по предварительному заказу' FROM t;
--> statement-breakpoint
WITH t AS (
  INSERT INTO "tours" ("sort", "price_cents", "price_unit", "min_people", "guide", "languages", "legacy_photo")
  VALUES (3, 500, 'person', 12, 'Елена Малютина', ARRAY['et','ru'], '/images/tour-old-maps.jpg') RETURNING "id"
)
INSERT INTO "tour_translations" ("tour_id", "locale", "title", "text", "duration", "terms")
SELECT "id", 'ru', 'Тайны старых карт', 'Познавательная программа для школьников, объединяющая увлекательный рассказ об истории Палдиски с практическим исследованием старинных карт.', '60 минут', 'по предварительному заказу' FROM t;
--> statement-breakpoint
WITH t AS (
  INSERT INTO "tours" ("sort", "price_cents", "price_unit", "min_people", "guide", "languages", "legacy_photo")
  VALUES (4, 9000, 'group', NULL, 'Андрей Кириллов', ARRAY['ru'], '/images/tour-paldiski-pakri.jpg') RETURNING "id"
)
INSERT INTO "tour_translations" ("tour_id", "locale", "title", "text", "duration", "terms")
SELECT "id", 'ru', 'Экскурсия по Палдиски и полуострову Пакри', 'Обзорный маршрут по знаковым местам города и побережья: от петровской крепости и старинных церквей до живописных обрывов и маяка Пакри.', '1,5–2 часа', 'по предварительному заказу · для групп и индивидуальных гостей' FROM t;
