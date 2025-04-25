
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Blackout Drink Builder</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-semibold mb-4">Gerenciar Drinks</h2>
            <p className="mb-6 text-zinc-400">Cadastre e gerencie drinks alcoólicos e não alcoólicos</p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/drinks")}
              className="w-full"
            >
              Acessar Drinks
            </Button>
          </div>

          <div className="bg-zinc-900 p-8 rounded-lg text-center">
            <h2 className="text-2xl font-semibold mb-4">Criar Menus</h2>
            <p className="mb-6 text-zinc-400">Monte menus personalizados para seus eventos</p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/menus")}
              className="w-full"
            >
              Gerenciar Menus
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
