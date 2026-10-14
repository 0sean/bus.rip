CREATE TABLE `NocLine` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lineNo` integer NOT NULL,
	`nocCode` text NOT NULL,
	`publicName` text NOT NULL,
	`referenceName` text NOT NULL,
	`hasMissingLocationData` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `NocLine_lineNo_key` ON `NocLine` (`lineNo`);