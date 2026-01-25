# ZeroGlosa - Lista de Funcionalidades

## Infraestrutura e Configuração
- [x] Definir identidade visual e paleta de cores
- [x] Configurar tema global no index.css
- [x] Criar schema do banco de dados
- [x] Configurar rotas tRPC

## Dashboard Executivo
- [x] KPI: Redução de Glosas
- [x] KPI: Valor Recuperado
- [x] KPI: Dias para Recebimento
- [x] KPI: Horas Poupadas
- [x] Gráfico de glosas por operadora
- [x] Gráfico de glosas por motivo
- [x] Alertas de lotes críticos
- [ ] Recomendações da IA
- [x] Ações rápidas (Novo Lote, Converter Fatura, Pré-Envio)

## Módulo de Lotes & Glosas
- [x] Upload de arquivos XML TISS (drag & drop)
- [x] Validação automática de XML
- [x] Score de risco por lote (0-100%)
- [x] Status visual (Pronto, Revisar, Crítico, Enviado, Aprovado, Glosa)
- [x] Filtros por operadora
- [x] Filtros por status
- [x] Filtros por período
- [ ] Checklist de pré-envio
- [x] Listagem de lotes com detalhes
- [ ] Visualização detalhada de lote individual

## Conversor de Faturas (OCR)
- [x] Upload de foto/PDF de fatura manual
- [x] Processamento OCR para extração de texto
- [x] Extração de campos: nome do paciente
- [x] Extração de campos: CPF do paciente
- [x] Extração de campos: número da carteirinha
- [x] Extração de campos: data do procedimento
- [x] Extração de campos: código TUSS
- [x] Extração de campos: CID
- [x] Extração de campos: valor do procedimento
- [x] Extração de campos: nome do médico e CRM
- [x] Extração de campos: operadora de saúde
- [x] Extração de campos: número de autorização
- [x] Formulário editável para correção manual
- [x] Conversão para XML TISS padrão ANS
- [x] Integração com módulo de Lotes & Glosas

## Sistema de Regras & Contratos
- [x] Cadastro de operadoras de saúde
- [x] Cadastro de regras por operadora
- [x] Tipo de regra: Autorização Prévia
- [x] Tipo de regra: Documentos Obrigatórios
- [x] Tipo de regra: Limites de Valor
- [x] Tipo de regra: CID Compatível
- [x] Associação de códigos TUSS a regras
- [x] Configuração de prazos de autorização
- [x] Configuração de prazos de envio
- [ ] Histórico de alterações de regras

## IA Copiloto
- [x] Chat contextual com linguagem natural
- [x] Botão 'Explicar Risco' com análise detalhada
- [x] Botão 'Gerar Recurso' para texto de contestação
- [x] Sugestões proativas de correção
- [x] Integração com contexto do lote/fatura
- [x] Respostas baseadas em regras das operadoras

## Central de Ajuda
- [x] Manual de treinamento integrado
- [x] Painel lateral acessível de qualquer tela
- [x] Busca por tópicos
- [x] Tutoriais passo a passo
- [x] FAQs

## Módulo de Relatórios
- [ ] Relatórios de glosas por período
- [ ] Relatórios de performance por operadora
- [ ] Relatórios de ROI
- [ ] Gráficos customizáveis (implementados no Dashboard)
- [ ] Exportação em PDF
- [ ] Exportação em Excel
- [ ] Filtros avançados de data

## Autenticação e Usuários
- [x] Sistema de login integrado
- [x] Perfis de usuário (Admin, Faturista, Gestor)
- [x] Controle de acesso por role

## Testes
- [x] Testes unitários para rotas tRPC
- [x] Testes de integração OCR
- [ ] Testes de validação XML TISS
- [ ] Testes de geração de relatórios


## Correções Conceituais - Foco em Prevenção
- [x] Alterar KPI "Valor Recuperado" para "Valor Protegido" (valor que seria glosado mas foi corrigido antes do envio)
- [x] Ajustar descrição dos KPIs para refletir prevenção, não recuperação
- [x] Corrigir fluxo do OCR para enfatizar validação pré-envio
- [x] Atualizar mensagens da IA Copiloto para focar em correção preventiva
- [x] Revisar textos da Central de Ajuda para destacar prevenção
- [x] Ajustar landing page para comunicar corretamente o valor da plataforma

## Correções da IA Copiloto - Análise Contextual
- [x] Modificar rota tRPC ia.chat para receber dados completos do lote selecionado
- [x] Modificar rota tRPC ia.explicarRisco para usar dados reais do lote
- [x] Modificar rota tRPC ia.gerarRecurso para usar contexto real da glosa
- [x] Atualizar frontend para enviar operadora, valor, score, status e regras do lote
- [x] Melhorar prompts da IA para análise preventiva baseada em dados reais
- [x] Incluir problemas de validação identificados no contexto da IA
- [x] Testar IA com lotes reais para validar análise contextual

## Correções e Funcionalidades Faltantes - Módulo Lotes
- [x] Corrigir preview da imagem no OCR (imagem não aparece)
- [x] Implementar página de visualização detalhada de lote individual
- [x] Criar checklist de pré-envio interativo com validações
- [x] Adicionar rota para detalhes do lote no App.tsx
- [x] Testar upload de imagem e preview no OCR

## Parser de XML TISS e Validação Automática
- [x] Criar tabela de validações no banco de dados
- [x] Implementar parser de XML TISS no backend
- [x] Validar estrutura básica do XML (tags obrigatórias)
- [x] Validar campos obrigatórios: CPF, nome paciente, carteirinha
- [x] Validar código TUSS (formato e existência)
- [x] Validar CID (formato e compatibilidade)
- [x] Validar valores e limites
- [x] Validar datas (formato e validade)
- [x] Validar CRM do médico
- [x] Criar rota tRPC para executar validação
- [x] Salvar resultados de validação no banco
- [x] Integrar validação automática na página de detalhes do lote
- [x] Atualizar checklist automaticamente com resultados
- [x] Testar parser com XML TISS de exemplo

## Responsividade Mobile
- [x] Corrigir navegação para mobile (menu hamburguer)
- [x] Ajustar landing page (Home) para telas pequenas
- [x] Corrigir grid de KPIs no Dashboard para empilhar em mobile
- [x] Ajustar gráficos do Dashboard para mobile
- [x] Corrigir tabela de lotes para scroll horizontal em mobile
- [x] Ajustar formulário de upload de XML para mobile
- [x] Corrigir página de OCR para mobile (preview e formulário)
- [x] Ajustar página de Regras para mobile (tabela e formulário)
- [x] Corrigir página de Detalhes do Lote para mobile (tabs e checklist)
- [x] Ajustar IA Copiloto para mobile (chat e seletor de lote)
- [x] Corrigir página de Ajuda para mobile
- [x] Testar em diferentes breakpoints (320px, 375px, 768px, 1024px)

## Correção de Navegação
- [x] Alterar rota inicial "/" para apontar para Dashboard
- [x] Mover landing page para rota "/home" ou "/sobre"
- [x] Adicionar header de navegação em NovoLote.tsx
- [x] Verificar navegação em todas as páginas
- [x] Testar fluxo completo de navegação

## Menu Lateral Persistente (Sidebar)
- [x] Criar componente Sidebar.tsx com navegação completa
- [x] Adicionar ícones e labels para cada item do menu
- [x] Criar layout wrapper (AppLayout.tsx) com sidebar
- [x] Integrar AppLayout em todas as páginas principais
- [x] Implementar toggle para colapsar/expandir sidebar
- [x] Adicionar responsividade mobile (drawer/overlay)
- [x] Destacar item ativo no menu
- [x] Testar navegação com sidebar

## Correção do Botão Menu Mobile
- [x] Ajustar z-index do botão do menu para ficar acima dos headers
- [x] Testar visibilidade em todas as páginas mobile

## Reposicionamento do Botão Menu Mobile
- [x] Mover botão do menu de left-4 para right-4 (lado direito)

## Melhorias UX Sidebar Mobile
- [x] Adicionar animação de slide-in/out na sidebar
- [x] Implementar fechamento automático ao clicar em item de navegação

## Botão de Retorno na Landing Page
- [x] Adicionar link "Voltar" ou "Explorar sem Login" na landing page
