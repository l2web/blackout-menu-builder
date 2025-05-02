import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import MenuForm from "@/components/MenuForm";
import MenuList from "@/components/MenuList";
import { PlusCircle } from "lucide-react";

const Menus = () => {
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-black text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 gap-4">
          <h1 className="text-3xl font-bold gold-gradient font-felix">Gerenciar Menus</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button variant="outline" onClick={() => navigate("/")} className="border-zinc-700 text-zinc-300 order-2 sm:order-1">
              Voltar
            </Button>
            <Button 
              onClick={() => setIsCreatingMenu(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-900 font-medium text-base py-6 sm:py-2 shadow-lg shadow-amber-900/30 border-2 border-amber-400/20 order-1 sm:order-2 w-full sm:w-auto transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span className="font-medium">Criar Novo Menu</span>
            </Button>
          </div>
        </div>

        {isCreatingMenu ? (
          <Card className="mb-8 glass-effect border-zinc-800">
            <CardHeader>
              <CardTitle className="font-felix">Novo Menu</CardTitle>
              <CardDescription>Configure seu menu personalizado</CardDescription>
            </CardHeader>
            <CardContent>
              <MenuForm onComplete={() => setIsCreatingMenu(false)} />
            </CardContent>
          </Card>
        ) : null}

        <MenuList />
      </div>
    </div>
  );
};

export default Menus;
