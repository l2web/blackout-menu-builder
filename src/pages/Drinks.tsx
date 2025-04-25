
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DrinkForm from "@/components/DrinkForm";
import DrinkList from "@/components/DrinkList";
import { useNavigate } from "react-router-dom";

const Drinks = () => {
  const [isAddingDrink, setIsAddingDrink] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Gerenciar Drinks</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar
            </Button>
            <Button onClick={() => setIsAddingDrink(true)}>
              Adicionar Drink
            </Button>
          </div>
        </div>

        {isAddingDrink ? (
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Novo Drink</CardTitle>
              <CardDescription>Preencha os dados do drink</CardDescription>
            </CardHeader>
            <CardContent>
              <DrinkForm onComplete={() => setIsAddingDrink(false)} />
            </CardContent>
          </Card>
        ) : null}

        <DrinkList />
      </div>
    </div>
  );
};

export default Drinks;
