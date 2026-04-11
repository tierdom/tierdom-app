CREATE TABLE `category` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `order` integer DEFAULT 0 NOT NULL,
  `cutoff_s` integer,
  `cutoff_a` integer,
  `cutoff_b` integer,
  `cutoff_c` integer,
  `cutoff_d` integer,
  `cutoff_e` integer,
  `cutoff_f` integer,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE TABLE `item_tag` (
  `item_id` text NOT NULL,
  `tag_slug` text NOT NULL,
  PRIMARY KEY(`item_id`, `tag_slug`),
  FOREIGN KEY (`item_id`) REFERENCES `tier_list_item`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`tag_slug`) REFERENCES `tag`(`slug`) ON UPDATE no action ON DELETE cascade
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
CREATE TABLE `tag` (
  `slug` text PRIMARY KEY NOT NULL,
  `label` text NOT NULL,
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL
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
  `created_at` text DEFAULT (datetime('now')) NOT NULL,
  `updated_at` text DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_category_slug` ON `tier_list_item` (`category_id`,`slug`);--> statement-breakpoint
CREATE TABLE `_suppress_updated_at` (`flag` integer);--> statement-breakpoint
CREATE TRIGGER category_updated_at
AFTER UPDATE ON `category`
FOR EACH ROW
WHEN OLD.`updated_at` = NEW.`updated_at`
  AND NOT EXISTS (SELECT 1 FROM `_suppress_updated_at`)
BEGIN
  UPDATE `category` SET `updated_at` = datetime('now') WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER tier_list_item_updated_at
AFTER UPDATE ON `tier_list_item`
FOR EACH ROW
WHEN OLD.`updated_at` = NEW.`updated_at`
  AND NOT EXISTS (SELECT 1 FROM `_suppress_updated_at`)
BEGIN
  UPDATE `tier_list_item` SET `updated_at` = datetime('now') WHERE `id` = NEW.`id`;
END;--> statement-breakpoint
CREATE TRIGGER tag_updated_at
AFTER UPDATE ON `tag`
FOR EACH ROW
WHEN OLD.`updated_at` = NEW.`updated_at`
BEGIN
  UPDATE `tag` SET `updated_at` = datetime('now') WHERE `slug` = NEW.`slug`;
END;--> statement-breakpoint
CREATE TRIGGER page_updated_at
AFTER UPDATE ON `page`
FOR EACH ROW
WHEN OLD.`updated_at` = NEW.`updated_at`
BEGIN
  UPDATE `page` SET `updated_at` = datetime('now') WHERE `slug` = NEW.`slug`;
END;