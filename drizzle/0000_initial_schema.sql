CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`prop_keys` text DEFAULT '[]' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`cutoff_s` integer,
	`cutoff_a` integer,
	`cutoff_b` integer,
	`cutoff_c` integer,
	`cutoff_d` integer,
	`cutoff_e` integer,
	`cutoff_f` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `page` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `site_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `_suppress_updated_at` (
	`flag` integer
);
--> statement-breakpoint
CREATE TABLE `tier_list_item` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`score` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`image_hash` text,
	`placeholder` text,
	`props` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	`deleted_with_cascade` integer,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`totp_secret` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_active_slug` ON `category` (`slug`) WHERE `deleted_at` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `item_active_category_slug` ON `tier_list_item` (`category_id`, `slug`) WHERE `deleted_at` IS NULL;--> statement-breakpoint
CREATE VIEW `category_active` AS select "id", "slug", "name", "description", "prop_keys", "order", "cutoff_s", "cutoff_a", "cutoff_b", "cutoff_c", "cutoff_d", "cutoff_e", "cutoff_f", "created_at", "updated_at", "deleted_at" from "category" where "category"."deleted_at" is null;--> statement-breakpoint
CREATE VIEW `tier_list_item_active` AS select "id", "category_id", "slug", "name", "description", "score", "order", "image_hash", "placeholder", "props", "created_at", "updated_at", "deleted_at", "deleted_with_cascade" from "tier_list_item" where "tier_list_item"."deleted_at" is null;--> statement-breakpoint

-- updated_at triggers: auto-bump on UPDATE unless _suppress_updated_at has a row
CREATE TRIGGER category_updated_at
  AFTER UPDATE ON category
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
    AND NOT EXISTS (SELECT 1 FROM _suppress_updated_at)
BEGIN
  UPDATE category SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER tier_list_item_updated_at
  AFTER UPDATE ON tier_list_item
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
    AND NOT EXISTS (SELECT 1 FROM _suppress_updated_at)
BEGIN
  UPDATE tier_list_item SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER page_updated_at
  AFTER UPDATE ON page
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
    AND NOT EXISTS (SELECT 1 FROM _suppress_updated_at)
BEGIN
  UPDATE page SET updated_at = datetime('now') WHERE slug = NEW.slug;
END;
--> statement-breakpoint
CREATE TRIGGER user_updated_at
  AFTER UPDATE ON user
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
    AND NOT EXISTS (SELECT 1 FROM _suppress_updated_at)
BEGIN
  UPDATE user SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER site_setting_updated_at
  AFTER UPDATE ON site_setting
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
    AND NOT EXISTS (SELECT 1 FROM _suppress_updated_at)
BEGIN
  UPDATE site_setting SET updated_at = datetime('now') WHERE key = NEW.key;
END;
