import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Scroll, Calendar, Coffee, Wine } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePDFV2 } from "@/utils/pdfGenerator";
import { deleteMenuViaRPC } from "@/utils/deleteMenuRPC";

interface Menu {
  id: string;
  name: string;
  created_at: string;
  drinks_count?: number;
  pdf_url?: string;
}

interface MenuWithDrinks extends Menu {
  drinks?: {
    id: string;
    name: string;
    is_alcoholic: boolean;
    image_url: string | null;
  }[];
}

const MenuList = () => {
  const [menus, setMenus] = useState<MenuWithDrinks[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMenus = async () => {
    setIsLoading(true);
    // Buscar menus básicos primeiro
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erro ao buscar menus:", error);
      toast.error("Erro ao carregar menus salvos.");
      setIsLoading(false);
      return;
    }
    
    if (!data || data.length === 0) {
      setMenus([]);
      setIsLoading(false);
      return;
    }
    
    // Enriquecer os dados com a contagem de drinks
    const menusWithCounts = await Promise.all(data.map(async (menu) => {
      // Buscar drinks do menu
      const { data: drinkRelations, error: drinkRelationsError } = await supabase
        .from('menu_drinks')
        .select(`
          drinks:drink_id (
            id,
            name,
            is_alcoholic,
            image_url
          )
        `)
        .eq('menu_id', menu.id)
        .order('display_order')
        .limit(5);
        
      if (drinkRelationsError) {
        console.error("Erro ao buscar drinks do menu:", drinkRelationsError);
        return { 
          ...menu, 
          drinks_count: 0 
        };
      }
      
      // Extrair os drinks dos relacionamentos
      const drinks = drinkRelations
        ?.map(relation => relation.drinks)
        .filter(drink => drink !== null);
      
      return {
        ...menu,
        drinks_count: drinks?.length || 0,
        drinks: drinks
      };
    }));
    
    setMenus(menusWithCounts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleGeneratePDF = async (menuId: string, menuName: string) => {
    try {
      // Buscar todos os drinks do menu com detalhes
      const { data: menuDrinks, error: menuDrinksError } = await supabase
        .from("menu_drinks")
        .select(`
          display_order,
          drink_id,
          drinks:drink_id (
            id,
            name,
            description,
            is_alcoholic,
            image_url
          )
        `)
        .eq("menu_id", menuId)
        .order("display_order");

      if (menuDrinksError) {
        throw menuDrinksError;
      }
      if (!menuDrinks || menuDrinks.length === 0) {
        toast.info("Este menu não possui drinks para gerar o PDF.");
        return;
      }

      // Mostrar toast informando o usuário
      toast.loading("Gerando o PDF do cardápio, aguarde...");

      // Gerar PDF e fazer download diretamente
      await generatePDFV2(menuName, menuDrinks, menuId);
      
      toast.dismiss();
      toast.success("PDF gerado com sucesso! Verifique o download.");
      
      // Não precisamos mais atualizar o menu na lista local, pois não salvamos mais no Supabase
      // Também não precisamos mais abrir o PDF numa nova aba, pois a função já faz isso automaticamente

    } catch (error: any) {
      toast.dismiss();
      console.error("Erro ao gerar PDF:", error);
      toast.error(error?.message || "Erro ao gerar o PDF do menu");
    }
  };

  const handleDeleteMenu = async (menuId: string, menuName: string) => {
    try {
      console.log("Iniciando processo de exclusão do menu:", menuId);
      
      // Nova abordagem usando função RPC
      const rpcResult = await deleteMenuViaRPC(menuId);
      
      if (rpcResult.success) {
        toast.success(`Menu "${menuName}" excluído com sucesso!`);
        // Atualizar a lista removendo o menu excluído
        setMenus(currentMenus => currentMenus.filter(menu => menu.id !== menuId));
        return;
      }
      
      // Se a RPC falhar, tentamos a abordagem tradicional com múltiplas tentativas
      console.log("RPC falhou, tentando abordagem alternativa:", rpcResult.message);
      
      // 1. Primeira tentativa: excluir relacionamentos na tabela menu_drinks
      console.log("Tentando excluir os relacionamentos menu_drinks...");
      let drinksError;
      
      try {
        // Primeiro com filter
        const result1 = await supabase
          .from('menu_drinks')
          .delete()
          .filter('menu_id', 'eq', menuId);
          
        drinksError = result1.error;
        
        if (drinksError) {
          console.log("Primeira tentativa falhou, tentando com eq()...");
          
          // Se falhar, tentar com eq
          const result2 = await supabase
            .from('menu_drinks')
            .delete()
            .eq('menu_id', menuId);
            
          drinksError = result2.error;
          
          if (drinksError) {
            console.log("Segunda tentativa falhou, tentando com in()...");
            
            // Se ainda falhar, tentar com in
            const result3 = await supabase
              .from('menu_drinks')
              .delete()
              .in('menu_id', [menuId]);
              
            drinksError = result3.error;
          }
        }
      } catch (err) {
        console.error("Erro ao tentar excluir relacionamentos:", err);
        drinksError = err;
      }
      
      if (drinksError) {
        console.error("Todas as tentativas de excluir drinks do menu falharam:", drinksError);
        throw drinksError;
      }
      
      console.log("Drinks do menu excluídos com sucesso ou não existiam");

      // Aguardar um momento para sincronização
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 2. Tentativa de excluir o menu principal
      console.log("Tentando excluir o menu principal...");
      let menuError;
      
      try {
        // Primeiro com filter
        const result1 = await supabase
          .from('menus')
          .delete()
          .filter('id', 'eq', menuId);
          
        menuError = result1.error;
        
        if (menuError) {
          console.log("Primeira tentativa falhou, tentando com eq()...");
          
          // Se falhar, tentar com eq
          const result2 = await supabase
            .from('menus')
            .delete()
            .eq('id', menuId);
            
          menuError = result2.error;
          
          if (menuError) {
            console.log("Segunda tentativa falhou, tentando com in()...");
            
            // Se ainda falhar, tentar com in
            const result3 = await supabase
              .from('menus')
              .delete()
              .in('id', [menuId]);
              
            menuError = result3.error;
          }
        }
      } catch (err) {
        console.error("Erro ao tentar excluir menu:", err);
        menuError = err;
      }

      if (menuError) {
        console.error("Todas as tentativas de excluir o menu falharam:", menuError);
        throw menuError;
      }
      
      console.log("Menu excluído com sucesso");

      // 3. Verificar se a exclusão funcionou
      const { data: checkMenu } = await supabase
        .from('menus')
        .select('id')
        .eq('id', menuId);
        
      if (checkMenu && checkMenu.length > 0) {
        console.warn("Menu ainda existe após tentativa de exclusão!");
        toast.warning("O menu parece ainda existir no banco de dados. Tente novamente mais tarde.");
      } else {
        console.log("Verificação confirmou que o menu foi excluído");
        toast.success(`Menu "${menuName}" excluído com sucesso!`);
        // Atualizar a lista removendo o menu excluído
        setMenus(currentMenus => currentMenus.filter(menu => menu.id !== menuId));
      }
      
    } catch (error: any) {
      console.error("Erro detalhado ao excluir menu:", error);
      
      // Tentar ler mais informações sobre o erro
      console.log("Código do erro:", error?.code);
      console.log("Mensagem do erro:", error?.message);
      console.log("Detalhes do erro:", error?.details);
      console.log("Dica do erro:", error?.hint);
      
      const errorMessage = error?.message || "Erro ao excluir o menu.";
      const errorCode = error?.code || "UNKNOWN_ERROR";
      
      if (errorCode === '22P02') {
        toast.error("ID do menu inválido. Formato incorreto.");
      } else if (errorCode === '23503') {
        toast.error("Não é possível excluir este menu porque ele está sendo referenciado em outra parte do sistema.");
      } else if (errorCode === '42501' || errorMessage.includes('permission denied')) {
        toast.error("Sem permissão para excluir este menu. Verifique suas credenciais.");
      } else {
        toast.error(`Erro: ${errorMessage}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto"></div>
        <p className="mt-4 text-zinc-400">Carregando seus menus...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 gold-gradient">Menus Disponíveis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.map((menu) => (
          <Card key={menu.id} className="silver-card-premium shine-effect rounded-xl overflow-hidden flex flex-col">
            <div className="h-28 bg-gradient-to-r from-amber-900/30 to-amber-700/20 flex items-center justify-center relative">
              <Scroll size={48} className="text-amber-500/60" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent"></div>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="text-xl font-semibold gold-gradient line-clamp-1">{menu.name}</h3>
              </div>
            </div>
            
            <CardContent className="p-5 flex-grow">
              <div className="flex items-center mb-4">
                <Calendar size={16} className="text-zinc-400 mr-2" />
                <p className="text-sm text-zinc-400">
                  Criado em: {new Date(menu.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              {menu.drinks_count > 0 ? (
                <div className="mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-sm text-zinc-300 font-medium">Drinks incluídos:</span>
                    <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                      {menu.drinks_count}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    {menu.drinks?.slice(0, 4).map((drink, index) => (
                      <div 
                        key={drink.id} 
                        className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 -ml-2 first:ml-0"
                        style={{ zIndex: 10 - index }}
                      >
                        {drink.image_url ? (
                          <img 
                            src={drink.image_url} 
                            alt={drink.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            {drink.is_alcoholic ? (
                              <Wine size={14} className="text-amber-500/70" />
                            ) : (
                              <Coffee size={14} className="text-blue-400/70" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {menu.drinks_count > 4 && (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 -ml-2 border border-zinc-700">
                        +{menu.drinks_count - 4}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-500 mb-4">
                  Este menu não contém drinks
                </div>
              )}
            </CardContent>
            
            <div className="p-4 pt-0 border-t border-zinc-700/30 flex justify-between items-center gap-2">
              <Button 
                className="flex-grow bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-zinc-900 font-medium"
                onClick={() => handleGeneratePDF(menu.id, menu.name)}
              >
                <FileText size={16} className="mr-2" />
                Gerar PDF
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                    <Trash2 size={16} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-effect border-zinc-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o menu "{menu.name}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteMenu(menu.id, menu.name)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Excluir Permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}

        {menus.length === 0 && (
          <div className="col-span-full glass-effect text-center py-12 rounded-xl">
            <Scroll className="mx-auto h-16 w-16 mb-4 text-amber-500/40" />
            <p className="text-xl font-medium mb-2 silver-accent">Nenhum menu criado ainda</p>
            <p className="text-zinc-400 max-w-md mx-auto">
              Crie seu primeiro menu personalizado clicando em "Criar Novo Menu" e comece a impressionar seus clientes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuList;
