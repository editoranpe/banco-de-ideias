CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_name` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`answers` text DEFAULT '{}' NOT NULL,
	`scores` text DEFAULT '{}' NOT NULL,
	`sources` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`prd` text DEFAULT '' NOT NULL,
	`versions` text DEFAULT '[]' NOT NULL,
	`approved_revision` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
