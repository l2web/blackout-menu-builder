import { Card, CardContent } from "@/components/ui/card";
import { Wine, Coffee, List, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Ingredient {
  name: string;
  quantity: string;
}

interface Drink {
  id: string;
  name: string;
  description: string;
  is_alcoholic: boolean;
  image_url: string | null;
  ingredients: Ingredient[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface DrinkGridProps {
  drinks: Drink[];
  onSelect: (drink: Drink) => void;
}

const DrinkGrid = ({ drinks, onSelect }: DrinkGridProps) => {
  if (drinks.length === 0) {
    return (
      <div className="col-span-full text-center py-12 glass-effect rounded-xl">
        <p className="text-xl font-medium mb-2 silver-accent">Nenhum drink encontrado nesta categoria</p>
        <p className="text-zinc-400">Adicione novos drinks usando o botão acima.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {drinks.map((drink) => (
        <Card 
          key={drink.id} 
          className={`overflow-hidden rounded-xl ${drink.image_url ? 'silver-card-premium' : 'silver-card'} shine-effect`}
        >
          {drink.image_url ? (
            <div className="relative h-52 overflow-hidden">
              <img 
                src={drink.image_url} 
                alt={drink.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-3 right-3">
                <span className="text-sm px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md font-medium">
                  Alcoólico
                </span>
              </div>
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-r from-blue-800/30 to-blue-900/30 flex items-center justify-center">
              <Coffee size={60} className="text-blue-400/60" />
              <div className="absolute top-3 right-3">
                <span className="text-sm px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 backdrop-blur-md font-medium">
                  Não Alcoólico
                </span>
              </div>
            </div>
          )}
          <CardContent className="p-5">
            <h3 className="text-xl font-semibold mb-2 gold-gradient">{drink.name}</h3>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <List size={16} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Ingredientes</span>
              </div>
              <p className="text-zinc-400 text-sm line-clamp-3">{drink.description}</p>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className={`border-zinc-700 hover:bg-zinc-800 ${drink.image_url ? 'text-amber-300' : 'text-blue-300'}`}
                onClick={() => onSelect(drink)}
              >
                <Maximize2 size={14} className="mr-1" /> Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DrinkGrid; 