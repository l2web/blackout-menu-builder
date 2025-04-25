
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePDF } from "@/utils/pdfGenerator";

interface Menu {
  id: string;
  name: string;
  created_at: string;
}

const MenuList = () => {
  const [menus, setMenus] = useState<Menu[]>([]);

  useEffect(() => {
    const fetchMenus = async () => {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setMenus(data);
      }
    };

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

      // Gerar PDF
      await generatePDF(menuName, menuDrinks);
      toast.success("PDF gerado com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF do menu");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Menus Salvos</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.map((menu) => (
          <Card key={menu.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">{menu.name}</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Criado em: {new Date(menu.created_at).toLocaleDateString('pt-BR')}
              </p>
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleGeneratePDF(menu.id, menu.name)}
              >
                <FileText size={16} />
                Baixar PDF
              </Button>
            </CardContent>
          </Card>
        ))}

        {menus.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-400">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg">Nenhum menu criado ainda.</p>
            <p className="mt-2">Crie seu primeiro menu clicando em "Criar Novo Menu".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuList;
