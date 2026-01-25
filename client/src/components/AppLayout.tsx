import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content - com margem para a sidebar */}
      <main className="flex-1 lg:ml-64">
        {children}
      </main>
    </div>
  );
}
