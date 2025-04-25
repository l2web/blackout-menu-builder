
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Drink {
  id: string;
  name: string;
  description: string;
  is_alcoholic: boolean;
  image_url: string | null;
}

const DrinkList = () => {
  const [drinks, setDrinks] = useState<Drink[]>([]);

  useEffect(() => {
    const fetchDrinks = async () => {
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setDrinks(data);
      }
    };

    fetchDrinks();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {drinks.map((drink) => (
        <Card key={drink.id} className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {drink.is_alcoholic && drink.image_url && (
              <img 
                src={drink.image_url} 
                alt={drink.name}
                className="w-full h-48 object-cover mb-4 rounded"
              />
            )}
            <h3 className="text-xl font-semibold mb-2">{drink.name}</h3>
            <p className="text-zinc-400">{drink.description}</p>
            <div className="mt-2">
              <span className={`text-sm px-2 py-1 rounded ${
                drink.is_alcoholic ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
              }`}>
                {drink.is_alcoholic ? 'Alcoólico' : 'Não Alcoólico'}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DrinkList;
