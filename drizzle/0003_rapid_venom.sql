CREATE INDEX `idx_watches_owner_id` ON `watches` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_watches_active` ON `watches` (`active`);--> statement-breakpoint
PRAGMA optimize;
