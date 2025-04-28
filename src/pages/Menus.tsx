import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import MenuForm from "@/components/MenuForm";
import MenuList from "@/components/MenuList";

const Menus = () => {
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold gold-gradient font-felix">Gerenciar Menus</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/")} className="border-zinc-700 text-zinc-300">
              Voltar
            </Button>
            <Button 
              onClick={() => setIsCreatingMenu(true)}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-900 font-medium"
            >
              Criar Novo Menu
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
