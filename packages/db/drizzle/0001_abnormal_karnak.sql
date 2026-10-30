CREATE TABLE `age_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`start_age` int NOT NULL,
	`end_age` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `age_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `age_groups_name_unique` UNIQUE(`name`),
	CONSTRAINT `age_groups_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`description` text,
	`image_url` varchar(500),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`),
	CONSTRAINT `characters_name_unique` UNIQUE(`name`),
	CONSTRAINT `characters_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_age_groups` (
	`product_id` int NOT NULL,
	`age_group_id` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `product_age_groups_unique` UNIQUE(`product_id`,`age_group_id`)
);
--> statement-breakpoint
CREATE TABLE `product_characters` (
	`product_id` int NOT NULL,
	`character_id` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `product_characters_unique` UNIQUE(`product_id`,`character_id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `is_new` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `is_best_seller` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `age_min`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `age_max`;--> statement-breakpoint
ALTER TABLE `product_age_groups` ADD CONSTRAINT `product_age_groups_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_age_groups` ADD CONSTRAINT `product_age_groups_age_group_id_age_groups_id_fk` FOREIGN KEY (`age_group_id`) REFERENCES `age_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_characters` ADD CONSTRAINT `product_characters_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_characters` ADD CONSTRAINT `product_characters_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_age_groups_age_group_idx` ON `product_age_groups` (`age_group_id`);--> statement-breakpoint
CREATE INDEX `product_characters_character_idx` ON `product_characters` (`character_id`);