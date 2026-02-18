-- Indexes para melhorar performance das queries mais comuns
CREATE INDEX `idx_lotes_userId` ON `lotes` (`userId`);
CREATE INDEX `idx_lotes_operadoraId` ON `lotes` (`operadoraId`);
CREATE INDEX `idx_lotes_status` ON `lotes` (`status`);
CREATE INDEX `idx_guias_loteId` ON `guias` (`loteId`);
CREATE INDEX `idx_regras_operadoraId` ON `regras` (`operadoraId`);
CREATE INDEX `idx_conversoesOCR_userId` ON `conversoesOCR` (`userId`);
CREATE INDEX `idx_interacoesIA_userId` ON `interacoesIA` (`userId`);
CREATE INDEX `idx_interacoesIA_loteId` ON `interacoesIA` (`loteId`);
CREATE INDEX `idx_validacoes_loteId` ON `validacoes` (`loteId`);
--> statement-breakpoint

-- Tabela de histórico/audit log de alterações de regras
CREATE TABLE `regraHistorico` (
  `id` int AUTO_INCREMENT NOT NULL,
  `regraId` int NOT NULL,
  `operadoraId` int NOT NULL,
  `userId` int NOT NULL,
  `acao` enum('criada','atualizada','desativada') NOT NULL,
  `campoAlterado` varchar(100),
  `valorAnterior` text,
  `valorNovo` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `regraHistorico_pk` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_regraHistorico_regraId` ON `regraHistorico` (`regraId`);
--> statement-breakpoint
CREATE INDEX `idx_regraHistorico_operadoraId` ON `regraHistorico` (`operadoraId`);
