import { describe, expect, it } from "vitest";
import { TISSParser } from "./tissParser";

describe("TISSParser", () => {
  it("deve validar XML TISS básico com sucesso", async () => {
    const parser = new TISSParser();
    const xmlValido = `<?xml version="1.0" encoding="UTF-8"?>
<ans>
  <beneficiario>
    <nomeBeneficiario>João da Silva</nomeBeneficiario>
    <cpf>12345678901</cpf>
    <numeroCarteira>123456789</numeroCarteira>
  </beneficiario>
  <procedimento>
    <codigo>40101010</codigo>
    <valor>15000</valor>
    <data>2024-01-15</data>
  </procedimento>
  <diagnostico>
    <cid>A00.0</cid>
  </diagnostico>
  <profissional>
    <nome>Dr. Maria Santos</nome>
    <crm>12345-SP</crm>
  </profissional>
</ans>`;

    const result = await parser.parse(xmlValido);

    expect(result).toBeDefined();
    expect(result.validations).toBeDefined();
    expect(result.validations.length).toBeGreaterThan(0);
    expect(result.data).toBeDefined();
    expect(result.data?.paciente?.nome).toBe("João da Silva");
    expect(result.data?.paciente?.cpf).toBe("12345678901");
  });

  it("deve identificar CPF inválido", async () => {
    const parser = new TISSParser();
    const xmlCPFInvalido = `<?xml version="1.0" encoding="UTF-8"?>
<ans>
  <beneficiario>
    <nomeBeneficiario>João da Silva</nomeBeneficiario>
    <cpf>00000000000</cpf>
    <numeroCarteira>123456789</numeroCarteira>
  </beneficiario>
  <procedimento>
    <codigo>40101010</codigo>
    <valor>15000</valor>
    <data>2024-01-15</data>
  </procedimento>
</ans>`;

    const result = await parser.parse(xmlCPFInvalido);

    const cpfValidation = result.validations.find(v => v.campo === "paciente.cpf" && v.tipoValidacao === "formato");
    expect(cpfValidation).toBeDefined();
    expect(cpfValidation?.status).toBe("erro");
  });

  it("deve identificar campos obrigatórios faltando", async () => {
    const parser = new TISSParser();
    const xmlIncompleto = `<?xml version="1.0" encoding="UTF-8"?>
<ans>
  <beneficiario>
    <nomeBeneficiario>João da Silva</nomeBeneficiario>
  </beneficiario>
</ans>`;

    const result = await parser.parse(xmlIncompleto);

    const cpfValidation = result.validations.find(v => v.campo === "paciente.cpf");
    const tussValidation = result.validations.find(v => v.campo === "procedimento.codigoTUSS");
    
    expect(cpfValidation?.status).toBe("erro");
    expect(tussValidation?.status).toBe("erro");
    expect(result.valid).toBe(false);
  });

  it("deve validar formato do código TUSS", async () => {
    const parser = new TISSParser();
    const xmlTUSSInvalido = `<?xml version="1.0" encoding="UTF-8"?>
<ans>
  <beneficiario>
    <nomeBeneficiario>João da Silva</nomeBeneficiario>
    <cpf>12345678901</cpf>
    <numeroCarteira>123456789</numeroCarteira>
  </beneficiario>
  <procedimento>
    <codigo>123</codigo>
    <valor>15000</valor>
  </procedimento>
</ans>`;

    const result = await parser.parse(xmlTUSSInvalido);

    const tussValidation = result.validations.find(
      v => v.campo === "procedimento.codigoTUSS" && v.tipoValidacao === "formato"
    );
    expect(tussValidation?.status).toBe("erro");
  });

  it("deve validar formato do CID", async () => {
    const parser = new TISSParser();
    const xmlCIDInvalido = `<?xml version="1.0" encoding="UTF-8"?>
<ans>
  <beneficiario>
    <nomeBeneficiario>João da Silva</nomeBeneficiario>
    <cpf>12345678901</cpf>
    <numeroCarteira>123456789</numeroCarteira>
  </beneficiario>
  <procedimento>
    <codigo>40101010</codigo>
    <valor>15000</valor>
  </procedimento>
  <diagnostico>
    <cid>INVALIDO</cid>
  </diagnostico>
</ans>`;

    const result = await parser.parse(xmlCIDInvalido);

    const cidValidation = result.validations.find(
      v => v.campo === "procedimento.cid" && v.tipoValidacao === "formato"
    );
    expect(cidValidation?.status).toBe("erro");
  });

  it("deve validar valor do procedimento", async () => {
    const parser = new TISSParser();
    const xmlValorZero = `<?xml version="1.0" encoding="UTF-8"?>
<ans>
  <beneficiario>
    <nomeBeneficiario>João da Silva</nomeBeneficiario>
    <cpf>12345678901</cpf>
    <numeroCarteira>123456789</numeroCarteira>
  </beneficiario>
  <procedimento>
    <codigo>40101010</codigo>
    <valor>0</valor>
  </procedimento>
</ans>`;

    const result = await parser.parse(xmlValorZero);

    const valorValidation = result.validations.find(
      v => v.campo === "procedimento.valor" && v.tipoValidacao === "regra_negocio"
    );
    expect(valorValidation?.status).toBe("erro");
  });

  it("deve retornar erro para XML malformado", async () => {
    const parser = new TISSParser();
    const xmlInvalido = "isto não é XML";

    const result = await parser.parse(xmlInvalido);

    expect(result.valid).toBe(false);
    expect(result.validations.length).toBeGreaterThan(0);
    expect(result.validations[0]?.status).toBe("erro");
  });
});
