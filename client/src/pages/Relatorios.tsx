import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart2,
  Download,
  ArrowLeft,
  Building2,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function downloadCSV(csv: string, filename: string) {
  const bom = "\uFEFF"; // UTF-8 BOM para Excel reconhecer acentos
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Relatorios() {
  const { data: resumo, isLoading } = trpc.relatorios.resumoOperadoras.useQuery();
  const exportLotesQuery = trpc.relatorios.exportarLotesCSV.useQuery(undefined, {
    enabled: false,
  });

  const handleExportarLotes = async () => {
    try {
      const result = await exportLotesQuery.refetch();
      if (result.data) {
        downloadCSV(result.data.csv, result.data.filename);
        toast.success("Relatório exportado com sucesso!");
      }
    } catch {
      toast.error("Erro ao exportar relatório");
    }
  };

  const chartData = (resumo ?? []).map(op => ({
    name: op.nome.length > 12 ? op.nome.slice(0, 12) + "…" : op.nome,
    nomeCompleto: op.nome,
    total: op.total,
    aprovados: op.aprovados,
    glosados: op.glosados,
    valor: op.valorTotal / 100,
  }));

  const totalLotes = resumo?.reduce((s, o) => s + o.total, 0) ?? 0;
  const totalAprovados = resumo?.reduce((s, o) => s + o.aprovados, 0) ?? 0;
  const totalGlosados = resumo?.reduce((s, o) => s + o.glosados, 0) ?? 0;
  const valorTotal = resumo?.reduce((s, o) => s + o.valorTotal, 0) ?? 0;

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container py-4 sm:py-6 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                    <BarChart2 className="h-7 w-7 text-primary" />
                    Relatórios
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    Análises e exportações dos seus dados
                  </p>
                </div>
              </div>
              <Button
                onClick={handleExportarLotes}
                disabled={exportLotesQuery.isFetching}
                className="gap-2"
              >
                {exportLotesQuery.isFetching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Exportar Lotes CSV
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-6 sm:py-8 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Carregando relatórios...</p>
              </div>
            </div>
          ) : (
            <>
              {/* KPIs Gerais */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Total de Lotes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalLotes}</div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-success">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Aprovados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-success">{totalAprovados}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalLotes > 0 ? ((totalAprovados / totalLotes) * 100).toFixed(1) : 0}% do total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-destructive">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Glosados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-destructive">{totalGlosados}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalLotes > 0 ? ((totalGlosados / totalLotes) * 100).toFixed(1) : 0}% do total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-accent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {(valorTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico por Operadora */}
              {chartData.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Lotes por Operadora
                    </CardTitle>
                    <CardDescription>Total, aprovados e glosados por operadora</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full overflow-x-auto">
                      <ResponsiveContainer width="100%" height={300} minWidth={300}>
                        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip
                            formatter={(value, name) => [
                              value,
                              name === "total" ? "Total" :
                              name === "aprovados" ? "Aprovados" : "Glosados",
                            ]}
                            labelFormatter={(label, payload) =>
                              payload?.[0]?.payload?.nomeCompleto ?? label
                            }
                          />
                          <Bar dataKey="total" name="total" fill="oklch(0.62 0.18 250)" />
                          <Bar dataKey="aprovados" name="aprovados" fill="oklch(0.55 0.15 145)" />
                          <Bar dataKey="glosados" name="glosados" fill="oklch(0.577 0.245 27.325)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabela por Operadora */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo por Operadora</CardTitle>
                  <CardDescription>Desempenho detalhado de cada operadora</CardDescription>
                </CardHeader>
                <CardContent>
                  {resumo && resumo.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-3 font-medium">Operadora</th>
                            <th className="pb-3 font-medium text-right">Total</th>
                            <th className="pb-3 font-medium text-right">Aprovados</th>
                            <th className="pb-3 font-medium text-right">Glosados</th>
                            <th className="pb-3 font-medium text-right">Taxa de Glosa</th>
                            <th className="pb-3 font-medium text-right">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumo.map(op => (
                            <tr key={op.nome} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-3 font-medium">{op.nome}</td>
                              <td className="py-3 text-right">{op.total}</td>
                              <td className="py-3 text-right text-success font-medium">{op.aprovados}</td>
                              <td className="py-3 text-right text-destructive font-medium">{op.glosados}</td>
                              <td className="py-3 text-right">
                                <span className={
                                  op.total > 0 && op.glosados / op.total > 0.2
                                    ? "text-destructive font-semibold"
                                    : "text-muted-foreground"
                                }>
                                  {op.total > 0
                                    ? ((op.glosados / op.total) * 100).toFixed(1)
                                    : "0.0"}%
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                R$ {(op.valorTotal / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum dado disponível. Crie lotes para ver os relatórios.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
