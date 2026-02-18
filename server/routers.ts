import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { TISSParser } from "./tissParser";
import { checkRateLimit, retryAfterSeconds } from "./_core/rateLimit";

// Limites de upload
const MAX_XML_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Aplica rate limit por userId para endpoints de IA (10 req/min) */
function assertAIRateLimit(userId: number) {
  const key = `ia:${userId}`;
  if (!checkRateLimit(key, { windowMs: 60_000, max: 10 })) {
    const wait = retryAfterSeconds(key);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Muitas requisições à IA. Aguarde ${wait}s antes de tentar novamente.`,
    });
  }
}

/** Verifica se o lote pertence ao usuário autenticado */
async function assertLoteOwnership(loteId: number, userId: number) {
  const lote = await db.getLoteById(loteId);
  if (!lote) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lote não encontrado" });
  }
  if (lote.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este lote" });
  }
  return lote;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  operadoras: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllOperadoras();
    }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        codigo: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createOperadora(input);
      }),
  }),

  lotes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getLotesByUserId(ctx.user.id);
    }),
    listPaginated: protectedProcedure
      .input(z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getLotesByUserIdPaginated(ctx.user.id, input.page, input.limit);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await assertLoteOwnership(input.id, ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        operadoraId: z.number(),
        numeroLote: z.string().optional(),
        origem: z.enum(["xml", "ocr"]),
        xmlUrl: z.string().optional(),
        valorTotal: z.number().optional(),
        quantidadeGuias: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createLote({
          userId: ctx.user.id,
          ...input,
        });
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pronto", "revisar", "critico", "enviado", "aprovado", "glosa"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertLoteOwnership(input.id, ctx.user.id);
        await db.updateLote(input.id, { status: input.status });
        return { success: true };
      }),
    uploadXML: protectedProcedure
      .input(z.object({
        fileName: z.string().max(255),
        fileContent: z.string(),
        operadoraId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const fileBuffer = Buffer.from(input.fileContent, 'base64');

        // Validar tamanho do arquivo (máx. 5 MB)
        if (fileBuffer.byteLength > MAX_XML_SIZE_BYTES) {
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: "Arquivo XML muito grande. Tamanho máximo: 5 MB",
          });
        }

        // Validar que o conteúdo parece um XML (começa com '<')
        const firstChars = fileBuffer.slice(0, 5).toString('utf-8').trimStart();
        if (!firstChars.startsWith('<')) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Arquivo inválido. Apenas arquivos XML são aceitos",
          });
        }

        // Sanitizar nome do arquivo — remove path traversal e caracteres perigosos
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `lotes/${ctx.user.id}/${Date.now()}-${safeName}`;
        const { url } = await storagePut(fileKey, fileBuffer, 'application/xml');

        await db.createLote({
          userId: ctx.user.id,
          operadoraId: input.operadoraId,
          origem: 'xml',
          xmlUrl: url,
          status: 'revisar',
        });

        return { success: true, url };
      }),
  }),

  guias: router({
    listByLote: protectedProcedure
      .input(z.object({ loteId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Garante que o lote pertence ao usuário antes de expor suas guias
        await assertLoteOwnership(input.loteId, ctx.user.id);
        return await db.getGuiasByLoteId(input.loteId);
      }),
    create: protectedProcedure
      .input(z.object({
        loteId: z.number(),
        nomePaciente: z.string().max(255).optional(),
        cpfPaciente: z.string().max(14).optional(),
        numeroCarteirinha: z.string().max(50).optional(),
        dataProcedimento: z.date().optional(),
        codigoTUSS: z.string().max(20).optional(),
        cid: z.string().max(10).optional(),
        valorProcedimento: z.number().int().nonnegative().optional(),
        nomeMedico: z.string().max(255).optional(),
        crm: z.string().max(20).optional(),
        numeroAutorizacao: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertLoteOwnership(input.loteId, ctx.user.id);
        return await db.createGuia(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        nomePaciente: z.string().max(255).optional(),
        cpfPaciente: z.string().max(14).optional(),
        numeroCarteirinha: z.string().max(50).optional(),
        dataProcedimento: z.date().optional(),
        codigoTUSS: z.string().max(20).optional(),
        cid: z.string().max(10).optional(),
        valorProcedimento: z.number().int().nonnegative().optional(),
        nomeMedico: z.string().max(255).optional(),
        crm: z.string().max(20).optional(),
        numeroAutorizacao: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        // Verifica ownership via lote da guia
        const guia = await db.getGuiaById(id);
        if (!guia) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Guia não encontrada" });
        }
        await assertLoteOwnership(guia.loteId, ctx.user.id);
        await db.updateGuia(id, data);

        // Revalidação automática: reexecuta validações de campo para a guia atualizada
        const updatedGuia = { ...guia, ...data };
        const novasValidacoes: Parameters<typeof db.createValidacao>[0][] = [];

        const cpf = updatedGuia.cpfPaciente?.replace(/\D/g, '');
        if (cpf && cpf.length !== 11) {
          novasValidacoes.push({
            loteId: guia.loteId,
            tipoValidacao: 'cpf_formato',
            campo: 'cpfPaciente',
            status: 'erro',
            mensagem: `CPF inválido na guia #${id}`,
            critico: 1,
          });
        }

        const tuss = updatedGuia.codigoTUSS;
        if (tuss && !/^\d{8}$/.test(tuss)) {
          novasValidacoes.push({
            loteId: guia.loteId,
            tipoValidacao: 'tuss_formato',
            campo: 'codigoTUSS',
            status: 'alerta',
            mensagem: `Código TUSS inválido na guia #${id} (deve ter 8 dígitos)`,
            critico: 0,
          });
        }

        const cid = updatedGuia.cid;
        if (cid && !/^[A-Z]\d{2}(\.\d)?$/.test(cid.toUpperCase())) {
          novasValidacoes.push({
            loteId: guia.loteId,
            tipoValidacao: 'cid_formato',
            campo: 'cid',
            status: 'alerta',
            mensagem: `CID inválido na guia #${id} (ex.: M54.5)`,
            critico: 0,
          });
        }

        if (novasValidacoes.length > 0) {
          for (const v of novasValidacoes) {
            await db.createValidacao(v);
          }
        }

        // Recalcular score de risco do lote com base em todas as validações
        const todasValidacoes = await db.getValidacoesByLoteId(guia.loteId);
        const erros = todasValidacoes.filter(v => v.status === 'erro').length;
        const alertas = todasValidacoes.filter(v => v.status === 'alerta').length;
        const errosCriticos = todasValidacoes.filter(v => v.status === 'erro' && v.critico).length;
        const novoScore = Math.min(100, erros * 20 + errosCriticos * 15 + alertas * 8);
        const novoStatus = novoScore > 70 ? 'critico' : novoScore > 40 ? 'revisar' : 'pronto';

        await db.updateLote(guia.loteId, { scoreRisco: novoScore, status: novoStatus });

        return { success: true, novoScore, novoStatus };
      }),
  }),

  regras: router({
    listByOperadora: protectedProcedure
      .input(z.object({ operadoraId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRegrasByOperadoraId(input.operadoraId);
      }),
    create: protectedProcedure
      .input(z.object({
        operadoraId: z.number(),
        tipoRegra: z.enum(["autorizacao_previa", "documentos_obrigatorios", "limites_valor", "cid_compativel"]),
        descricao: z.string().max(1000),
        codigoTUSS: z.string().max(20).optional(),
        valorMinimo: z.number().int().nonnegative().optional(),
        valorMaximo: z.number().int().nonnegative().optional(),
        prazoAutorizacao: z.number().int().nonnegative().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createRegra(input);
        // Buscar o ID da regra recém-criada para registrar no histórico
        const todasRegras = await db.getRegrasByOperadoraId(input.operadoraId);
        const novaRegra = todasRegras[todasRegras.length - 1];
        if (novaRegra) {
          await db.createRegraHistorico({
            regraId: novaRegra.id,
            operadoraId: input.operadoraId,
            userId: ctx.user.id,
            acao: 'criada',
            valorNovo: JSON.stringify(input),
          });
        }
        return true;
      }),
    desativar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const regra = await db.getRegraById(input.id);
        if (!regra) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Regra não encontrada" });
        }
        await db.desativarRegra(input.id);
        await db.createRegraHistorico({
          regraId: input.id,
          operadoraId: regra.operadoraId,
          userId: ctx.user.id,
          acao: 'desativada',
          valorAnterior: JSON.stringify(regra),
        });
        return { success: true };
      }),
    historico: protectedProcedure
      .input(z.object({ operadoraId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRegraHistoricoByOperadora(input.operadoraId);
      }),
  }),

  ocr: router({
    processImage: protectedProcedure
      .input(z.object({
        imageData: z.string(),
        fileName: z.string().max(255),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const imageBuffer = Buffer.from(input.imageData, 'base64');

        // Validar tamanho (máx. 10 MB)
        if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: "Imagem muito grande. Tamanho máximo: 10 MB",
          });
        }

        // Detectar tipo real pelo magic bytes
        const magic = imageBuffer.slice(0, 4);
        let detectedMime = 'application/octet-stream';
        if (magic[0] === 0xFF && magic[1] === 0xD8) detectedMime = 'image/jpeg';
        else if (magic[0] === 0x89 && magic[1] === 0x50) detectedMime = 'image/png';
        else if (magic.toString('ascii', 0, 4) === 'RIFF' || magic.toString('ascii', 0, 4) === 'WEBP') detectedMime = 'image/webp';
        else if (magic[0] === 0x25 && magic[1] === 0x50) detectedMime = 'application/pdf'; // %PDF

        if (!ALLOWED_IMAGE_TYPES.includes(detectedMime)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF",
          });
        }

        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileKey = `ocr/${ctx.user.id}/${Date.now()}-${safeName}`;
        const { url } = await storagePut(fileKey, imageBuffer, detectedMime);

        // Criar registro de conversão OCR (status: processando)
        await db.createConversaoOCR({
          userId: ctx.user.id,
          imagemUrl: url,
          status: 'processando',
        });

        // OCR via LLM Vision — extrai campos de fatura médica da imagem
        assertAIRateLimit(ctx.user.id);

        const dataUrl = `data:${detectedMime};base64,${input.imageData}`;

        const ocrResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Você é um especialista em extração de dados de faturas médicas brasileiras.
Analise a imagem fornecida e extraia TODOS os campos que conseguir identificar.
Retorne APENAS um JSON válido com os campos abaixo (use null para campos não encontrados).
NÃO inclua texto fora do JSON.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: dataUrl, detail: "high" },
                },
                {
                  type: "text",
                  text: `Extraia os dados desta fatura médica e retorne o JSON:
{
  "nomePaciente": "string | null",
  "cpfPaciente": "string (apenas dígitos, ex: 12345678900) | null",
  "numeroCarteirinha": "string | null",
  "dataProcedimento": "string (YYYY-MM-DD) | null",
  "codigoTUSS": "string (8 dígitos) | null",
  "cid": "string (ex: M54.5) | null",
  "valorProcedimento": "number (em centavos, ex: 15000 = R$150,00) | null",
  "nomeMedico": "string | null",
  "crm": "string (ex: 12345-SP) | null",
  "operadora": "string (nome da operadora) | null",
  "numeroAutorizacao": "string | null"
}`,
                },
              ],
            },
          ],
          responseFormat: { type: "json_object" },
        });

        let extractedData: Record<string, unknown> = {};
        try {
          const raw = ocrResponse.choices[0]?.message?.content;
          const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
          extractedData = JSON.parse(text);
        } catch {
          extractedData = {};
        }

        // Normalizar: garantir que campos nulos virem strings vazias no frontend
        const normalize = (v: unknown, fallback = ""): string =>
          v != null && v !== "null" ? String(v) : fallback;

        const normalizedData = {
          nomePaciente: normalize(extractedData.nomePaciente),
          cpfPaciente: normalize(extractedData.cpfPaciente),
          numeroCarteirinha: normalize(extractedData.numeroCarteirinha),
          dataProcedimento: normalize(extractedData.dataProcedimento),
          codigoTUSS: normalize(extractedData.codigoTUSS),
          cid: normalize(extractedData.cid),
          valorProcedimento: typeof extractedData.valorProcedimento === 'number'
            ? extractedData.valorProcedimento
            : 0,
          nomeMedico: normalize(extractedData.nomeMedico),
          crm: normalize(extractedData.crm),
          operadora: normalize(extractedData.operadora),
          numeroAutorizacao: normalize(extractedData.numeroAutorizacao),
        };

        return {
          success: true,
          imageUrl: url,
          extractedData: normalizedData,
        };
      }),
  }),

  ia: router({
    chat: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(4000),
        loteId: z.number().optional(),
        contexto: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        assertAIRateLimit(ctx.user.id);
        let contextoCompleto = "";

        // Se um lote foi selecionado, buscar dados completos para contexto
        if (input.loteId) {
          const lote = await assertLoteOwnership(input.loteId, ctx.user.id);
          if (lote) {
            const operadora = await db.getOperadoraById(lote.operadoraId);
            const regras = await db.getRegrasByOperadoraId(lote.operadoraId);
            
            contextoCompleto = `\n\nCONTEXTO DO LOTE SELECIONADO:
- ID do Lote: ${lote.id}
- Operadora: ${operadora?.nome || 'Não identificada'}
- Score de Risco: ${lote.scoreRisco ?? 0}% ${(lote.scoreRisco ?? 0) > 70 ? '(ALTO RISCO - REQUER CORREÇÃO URGENTE)' : (lote.scoreRisco ?? 0) > 40 ? '(Risco Médio - Revisar)' : '(Baixo Risco)'}
- Status: ${lote.status}
- Valor Total: R$ ${((lote.valorTotal || 0) / 100).toFixed(2)}
- Quantidade de Guias: ${lote.quantidadeGuias}
- Origem: ${lote.origem === 'ocr' ? 'Convertido via OCR' : 'Upload XML TISS'}
- Data de Criação: ${lote.createdAt?.toLocaleDateString('pt-BR')}

REGRAS ATIVAS DA OPERADORA:
${regras.map(r => `- ${r.tipoRegra.replace(/_/g, ' ').toUpperCase()}: ${r.descricao}`).join('\n') || 'Nenhuma regra cadastrada'}

IMPORTANTE: Sua análise deve ser PREVENTIVA. Identifique problemas que podem causar glosa ANTES do envio à operadora e sugira correções específicas.`;
          }
        }

        const systemPrompt = `Você é um assistente especializado em PREVENÇÃO de glosas médicas e validação pré-envio de guias TISS.

Seu objetivo principal é:
1. Analisar lotes ANTES do envio à operadora
2. Identificar problemas que podem causar glosa
3. Sugerir correções específicas e acionáveis
4. Explicar regras das operadoras de forma clara
5. Ajudar a evitar retrabalho e perdas financeiras

Quando um lote estiver selecionado, use os dados fornecidos para fazer análises CONCRETAS e ESPECÍFICAS, não genéricas.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message + contextoCompleto },
          ],
        });

        const respostaContent = response.choices[0]?.message?.content;
        const resposta = typeof respostaContent === 'string' ? respostaContent : "Desculpe, não consegui processar sua solicitação.";

        // Salvar interação no banco
        await db.createInteracaoIA({
          userId: ctx.user.id,
          loteId: input.loteId,
          tipoInteracao: 'chat',
          pergunta: input.message,
          resposta,
          contexto: contextoCompleto || input.contexto,
        });

        return { resposta };
      }),
    explicarRisco: protectedProcedure
      .input(z.object({
        loteId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        assertAIRateLimit(ctx.user.id);
        const lote = await assertLoteOwnership(input.loteId, ctx.user.id);

        const operadora = await db.getOperadoraById(lote.operadoraId);
        const regras = await db.getRegrasByOperadoraId(lote.operadoraId);
        
        const scoreRisco = lote.scoreRisco ?? 0;
        const nivelRisco = scoreRisco > 70 ? 'ALTO RISCO (CRÍTICO)' : scoreRisco > 40 ? 'RISCO MÉDIO' : 'BAIXO RISCO';

        const prompt = `Analise este lote de guias TISS ANTES DO ENVIO e identifique problemas que podem causar glosa:

DADOS DO LOTE:
- ID: ${lote.id}
- Operadora: ${operadora?.nome || 'Não identificada'} (Código: ${operadora?.codigo || 'N/A'})
- Score de Risco: ${scoreRisco}% - NÍVEL: ${nivelRisco}
- Status Atual: ${lote.status}
- Valor Total: R$ ${((lote.valorTotal || 0) / 100).toFixed(2)}
- Quantidade de Guias: ${lote.quantidadeGuias}
- Origem: ${lote.origem === 'ocr' ? 'Convertido via OCR (maior risco de erros de extração)' : 'Upload XML TISS'}
- Criado em: ${lote.createdAt?.toLocaleDateString('pt-BR')}

REGRAS ATIVAS DA OPERADORA ${operadora?.nome || ''}:
${regras.map(r => `• ${r.tipoRegra.replace(/_/g, ' ').toUpperCase()}: ${r.descricao}${r.codigoTUSS ? ` (TUSS: ${r.codigoTUSS})` : ''}${r.valorMinimo || r.valorMaximo ? ` (Limite: R$ ${(r.valorMinimo || 0)/100} - R$ ${(r.valorMaximo || 999999)/100})` : ''}`).join('\n') || 'Nenhuma regra específica cadastrada - use regras gerais da ANS'}

SUA TAREFA:
1. Identifique ESPECIFICAMENTE quais regras podem estar sendo violadas
2. Explique POR QUE o score está em ${scoreRisco}%
3. Liste PROBLEMAS CONCRETOS que podem causar glosa
4. Forneça CORREÇÕES ESPECÍFICAS que devem ser feitas ANTES do envio
5. Priorize as ações por impacto (o que corrigir primeiro)

LEMBRE-SE: O objetivo é PREVENIR a glosa, não recuperar depois. Seja específico e acionável.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em PREVENÇÃO de glosas médicas. Sua função é identificar problemas ANTES do envio à operadora e sugerir correções específicas. Seja direto, prático e baseie-se nos dados fornecidos." },
            { role: "user", content: prompt },
          ],
        });

        const analiseContent = response.choices[0]?.message?.content;
        const analise = typeof analiseContent === 'string' ? analiseContent : "Não foi possível analisar o lote.";

        await db.createInteracaoIA({
          userId: ctx.user.id,
          loteId: input.loteId,
          tipoInteracao: 'explicar_risco',
          pergunta: prompt,
          resposta: analise,
        });

        return { analise };
      }),
    gerarRecurso: protectedProcedure
      .input(z.object({
        loteId: z.number(),
        motivoGlosa: z.string().max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        assertAIRateLimit(ctx.user.id);
        const lote = await assertLoteOwnership(input.loteId, ctx.user.id);
        
        const operadora = await db.getOperadoraById(lote.operadoraId);
        
        const prompt = `Gere um texto formal e profissional de recurso de glosa médica com base nos seguintes dados:

DADOS DO LOTE GLOSADO:
- Operadora: ${operadora?.nome || 'Não identificada'}
- Valor do Lote: R$ ${((lote.valorTotal || 0) / 100).toFixed(2)}
- Quantidade de Guias: ${lote.quantidadeGuias}
- Data de Criação: ${lote.createdAt?.toLocaleDateString('pt-BR')}

MOTIVO DA GLOSA INFORMADO PELA OPERADORA:
"${input.motivoGlosa}"

REQUISITOS DO TEXTO:
1. Iniciar com identificação formal (prestador, lote, operadora)
2. Descrever o motivo da glosa apresentado pela operadora
3. Apresentar argumentação técnica contestando a glosa
4. Citar normas específicas da ANS (RN, RDC) quando aplicável
5. Solicitar formalmente a reversão da glosa
6. Manter tom profissional, respeitoso mas firme
7. Incluir espaço para assinatura e data ao final

IMPORTANTE: Lembre que o ideal é PREVENIR glosas antes do envio. Este recurso só deve ser usado quando a glosa já ocorreu.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em recursos de glosas médicas e normas da ANS. Gere textos formais, técnicos e persuasivos para contestação de glosas, sempre citando legislação pertinente." },
            { role: "user", content: prompt },
          ],
        });

        const recursoContent = response.choices[0]?.message?.content;
        const textoRecurso = typeof recursoContent === 'string' ? recursoContent : "Não foi possível gerar o recurso.";

        await db.createInteracaoIA({
          userId: ctx.user.id,
          loteId: input.loteId,
          tipoInteracao: 'gerar_recurso',
          pergunta: prompt,
          resposta: textoRecurso,
        });

        return { textoRecurso };
      }),
  }),

  dashboard: router({
    kpis: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDashboardKPIs(ctx.user.id);
    }),
  }),

  validacoes: router({
    validarLote: protectedProcedure
      .input(z.object({
        loteId: z.number(),
        xmlContent: z.string().max(MAX_XML_SIZE_BYTES),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertLoteOwnership(input.loteId, ctx.user.id);

        // Executar parser TISS
        const parser = new TISSParser();
        const result = await parser.parse(input.xmlContent);

        // Limpar valida\u00e7\u00f5es antigas deste lote
        await db.deleteValidacoesByLoteId(input.loteId);

        // Salvar novas valida\u00e7\u00f5es no banco
        for (const validation of result.validations) {
          await db.createValidacao({
            loteId: input.loteId,
            tipoValidacao: validation.tipoValidacao,
            campo: validation.campo,
            status: validation.status,
            mensagem: validation.mensagem,
            detalhes: validation.detalhes || null,
            critico: validation.critico ? 1 : 0,
          });
        }

        // Calcular score de risco: cada erro vale 30 pontos, cada alerta 10 pontos, máx. 100
        const erros = result.validations.filter(v => v.status === 'erro').length;
        const alertas = result.validations.filter(v => v.status === 'alerta').length;
        const errosCriticos = result.validations.filter(v => v.status === 'erro' && v.critico).length;
        const scoreRisco = Math.min(100, erros * 20 + errosCriticos * 15 + alertas * 8);

        // Atualizar score do lote
        await db.updateLote(input.loteId, { scoreRisco });

        return {
          valid: result.valid,
          validations: result.validations,
          scoreRisco,
          data: result.data,
        };
      }),
    getByLoteId: protectedProcedure
      .input(z.object({ loteId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertLoteOwnership(input.loteId, ctx.user.id);
        return await db.getValidacoesByLoteId(input.loteId);
      }),
  }),

  relatorios: router({
    exportarLotesCSV: protectedProcedure.query(async ({ ctx }) => {
      const userLotes = await db.getLotesByUserId(ctx.user.id);
      const operadoras = await db.getAllOperadoras();

      const opMap = new Map(operadoras.map((op: any) => [op.id, op.nome]));

      const header = [
        "ID",
        "Número do Lote",
        "Status",
        "Operadora",
        "Origem",
        "Score de Risco (%)",
        "Valor Total (R$)",
        "Qtd. Guias",
        "Data Criação",
        "Data Envio",
      ].join(";");

      const rows = userLotes.map(l => [
        l.id,
        l.numeroLote ?? "",
        l.status,
        opMap.get(l.operadoraId) ?? l.operadoraId,
        l.origem,
        l.scoreRisco ?? 0,
        ((l.valorTotal ?? 0) / 100).toFixed(2).replace(".", ","),
        l.quantidadeGuias ?? 0,
        l.createdAt
          ? new Date(l.createdAt).toLocaleDateString("pt-BR")
          : "",
        l.dataEnvio
          ? new Date(l.dataEnvio).toLocaleDateString("pt-BR")
          : "",
      ].join(";"));

      const csv = [header, ...rows].join("\n");
      return { csv, filename: `relatorio_lotes_${new Date().toISOString().slice(0, 10)}.csv` };
    }),

    exportarGuiasCSV: protectedProcedure
      .input(z.object({ loteId: z.number() }))
      .query(async ({ ctx, input }) => {
        const lote = await assertLoteOwnership(input.loteId, ctx.user.id);
        const guias = await db.getGuiasByLoteId(input.loteId);

        const header = [
          "ID",
          "Nome do Paciente",
          "CPF",
          "Carteirinha",
          "Código TUSS",
          "CID",
          "Valor (R$)",
          "Nome do Médico",
          "CRM",
          "Nº Autorização",
          "Status",
          "Data Procedimento",
        ].join(";");

        const rows = guias.map(g => [
          g.id,
          g.nomePaciente ?? "",
          g.cpfPaciente ?? "",
          g.numeroCarteirinha ?? "",
          g.codigoTUSS ?? "",
          g.cid ?? "",
          ((g.valorProcedimento ?? 0) / 100).toFixed(2).replace(".", ","),
          g.nomeMedico ?? "",
          g.crm ?? "",
          g.numeroAutorizacao ?? "",
          g.status,
          g.dataProcedimento
            ? new Date(g.dataProcedimento).toLocaleDateString("pt-BR")
            : "",
        ].join(";"));

        const csv = [header, ...rows].join("\n");
        return {
          csv,
          filename: `guias_lote${lote.numeroLote ?? lote.id}_${new Date().toISOString().slice(0, 10)}.csv`,
        };
      }),

    resumoOperadoras: protectedProcedure.query(async ({ ctx }) => {
      const userLotes = await db.getLotesByUserId(ctx.user.id);
      const operadoras = await db.listOperadoras();
      const opMap = new Map(operadoras.map(op => [op.id, op.nome]));

      const agrupado: Record<string, {
        nome: string;
        total: number;
        aprovados: number;
        glosados: number;
        valorTotal: number;
      }> = {};

      for (const lote of userLotes) {
        const nomeOp = opMap.get(lote.operadoraId) ?? `Operadora ${lote.operadoraId}`;
        if (!agrupado[nomeOp]) {
          agrupado[nomeOp] = { nome: nomeOp, total: 0, aprovados: 0, glosados: 0, valorTotal: 0 };
        }
        agrupado[nomeOp].total += 1;
        if (lote.status === 'aprovado') agrupado[nomeOp].aprovados += 1;
        if (lote.status === 'glosa') agrupado[nomeOp].glosados += 1;
        agrupado[nomeOp].valorTotal += lote.valorTotal ?? 0;
      }

      return Object.values(agrupado).sort((a, b) => b.valorTotal - a.valorTotal);
    }),
  }),
});

export type AppRouter = typeof appRouter;
