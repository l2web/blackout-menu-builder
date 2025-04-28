import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Drinks from "./pages/Drinks";
import Menus from "./pages/Menus";
import NotFound from "./pages/NotFound";
import SupabaseTest from "./pages/SupabaseTest";
import MenuDeleteTester from "./components/MenuDeleteTester";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/drinks" element={<Drinks />} />
          <Route path="/menus" element={<Menus />} />
          <Route path="/supabase-test" element={<SupabaseTest />} />
          <Route path="/menu-delete-test" element={<MenuDeleteTester />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
