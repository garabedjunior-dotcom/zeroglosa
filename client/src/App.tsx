import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DetalhesLote from "./pages/DetalhesLote";
import Dashboard from "./pages/Dashboard";
import Lotes from "./pages/Lotes";
import NovoLote from "./pages/NovoLote";
import OCR from "./pages/OCR";
import Regras from "./pages/Regras";
import IACopiloto from "./pages/IACopiloto";
import Ajuda from "./pages/Ajuda";
import Relatorios from "./pages/Relatorios";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/sobre"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/lotes"} component={Lotes} />
      <Route path={"/lotes/novo"} component={NovoLote} />
      <Route path={"/lotes/:id"} component={DetalhesLote} />
      <Route path={"/ocr"} component={OCR} />
      <Route path={"/regras"} component={Regras} />
      <Route path={"/ia"} component={IACopiloto} />
      <Route path={"/relatorios"} component={Relatorios} />
      <Route path={"/ajuda"} component={Ajuda} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
