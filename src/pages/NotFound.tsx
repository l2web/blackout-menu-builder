import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle size={60} className="text-amber-500" />
        </div>
        <h1 className="text-4xl font-bold mb-4 gold-gradient font-felix">404</h1>
        <p className="text-xl text-zinc-400 mb-6">Página não encontrada</p>
        <Button 
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600"
        >
          Voltar para Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
