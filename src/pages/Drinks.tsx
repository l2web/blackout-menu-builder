import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DrinkForm from "@/components/DrinkForm";
import DrinkList from "@/components/DrinkList";
import { useNavigate } from "react-router-dom";
import { Wine, Coffee } from "lucide-react";

const Drinks = () => {
  const [isAddingDrink, setIsAddingDrink] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold gold-gradient font-felix">Coleção de Bebidas</h1>
            <p className="text-zinc-400 mt-1">
              Gerencie drinks alcoólicos e não alcoólicos para seus menus
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/")} className="border-zinc-700 text-zinc-300">
              Voltar
            </Button>
            <Button 
              onClick={() => setIsAddingDrink(true)}
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600"
            >
              Adicionar Drink
            </Button>
          </div>
        </div>

        {isAddingDrink ? (
          <Card className="mb-8 glass-effect border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wine size={20} className="text-amber-500 mr-2" />
                <Coffee size={20} className="text-blue-400 mr-2" />
                Novo Drink
              </CardTitle>
              <CardDescription>Cadastre um novo drink alcoólico ou não alcoólico</CardDescription>
            </CardHeader>
            <CardContent>
              <DrinkForm onComplete={() => setIsAddingDrink(false)} />
            </CardContent>
          </Card>
        ) : null}

        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-semibold silver-accent font-felix">
            Bebidas Cadastradas
          </h2>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-1.5"></div>
              <span>Alcoólicos (com foto)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
              <span>Não Alcoólicos (sem foto)</span>
            </div>
          </div>
        </div>

        <DrinkList />
      </div>
    </div>
  );
};

export default Drinks;
