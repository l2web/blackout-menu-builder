
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
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gerenciar Menus</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar
            </Button>
            <Button onClick={() => setIsCreatingMenu(true)}>
              Criar Novo Menu
            </Button>
          </div>
        </div>

        {isCreatingMenu ? (
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Novo Menu</CardTitle>
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
