ALTER TABLE `order_items` ADD `unit_cost_cents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` MODIFY `unit_cost_cents` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `buy_price_cents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` MODIFY `buy_price_cents` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `video_url` varchar(500);