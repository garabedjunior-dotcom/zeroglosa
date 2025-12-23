CREATE TABLE `validacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loteId` int NOT NULL,
	`tipoValidacao` varchar(100) NOT NULL,
	`campo` varchar(100),
	`status` enum('aprovado','alerta','erro') NOT NULL,
	`mensagem` text NOT NULL,
	`detalhes` text,
	`critico` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `validacoes_id` PRIMARY KEY(`id`)
);
