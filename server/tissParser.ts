import { parseStringPromise } from 'xml2js';

export interface TISSValidationResult {
  campo: string;
  status: 'aprovado' | 'alerta' | 'erro';
  mensagem: string;
  detalhes?: string;
  critico: boolean;
  tipoValidacao: string;
}

export interface TISSParseResult {
  valid: boolean;
  validations: TISSValidationResult[];
  data?: {
    paciente?: {
      nome?: string;
      cpf?: string;
      carteirinha?: string;
    };
    procedimento?: {
      codigoTUSS?: string;
      cid?: string;
      valor?: number;
      data?: string;
    };
    medico?: {
      nome?: string;
      crm?: string;
    };
    operadora?: {
      codigo?: string;
      nome?: string;
    };
  };
}

/**
 * Parser de XML TISS com validações segundo padrão ANS
 */
export class TISSParser {
  private validations: TISSValidationResult[] = [];

  /**
   * Parse e valida um arquivo XML TISS
   */
  async parse(xmlContent: string): Promise<TISSParseResult> {
    this.validations = [];

    try {
      // Parse XML
      const parsed = await parseStringPromise(xmlContent, {
        explicitArray: false,
        trim: true,
      });

      // Validar estrutura básica
      this.validateStructure(parsed);

      // Extrair dados
      const data = this.extractData(parsed);

      // Validar campos obrigatórios
      this.validateRequiredFields(data);

      // Validar formatos
      this.validateFormats(data);

      // Validar regras de negócio
      this.validateBusinessRules(data);

      const hasErrors = this.validations.some(v => v.status === 'erro');

      return {
        valid: !hasErrors,
        validations: this.validations,
        data,
      };
    } catch (error) {
      this.addValidation({
        campo: 'xml',
        status: 'erro',
        mensagem: 'Erro ao processar XML TISS',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido',
        critico: true,
        tipoValidacao: 'estrutura',
      });

      return {
        valid: false,
        validations: this.validations,
      };
    }
  }

  private validateStructure(parsed: any): void {
    // Validar tags principais do padrão TISS
    if (!parsed) {
      this.addValidation({
        campo: 'xml',
        status: 'erro',
        mensagem: 'XML vazio ou inválido',
        critico: true,
        tipoValidacao: 'estrutura',
      });
      return;
    }

    // Verificar presença de tags essenciais (simplificado)
    const hasGuias = parsed.ans || parsed.lote || parsed.guias;
    if (!hasGuias) {
      this.addValidation({
        campo: 'estrutura',
        status: 'erro',
        mensagem: 'Estrutura XML não segue padrão TISS',
        detalhes: 'Tags principais não encontradas',
        critico: true,
        tipoValidacao: 'estrutura',
      });
    } else {
      this.addValidation({
        campo: 'estrutura',
        status: 'aprovado',
        mensagem: 'Estrutura XML válida',
        critico: false,
        tipoValidacao: 'estrutura',
      });
    }
  }

  private extractData(parsed: any): TISSParseResult['data'] {
    // Extração simplificada - em produção, seguir exatamente o schema TISS
    const data: TISSParseResult['data'] = {};

    try {
      // Tentar extrair dados de diferentes estruturas possíveis
      const root = parsed.ans || parsed.lote || parsed.guias || parsed;
      
      data.paciente = {
        nome: root.beneficiario?.nomeBeneficiario || root.paciente?.nome || '',
        cpf: root.beneficiario?.cpf || root.paciente?.cpf || '',
        carteirinha: root.beneficiario?.numeroCarteira || root.paciente?.carteirinha || '',
      };

      data.procedimento = {
        codigoTUSS: root.procedimento?.codigo || root.procedimentos?.codigo || '',
        cid: root.diagnostico?.cid || root.procedimento?.cid || '',
        valor: parseFloat(root.procedimento?.valor || root.valorTotal || '0'),
        data: root.procedimento?.data || root.dataAtendimento || '',
      };

      data.medico = {
        nome: root.profissional?.nome || root.medico?.nome || '',
        crm: root.profissional?.crm || root.medico?.crm || '',
      };

      data.operadora = {
        codigo: root.operadora?.codigo || '',
        nome: root.operadora?.nome || '',
      };
    } catch (error) {
      // Dados não puderam ser extraídos completamente
    }

    return data;
  }

  private validateRequiredFields(data: TISSParseResult['data']): void {
    // Validar nome do paciente
    if (!data?.paciente?.nome || data.paciente.nome.length < 3) {
      this.addValidation({
        campo: 'paciente.nome',
        status: 'erro',
        mensagem: 'Nome do paciente obrigatório',
        detalhes: 'Campo vazio ou inválido',
        critico: true,
        tipoValidacao: 'campo_obrigatorio',
      });
    } else {
      this.addValidation({
        campo: 'paciente.nome',
        status: 'aprovado',
        mensagem: 'Nome do paciente preenchido',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    }

    // Validar CPF
    if (!data?.paciente?.cpf) {
      this.addValidation({
        campo: 'paciente.cpf',
        status: 'erro',
        mensagem: 'CPF do paciente obrigatório',
        critico: true,
        tipoValidacao: 'campo_obrigatorio',
      });
    } else {
      this.addValidation({
        campo: 'paciente.cpf',
        status: 'aprovado',
        mensagem: 'CPF do paciente preenchido',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    }

    // Validar carteirinha
    if (!data?.paciente?.carteirinha) {
      this.addValidation({
        campo: 'paciente.carteirinha',
        status: 'erro',
        mensagem: 'Número da carteirinha obrigatório',
        critico: true,
        tipoValidacao: 'campo_obrigatorio',
      });
    } else {
      this.addValidation({
        campo: 'paciente.carteirinha',
        status: 'aprovado',
        mensagem: 'Número da carteirinha preenchido',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    }

    // Validar código TUSS
    if (!data?.procedimento?.codigoTUSS) {
      this.addValidation({
        campo: 'procedimento.codigoTUSS',
        status: 'erro',
        mensagem: 'Código TUSS obrigatório',
        critico: true,
        tipoValidacao: 'campo_obrigatorio',
      });
    } else {
      this.addValidation({
        campo: 'procedimento.codigoTUSS',
        status: 'aprovado',
        mensagem: 'Código TUSS preenchido',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    }

    // Validar CID
    if (!data?.procedimento?.cid) {
      this.addValidation({
        campo: 'procedimento.cid',
        status: 'alerta',
        mensagem: 'CID não informado',
        detalhes: 'Recomendado para evitar glosas',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    } else {
      this.addValidation({
        campo: 'procedimento.cid',
        status: 'aprovado',
        mensagem: 'CID preenchido',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    }

    // Validar CRM
    if (!data?.medico?.crm) {
      this.addValidation({
        campo: 'medico.crm',
        status: 'alerta',
        mensagem: 'CRM do médico não informado',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    } else {
      this.addValidation({
        campo: 'medico.crm',
        status: 'aprovado',
        mensagem: 'CRM do médico preenchido',
        critico: false,
        tipoValidacao: 'campo_obrigatorio',
      });
    }
  }

  private validateFormats(data: TISSParseResult['data']): void {
    // Validar formato do CPF
    if (data?.paciente?.cpf) {
      const cpfLimpo = data.paciente.cpf.replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        this.addValidation({
          campo: 'paciente.cpf',
          status: 'erro',
          mensagem: 'CPF em formato inválido',
          detalhes: 'CPF deve conter 11 dígitos',
          critico: true,
          tipoValidacao: 'formato',
        });
      } else if (!this.validarCPF(cpfLimpo)) {
        this.addValidation({
          campo: 'paciente.cpf',
          status: 'erro',
          mensagem: 'CPF inválido',
          detalhes: 'Dígitos verificadores incorretos',
          critico: true,
          tipoValidacao: 'formato',
        });
      } else {
        this.addValidation({
          campo: 'paciente.cpf',
          status: 'aprovado',
          mensagem: 'CPF válido',
          critico: false,
          tipoValidacao: 'formato',
        });
      }
    }

    // Validar formato do código TUSS
    if (data?.procedimento?.codigoTUSS) {
      const tuss = data.procedimento.codigoTUSS.replace(/\D/g, '');
      if (tuss.length !== 8) {
        this.addValidation({
          campo: 'procedimento.codigoTUSS',
          status: 'erro',
          mensagem: 'Código TUSS em formato inválido',
          detalhes: 'Código TUSS deve conter 8 dígitos',
          critico: true,
          tipoValidacao: 'formato',
        });
      } else {
        this.addValidation({
          campo: 'procedimento.codigoTUSS',
          status: 'aprovado',
          mensagem: 'Código TUSS em formato válido',
          critico: false,
          tipoValidacao: 'formato',
        });
      }
    }

    // Validar formato do CID
    if (data?.procedimento?.cid) {
      const cidRegex = /^[A-Z]\d{2}(\.\d{1,2})?$/;
      if (!cidRegex.test(data.procedimento.cid)) {
        this.addValidation({
          campo: 'procedimento.cid',
          status: 'erro',
          mensagem: 'CID em formato inválido',
          detalhes: 'Formato esperado: A00 ou A00.0',
          critico: false,
          tipoValidacao: 'formato',
        });
      } else {
        this.addValidation({
          campo: 'procedimento.cid',
          status: 'aprovado',
          mensagem: 'CID em formato válido',
          critico: false,
          tipoValidacao: 'formato',
        });
      }
    }

    // Validar formato do CRM
    if (data?.medico?.crm) {
      const crmRegex = /^\d{4,6}[-\/]?[A-Z]{2}$/;
      if (!crmRegex.test(data.medico.crm)) {
        this.addValidation({
          campo: 'medico.crm',
          status: 'alerta',
          mensagem: 'CRM em formato não padrão',
          detalhes: 'Formato esperado: 12345-UF',
          critico: false,
          tipoValidacao: 'formato',
        });
      } else {
        this.addValidation({
          campo: 'medico.crm',
          status: 'aprovado',
          mensagem: 'CRM em formato válido',
          critico: false,
          tipoValidacao: 'formato',
        });
      }
    }

    // Validar data do procedimento
    if (data?.procedimento?.data) {
      const dataValida = this.validarData(data.procedimento.data);
      if (!dataValida) {
        this.addValidation({
          campo: 'procedimento.data',
          status: 'erro',
          mensagem: 'Data do procedimento inválida',
          critico: false,
          tipoValidacao: 'formato',
        });
      } else {
        this.addValidation({
          campo: 'procedimento.data',
          status: 'aprovado',
          mensagem: 'Data do procedimento válida',
          critico: false,
          tipoValidacao: 'formato',
        });
      }
    }
  }

  private validateBusinessRules(data: TISSParseResult['data']): void {
    // Validar valor do procedimento
    if (data?.procedimento?.valor !== undefined) {
      if (data.procedimento.valor <= 0) {
        this.addValidation({
          campo: 'procedimento.valor',
          status: 'erro',
          mensagem: 'Valor do procedimento deve ser maior que zero',
          critico: true,
          tipoValidacao: 'regra_negocio',
        });
      } else if (data.procedimento.valor > 100000) {
        this.addValidation({
          campo: 'procedimento.valor',
          status: 'alerta',
          mensagem: 'Valor do procedimento muito alto',
          detalhes: 'Valores acima de R$ 1.000,00 podem requerer autorização prévia',
          critico: false,
          tipoValidacao: 'regra_negocio',
        });
      } else {
        this.addValidation({
          campo: 'procedimento.valor',
          status: 'aprovado',
          mensagem: 'Valor do procedimento dentro dos limites',
          critico: false,
          tipoValidacao: 'regra_negocio',
        });
      }
    }

    // Validar data do procedimento não é futura
    if (data?.procedimento?.data) {
      const dataProcedimento = new Date(data.procedimento.data);
      const hoje = new Date();
      if (dataProcedimento > hoje) {
        this.addValidation({
          campo: 'procedimento.data',
          status: 'erro',
          mensagem: 'Data do procedimento não pode ser futura',
          critico: true,
          tipoValidacao: 'regra_negocio',
        });
      }
    }
  }

  private validarCPF(cpf: string): boolean {
    // Validação básica de CPF
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto === 10 || resto === 11 ? 0 : resto;

    if (digito1 !== parseInt(cpf.charAt(9))) {
      return false;
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto === 10 || resto === 11 ? 0 : resto;

    return digito2 === parseInt(cpf.charAt(10));
  }

  private validarData(data: string): boolean {
    // Aceitar formatos: YYYY-MM-DD, DD/MM/YYYY
    const regexISO = /^\d{4}-\d{2}-\d{2}$/;
    const regexBR = /^\d{2}\/\d{2}\/\d{4}$/;

    if (!regexISO.test(data) && !regexBR.test(data)) {
      return false;
    }

    const dataObj = new Date(data);
    return !isNaN(dataObj.getTime());
  }

  private addValidation(validation: TISSValidationResult): void {
    this.validations.push(validation);
  }
}
