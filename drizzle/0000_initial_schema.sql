CREATE TABLE `category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	`cutoff_f` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE TABLE `item_tag` (
	`item_id` integer NOT NULL,
	`tag_slug` text NOT NULL,
	PRIMARY KEY(`item_id`, `tag_slug`),
	FOREIGN KEY (`item_id`) REFERENCES `tier_list_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_slug`) REFERENCES `tag`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`slug` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tier_list_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`score` integer NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_category_slug` ON `tier_list_item` (`category_id`,`slug`);