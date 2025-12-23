CREATE TABLE `conversoesOCR` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loteId` int,
	`imagemUrl` text NOT NULL,
	`textoExtraido` text,
	`camposExtraidos` text,
	`status` enum('processando','concluido','erro') NOT NULL DEFAULT 'processando',
	`mensagemErro` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversoesOCR_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loteId` int NOT NULL,
	`nomePaciente` varchar(255),
	`cpfPaciente` varchar(14),
	`numeroCarteirinha` varchar(50),
	`dataProcedimento` timestamp,
	`codigoTUSS` varchar(20),
	`cid` varchar(10),
	`valorProcedimento` int DEFAULT 0,
	`nomeMedico` varchar(255),
	`crm` varchar(20),
	`numeroAutorizacao` varchar(50),
	`status` enum('pendente','aprovado','glosado') NOT NULL DEFAULT 'pendente',
	`motivoGlosa` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `interacoesIA` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loteId` int,
	`tipoInteracao` enum('chat','explicar_risco','gerar_recurso') NOT NULL,
	`pergunta` text,
	`resposta` text,
	`contexto` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `interacoesIA_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operadoraId` int NOT NULL,
	`numeroLote` varchar(100),
	`status` enum('pronto','revisar','critico','enviado','aprovado','glosa') NOT NULL DEFAULT 'revisar',
	`scoreRisco` int DEFAULT 0,
	`origem` enum('xml','ocr') NOT NULL DEFAULT 'xml',
	`xmlUrl` text,
	`valorTotal` int DEFAULT 0,
	`quantidadeGuias` int DEFAULT 0,
	`dataEnvio` timestamp,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operadoras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operadoras_id` PRIMARY KEY(`id`),
	CONSTRAINT `operadoras_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `regras` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operadoraId` int NOT NULL,
	`tipoRegra` enum('autorizacao_previa','documentos_obrigatorios','limites_valor','cid_compativel') NOT NULL,
	`descricao` text NOT NULL,
	`codigoTUSS` varchar(20),
	`valorMinimo` int,
	`valorMaximo` int,
	`prazoAutorizacao` int,
	`ativa` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regras_id` PRIMARY KEY(`id`)
);
