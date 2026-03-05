import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Pages (to be implemented)
// import Dashboard from "@/pages/Dashboard";
// import Alerts from "@/pages/Alerts";
// import Cameras from "@/pages/Cameras";
// import Warehouse from "@/pages/Warehouse";
// import Inventory from "@/pages/Inventory";
// import Fleet from "@/pages/Fleet";
// import Analytics from "@/pages/Analytics";
// import Reports from "@/pages/Reports";
// import Settings from "@/pages/Settings";
// import Login from "@/pages/Login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-text-primary mb-4">
                Warehouse Intelligence Platform
              </h1>
              <p className="text-text-secondary text-lg mb-2">
                Powered by NVIDIA Cosmos Reason 2
              </p>
              <div className="inline-block px-4 py-2 rounded-button bg-accent/10 border border-accent/20">
                <span className="text-accent font-medium">
                  Setup Complete - Ready to Build
                </span>
              </div>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
