CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` int NOT NULL DEFAULT 0,
	`link` text,
	`status` enum('completed','ongoing','upcoming') NOT NULL DEFAULT 'completed',
	`scheduledAt` timestamp,
	`isPublic` boolean NOT NULL DEFAULT true,
	`source` enum('self','exchange') NOT NULL DEFAULT 'self',
	`sourceTeacher` varchar(255),
	`allowExchange` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`lineId` varchar(255),
	`phone` varchar(50),
	`email` varchar(320),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exchangeNumber` varchar(50) NOT NULL,
	`applicantName` varchar(255) NOT NULL,
	`applicantLineId` varchar(255),
	`applicantPhone` varchar(50),
	`wantedCourseId` int NOT NULL,
	`wantedCourseName` varchar(255) NOT NULL,
	`offeredCourseName` varchar(255) NOT NULL,
	`offeredCourseDescription` text,
	`provideMethod` enum('account_password','original_file','recording') NOT NULL,
	`courseCredentials` text,
	`exchangeStatus` enum('pending','accepted','rejected','awaiting_course','completed') NOT NULL DEFAULT 'pending',
	`rejectReason` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchanges_id` PRIMARY KEY(`id`),
	CONSTRAINT `exchanges_exchangeNumber_unique` UNIQUE(`exchangeNumber`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`courseId` int NOT NULL,
	`courseName` varchar(255) NOT NULL,
	`price` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`customerId` int NOT NULL,
	`totalAmount` int NOT NULL DEFAULT 0,
	`discountAmount` int NOT NULL DEFAULT 0,
	`finalAmount` int NOT NULL DEFAULT 0,
	`status` enum('pending','awaiting_confirmation','paid','completed','cancelled') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(50),
	`paymentNotifiedAt` timestamp,
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`amount` int NOT NULL,
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
