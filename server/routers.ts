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

// Limites de upload
const MAX_XML_SIZE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

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
        return { success: true };
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
        descricao: z.string(),
        codigoTUSS: z.string().optional(),
        valorMinimo: z.number().optional(),
        valorMaximo: z.number().optional(),
        prazoAutorizacao: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createRegra(input);
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

        // Criar registro de conversão OCR
        await db.createConversaoOCR({
          userId: ctx.user.id,
          imagemUrl: url,
          status: 'processando',
        });

        // Aqui seria integrado um serviço OCR real (Tesseract, Google Vision, etc)
        // Por enquanto, retornamos dados simulados
        return {
          success: true,
          imageUrl: url,
          extractedData: {
            nomePaciente: "João da Silva",
            cpfPaciente: "123.456.789-00",
            numeroCarteirinha: "123456789",
            codigoTUSS: "10101012",
            cid: "M54.5",
            valorProcedimento: 15000,
            nomeMedico: "Dr. Carlos Santos",
            crm: "12345-SP",
          }
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
});

export type AppRouter = typeof appRouter;
