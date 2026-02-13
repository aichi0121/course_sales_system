CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`teacher` varchar(255),
	`description` text,
	`price` int NOT NULL DEFAULT 0,
	`startDate` date,
	`totalHours` varchar(50),
	`courseStatus` enum('已完結','上線中','未開課') NOT NULL DEFAULT '未開課',
	`platform` varchar(255),
	`category` enum('理財｜投資','商業｜工作學','內容創作｜行銷','自我成長','人際關係','數位工具｜AI','語言｜學習','健康｜身心靈','美妝｜保養','居家生活','法律｜知識') NOT NULL,
	`syllabus` text,
	`originalUrl` text,
	`imageUrl` text,
	`ytLink` text,
	`cloudLink` text,
	`isPublic` boolean NOT NULL DEFAULT true,
	`source` enum('自購','交換') NOT NULL DEFAULT '自購',
	`exchangePartner` varchar(255),
	`costPrice` int,
	`allowExchange` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`lineName` varchar(255),
	`lineId` varchar(255),
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
	`applicantLineName` varchar(255),
	`applicantLineId` varchar(255),
	`wantedCourseId` int NOT NULL,
	`wantedCourseName` varchar(255) NOT NULL,
	`offeredCourseName` varchar(255) NOT NULL,
	`offeredCourseDescription` text,
	`provideMethod` enum('帳號','下載原檔','錄影') NOT NULL,
	`exchangeStatus` enum('待審核','確認交換','待交付','婉拒') NOT NULL DEFAULT '待審核',
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
	`orderStatus` enum('待處理','待確認','已付款','待交付','已完成','已取消') NOT NULL DEFAULT '待處理',
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
CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(255) NOT NULL,
	`settingValue` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `siteSettings_settingKey_unique` UNIQUE(`settingKey`)
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
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
