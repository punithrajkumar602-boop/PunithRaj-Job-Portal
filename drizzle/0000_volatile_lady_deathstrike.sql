CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`cover_letter` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_once` ON `applications` (`job_id`,`candidate_id`);--> statement-breakpoint
CREATE INDEX `application_candidate` ON `applications` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`employer_id` text,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`work_mode` text NOT NULL,
	`employment_type` text NOT NULL,
	`salary` text NOT NULL,
	`experience` text NOT NULL,
	`skills` text NOT NULL,
	`description` text NOT NULL,
	`benefits` text NOT NULL,
	`deadline` text,
	`status` text DEFAULT 'open' NOT NULL,
	`source` text DEFAULT 'Talentlane' NOT NULL,
	`source_url` text,
	`source_key` text,
	`posted_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_source_key_unique` ON `jobs` (`source_key`);--> statement-breakpoint
CREATE INDEX `jobs_search` ON `jobs` (`status`,`work_mode`,`employment_type`);--> statement-breakpoint
CREATE INDEX `jobs_employer` ON `jobs` (`employer_id`);--> statement-breakpoint
CREATE INDEX `jobs_date` ON `jobs` (`posted_at`);--> statement-breakpoint
CREATE INDEX `jobs_company` ON `jobs` (`company_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_once` ON `saved_jobs` (`job_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `scrape_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`added` integer NOT NULL,
	`duplicates` integer NOT NULL,
	`errors` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text NOT NULL,
	`company_id` text,
	`skills` text DEFAULT '[]' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`resume_url` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`role`) REFERENCES `roles`(`name`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);