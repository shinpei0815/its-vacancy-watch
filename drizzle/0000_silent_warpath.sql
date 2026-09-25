CREATE TABLE `watches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`facility` text NOT NULL,
	`check_in` text NOT NULL,
	`nights` integer DEFAULT 1 NOT NULL,
	`guests` integer DEFAULT 2 NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_checked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
