import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Wine, Coffee } from "lucide-react";

interface Drink {
  id: string;
  name: string;
  description: string;
  is_alcoholic: boolean;
  image_url: string | null;
}

interface DrinkSelectorProps {
  type: 'alcoholic' | 'non-alcoholic';
  count: number;
  selectedDrinks: string[];
  onSelect: (drinkIds: string[]) => void;
}

const DrinkSelector = ({
  type,
  count,
  selectedDrinks,
  onSelect,
}: DrinkSelectorProps) => {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const title = type === 'alcoholic' ? "Drinks Alcoólicos" : "Não Alcoólicos";

  useEffect(() => {
    const fetchDrinks = async () => {
      setLoading(true);
      
      // Consulta base
      let query = supabase.from("drinks").select("*");

      // Aplicar filtro conforme o tipo
      if (type === 'alcoholic') {
        // Alcoólicos devem ter foto
        query = query
          .not('image_url', 'is', null);
      } else {
        // Não alcoólicos não devem ter foto
        query = query.is('image_url', null);
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error(`Erro ao buscar drinks ${type}:`, error);
      } else if (data) {
        setDrinks(data);
        console.log(`Drinks ${type} carregados:`, data);
      }
      setLoading(false);
    };

    if (count > 0) {
      fetchDrinks();
    }
    return () => setDrinks([]);
  }, [type, count]);

  const handleCheckChange = (checked: boolean | 'indeterminate', drinkId: string) => {
    let newSelected: string[];
    if (checked === true) {
      if (selectedDrinks.length < count && !selectedDrinks.includes(drinkId)) {
        newSelected = [...selectedDrinks, drinkId];
        onSelect(newSelected);
      }
    } else {
      newSelected = selectedDrinks.filter(id => id !== drinkId);
      onSelect(newSelected);
    }
  };

  if (count === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        {type === 'alcoholic' ? (
          <Wine className="mr-2 h-5 w-5 text-amber-500" />
        ) : (
          <Coffee className="mr-2 h-5 w-5 text-blue-400" />
        )}
        <h3 className="text-xl font-medium gold-gradient">
          {title}
        </h3>
        <Badge variant="outline" className="ml-2 silver-accent">
          {selectedDrinks.length}/{count}
        </Badge>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30 mx-auto"></div>
          <p className="mt-3 text-sm text-zinc-400">Carregando bebidas...</p>
        </div>
      ) : drinks.length === 0 ? (
        <div className="text-center py-8 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
          <p className="text-zinc-400">Nenhuma bebida encontrada nesta categoria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drinks.map((drink) => {
            const isSelected = selectedDrinks.includes(drink.id);
            const isDisabled = !isSelected && selectedDrinks.length >= count;
            const hasImage = !!drink.image_url;
            
            return (
              <Card 
                key={drink.id} 
                className={cn("rounded-lg transition-all hover:translate-y-[-2px]", {
                  "ring-2 ring-amber-500/70 border-amber-500/40 silver-card-premium": isSelected && type === 'alcoholic',
                  "silver-card-premium": !isSelected && type === 'alcoholic',
                  "ring-2 ring-blue-500/70 border-blue-500/40 silver-card": isSelected && type === 'non-alcoholic',
                  "silver-card": !isSelected && type === 'non-alcoholic',
                  "opacity-60": isDisabled
                })}
              >
                <CardContent className="p-0">
                  <div className="flex items-center p-4">
                    <Checkbox 
                      id={`${type}-${drink.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleCheckChange(checked, drink.id)}
                      disabled={isDisabled}
                      className={cn("mr-3", {
                        "cursor-not-allowed": isDisabled
                      })}
                    />
                    
                    {hasImage && type === 'alcoholic' ? (
                      <div className="h-12 w-12 rounded-full overflow-hidden mr-3 border border-amber-500/30">
                        <img 
                          src={drink.image_url!} 
                          alt={drink.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback para ícone em caso de erro de imagem
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentNode as HTMLElement;
                            if (parent) {
                              parent.innerHTML = '<div class="h-full w-full flex items-center justify-center bg-amber-900/30"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><line x1="8" y1="22" x2="16" y2="22"></line><line x1="12" y1="11" x2="12" y2="17"></line><path d="M20 11A8 7 0 1 0 4 11"></path><path d="M17 11h1"></path><path d="M6 11h1"></path></svg></div>';
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full mr-3 flex items-center justify-center border border-zinc-700/50"
                           style={{
                             background: type === 'alcoholic' ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.3), rgba(146, 64, 14, 0.2))' : 'linear-gradient(135deg, rgba(30, 58, 138, 0.3), rgba(37, 99, 235, 0.2))'
                           }}>
                        {type === 'alcoholic' ? (
                          <Wine className="h-6 w-6 text-amber-500/70" />
                        ) : (
                          <Coffee className="h-6 w-6 text-blue-400/70" />
                        )}
                      </div>
                    )}
                    
                    <label 
                      htmlFor={`${type}-${drink.id}`} 
                      className={cn("flex-1", {
                        "cursor-not-allowed": isDisabled,
                        "cursor-pointer": !isDisabled
                      })}
                    >
                      <h4 className="font-medium text-white">{drink.name}</h4>
                      <p className="text-sm text-zinc-400 line-clamp-2">{drink.description}</p>
                    </label>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DrinkSelector;
