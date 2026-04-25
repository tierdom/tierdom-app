DROP INDEX `category_slug_unique`;--> statement-breakpoint
ALTER TABLE `category` ADD `deleted_at` text;--> statement-breakpoint
DROP INDEX `item_category_slug`;--> statement-breakpoint
ALTER TABLE `tier_list_item` ADD `deleted_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `category_active_slug` ON `category` (`slug`) WHERE `deleted_at` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `item_active_category_slug` ON `tier_list_item` (`category_id`, `slug`) WHERE `deleted_at` IS NULL;--> statement-breakpoint
CREATE VIEW `category_active` AS select "id", "slug", "name", "description", "prop_keys", "order", "cutoff_s", "cutoff_a", "cutoff_b", "cutoff_c", "cutoff_d", "cutoff_e", "cutoff_f", "created_at", "updated_at", "deleted_at" from "category" where "category"."deleted_at" is null;--> statement-breakpoint
CREATE VIEW `tier_list_item_active` AS select "id", "category_id", "slug", "name", "description", "score", "order", "image_hash", "placeholder", "props", "created_at", "updated_at", "deleted_at" from "tier_list_item" where "tier_list_item"."deleted_at" is null;