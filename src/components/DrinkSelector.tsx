import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface Drink {
  id: string;
  name: string;
  description: string;
  is_alcoholic: boolean;
  image_url: string | null;
}

interface DrinkSelectorProps {
  alcoholicCount: number;
  nonAlcoholicCount: number;
  onAlcoholicDrinksSelected: (drinkIds: string[]) => void;
  onNonAlcoholicDrinksSelected: (drinkIds: string[]) => void;
}

const DrinkSelector = ({
  alcoholicCount,
  nonAlcoholicCount,
  onAlcoholicDrinksSelected,
  onNonAlcoholicDrinksSelected,
}: DrinkSelectorProps) => {
  const [alcoholicDrinks, setAlcoholicDrinks] = useState<Drink[]>([]);
  const [nonAlcoholicDrinks, setNonAlcoholicDrinks] = useState<Drink[]>([]);
  const [selectedAlcoholic, setSelectedAlcoholic] = useState<string[]>([]);
  const [selectedNonAlcoholic, setSelectedNonAlcoholic] = useState<string[]>([]);

  useEffect(() => {
    const fetchDrinks = async () => {
      const { data: alcoholic } = await supabase
        .from("drinks")
        .select("*")
        .eq("is_alcoholic", true)
        .order("name");

      const { data: nonAlcoholic } = await supabase
        .from("drinks")
        .select("*")
        .eq("is_alcoholic", false)
        .order("name");

      if (alcoholic) setAlcoholicDrinks(alcoholic);
      if (nonAlcoholic) setNonAlcoholicDrinks(nonAlcoholic);
    };

    fetchDrinks();
  }, []);

  const toggleAlcoholicDrink = (drinkId: string) => {
    console.log("Toggling Alcoholic Drink:", drinkId);
    console.log("Current selectedAlcoholic:", selectedAlcoholic);
    if (selectedAlcoholic.includes(drinkId)) {
      const newSelected = selectedAlcoholic.filter(id => id !== drinkId);
      setSelectedAlcoholic(newSelected);
      onAlcoholicDrinksSelected(newSelected);
      console.log("After removing, selectedAlcoholic:", newSelected);
    } else {
      if (selectedAlcoholic.length < alcoholicCount) {
        const newSelected = [...selectedAlcoholic, drinkId];
        setSelectedAlcoholic(newSelected);
        onAlcoholicDrinksSelected(newSelected);
        console.log("After adding, selectedAlcoholic:", newSelected);
      } else {
        console.log("Cannot add, limit reached:", alcoholicCount);
      }
    }
  };

  const toggleNonAlcoholicDrink = (drinkId: string) => {
    console.log("Toggling Non-Alcoholic Drink:", drinkId);
    console.log("Current selectedNonAlcoholic:", selectedNonAlcoholic);
    if (selectedNonAlcoholic.includes(drinkId)) {
      const newSelected = selectedNonAlcoholic.filter(id => id !== drinkId);
      setSelectedNonAlcoholic(newSelected);
      onNonAlcoholicDrinksSelected(newSelected);
      console.log("After removing, selectedNonAlcoholic:", newSelected);
    } else {
      if (selectedNonAlcoholic.length < nonAlcoholicCount) {
        const newSelected = [...selectedNonAlcoholic, drinkId];
        setSelectedNonAlcoholic(newSelected);
        onNonAlcoholicDrinksSelected(newSelected);
        console.log("After adding, selectedNonAlcoholic:", newSelected);
      } else {
        console.log("Cannot add, limit reached:", nonAlcoholicCount);
      }
    }
  };

  return (
    <div className="space-y-6">
      {alcoholicCount > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">
            Drinks Alcoólicos ({selectedAlcoholic.length}/{alcoholicCount})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alcoholicDrinks.map((drink) => (
              <Card 
                key={drink.id} 
                className={`bg-zinc-800 border-zinc-700 cursor-pointer transition ${
                  selectedAlcoholic.includes(drink.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => toggleAlcoholicDrink(drink.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox 
                    checked={selectedAlcoholic.includes(drink.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!selectedAlcoholic.includes(drink.id) && selectedAlcoholic.length >= alcoholicCount}
                  />
                  <div>
                    <h4 className="font-medium">{drink.name}</h4>
                    <p className="text-sm text-zinc-400">{drink.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {nonAlcoholicCount > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">
            Drinks Não Alcoólicos ({selectedNonAlcoholic.length}/{nonAlcoholicCount})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nonAlcoholicDrinks.map((drink) => (
              <Card 
                key={drink.id} 
                className={`bg-zinc-800 border-zinc-700 cursor-pointer transition ${
                  selectedNonAlcoholic.includes(drink.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => toggleNonAlcoholicDrink(drink.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <Checkbox 
                    checked={selectedNonAlcoholic.includes(drink.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!selectedNonAlcoholic.includes(drink.id) && selectedNonAlcoholic.length >= nonAlcoholicCount}
                  />
                  <div>
                    <h4 className="font-medium">{drink.name}</h4>
                    <p className="text-sm text-zinc-400">{drink.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DrinkSelector;
