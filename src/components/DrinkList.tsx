import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wine, Coffee } from "lucide-react";
import DrinkGrid from "./DrinkGrid";

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

const DrinkList = () => {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDrink, setSelectedDrink] = useState<Drink | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const fetchDrinks = async () => {
      try {
        const { data, error } = await supabase.from("drinks").select("*");

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          // Verify that each drink has valid data
          const validatedDrinks = data.map((drink) => {
            // Determine if a drink is alcoholic based on the presence of an image
            const hasImage = !!drink.image_url;
            
            // Validate drink data, ensuring it has required fields and proper formats
            const validated: Drink = {
              id: drink.id || "",
              name: drink.name || "Sem nome",
              description: drink.description || "",
              // Se tem imagem, é alcoólico. Se não tem imagem, não é alcoólico
              is_alcoholic: hasImage,
              image_url: drink.image_url || null,
              ingredients: drink.ingredients || null,
            };
            return validated;
          });

          setDrinks(validatedDrinks);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao carregar os drinks";
        setError(errorMessage);
        console.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDrinks();
  }, []);

  // Filtrar bebidas com base na presença de imagem
  const alcoholicDrinks = drinks.filter((drink) => !!drink.image_url);
  const nonAlcoholicDrinks = drinks.filter((drink) => !drink.image_url);

  const handleSelectDrink = (drink: Drink) => {
    setSelectedDrink(drink);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto mt-8 text-center">
        <p>Carregando drinks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto mt-8 text-center">
        <p className="text-red-500">Erro: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="alcoholic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 glass-effect">
          <TabsTrigger value="alcoholic" className="flex items-center gap-2">
            <Wine size={18} /> Alcoólicos
          </TabsTrigger>
          <TabsTrigger value="non-alcoholic" className="flex items-center gap-2">
            <Coffee size={18} /> Não Alcoólicos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alcoholic" className="mt-6">
          <DrinkGrid drinks={alcoholicDrinks} onSelect={handleSelectDrink} />
        </TabsContent>

        <TabsContent value="non-alcoholic" className="mt-6">
          <DrinkGrid drinks={nonAlcoholicDrinks} onSelect={handleSelectDrink} />
        </TabsContent>
      </Tabs>

      {/* Drink Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md backdrop-blur-lg bg-zinc-900/90 border-zinc-800">
          {selectedDrink && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {selectedDrink.image_url ? (
                    <Wine className="text-amber-300" size={20} />
                  ) : (
                    <Coffee className="text-blue-300" size={20} />
                  )}
                  <DialogTitle className="gold-gradient font-felix">
                    {selectedDrink.name}
                  </DialogTitle>
                </div>
              </DialogHeader>

              {selectedDrink.image_url && (
                <div className="mt-2 rounded-md overflow-hidden">
                  <img
                    src={selectedDrink.image_url}
                    alt={selectedDrink.name}
                    className="w-full h-auto max-h-60 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="mt-3">
                <h4 className="text-md font-medium text-zinc-300 mb-1">Descrição</h4>
                <p className="text-zinc-400 whitespace-pre-line">{selectedDrink.description}</p>
              </div>

              <div className="flex justify-end mt-4">
                <span
                  className={`text-sm px-3 py-1.5 rounded-full 
                    ${
                      selectedDrink.image_url
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    }`}
                >
                  {selectedDrink.image_url ? "Alcoólico" : "Não Alcoólico"}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DrinkList;
