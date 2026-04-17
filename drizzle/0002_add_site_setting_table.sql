CREATE TABLE `site_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER site_setting_updated_at
  AFTER UPDATE ON site_setting
  FOR EACH ROW
  WHEN OLD.updated_at = NEW.updated_at
    AND NOT EXISTS (SELECT 1 FROM _suppress_updated_at)
BEGIN
  UPDATE site_setting SET updated_at = datetime('now') WHERE key = NEW.key;
END;
