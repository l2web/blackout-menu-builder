import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wine, Scroll } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Título da aplicação */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-4xl font-bold mb-4 gold-gradient font-felix">
            Menu Builder
          </h1>
          <p className="text-lg silver-accent max-w-2xl mx-auto">
            Design de menus sofisticados para sua coleção de drinks exclusivos
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 mx-auto max-w-3xl">
          {/* Card de Menus - Agora primeiro */}
          <div className="silver-card-premium shine-effect rounded-xl overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-amber-900/40 to-yellow-700/40 flex items-center justify-center">
              <Scroll size={80} className="text-white/60" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-2 gold-gradient font-felix">Criar Menus</h2>
              <p className="mb-6 text-zinc-400">
                Monte menus personalizados para seus eventos com uma apresentação refinada e sofisticada
              </p>
              <Button 
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-900 font-medium"
                onClick={() => navigate("/menus")}
              >
                <Scroll size={16} className="mr-2" />
                Gerenciar Menus
              </Button>
            </div>
          </div>

          {/* Card de Drinks - Agora segundo */}
          <div className="silver-card shine-effect rounded-xl overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 flex items-center justify-center">
              <Wine size={80} className="text-white/60" />
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-2 gold-gradient font-felix">Gerenciar Drinks</h2>
              <p className="mb-6 text-zinc-400">
                Cadastre e gerencie drinks alcoólicos e não alcoólicos com um visual elegante e detalhado
              </p>
              <Button 
                className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white border border-zinc-600"
                onClick={() => navigate("/drinks")}
              >
                <Wine size={16} className="mr-2" />
                Acessar Drinks
              </Button>
            </div>
          </div>
        </div>
        
        {/* Rodapé */}
        <div className="text-center text-zinc-500 text-sm py-8">
          <p>Blackout Menu Builder &copy; {new Date().getFullYear()} - Design Elegante</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
