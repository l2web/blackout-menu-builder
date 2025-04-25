
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DrinkSelector from "@/components/DrinkSelector";
import { generatePDF } from "@/utils/pdfGenerator";

const menuFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  alcoholicCount: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "Quantidade deve ser um número válido",
  }),
  nonAlcoholicCount: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "Quantidade deve ser um número válido",
  }),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

interface MenuFormProps {
  onComplete: () => void;
}

const MenuForm = ({ onComplete }: MenuFormProps) => {
  const [step, setStep] = useState(1);
  const [selectedAlcoholicDrinks, setSelectedAlcoholicDrinks] = useState<string[]>([]);
  const [selectedNonAlcoholicDrinks, setSelectedNonAlcoholicDrinks] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      name: "",
      alcoholicCount: "4",
      nonAlcoholicCount: "2",
    },
  });

  const onSubmit = async (values: MenuFormValues) => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      try {
        const alcoholicCount = parseInt(values.alcoholicCount);
        const nonAlcoholicCount = parseInt(values.nonAlcoholicCount);

        // Verificar se o número correto de drinks foi selecionado
        if (selectedAlcoholicDrinks.length !== alcoholicCount) {
          toast.error(`Selecione exatamente ${alcoholicCount} drinks alcoólicos`);
          return;
        }

        if (selectedNonAlcoholicDrinks.length !== nonAlcoholicCount) {
          toast.error(`Selecione exatamente ${nonAlcoholicCount} drinks não alcoólicos`);
          return;
        }

        setIsGenerating(true);

        // Salvar o menu no banco de dados
        const { data: menuData, error: menuError } = await supabase
          .from("menus")
          .insert({ name: values.name })
          .select("id")
          .single();

        if (menuError) {
          toast.error("Erro ao criar menu");
          console.error(menuError);
          setIsGenerating(false);
          return;
        }

        // Adicionar os drinks ao menu
        const menuDrinks = [
          ...selectedAlcoholicDrinks.map((id, index) => ({
            menu_id: menuData.id,
            drink_id: id,
            display_order: index + 1,
          })),
          ...selectedNonAlcoholicDrinks.map((id, index) => ({
            menu_id: menuData.id,
            drink_id: id,
            display_order: selectedAlcoholicDrinks.length + index + 1,
          })),
        ];

        const { error: menuDrinksError } = await supabase
          .from("menu_drinks")
          .insert(menuDrinks);

        if (menuDrinksError) {
          toast.error("Erro ao adicionar drinks ao menu");
          console.error(menuDrinksError);
          setIsGenerating(false);
          return;
        }

        // Gerar PDF
        await generateMenuPDF(menuData.id, values.name);
        
        toast.success("Menu criado com sucesso!");
        setIsGenerating(false);
        onComplete();
      } catch (error) {
        console.error("Erro ao criar menu:", error);
        toast.error("Ocorreu um erro ao criar o menu");
        setIsGenerating(false);
      }
    }
  };

  const generateMenuPDF = async (menuId: string, menuName: string) => {
    try {
      // Buscar todos os drinks selecionados com detalhes
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

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF do menu");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Nome do Menu</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Menu de Verão" 
                      {...field} 
                      className="bg-zinc-800 border-zinc-700" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="alcoholicCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Quantidade de Drinks Alcoólicos</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Selecione a quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nonAlcoholicCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Quantidade de Drinks Não Alcoólicos</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-zinc-800 border-zinc-700">
                          <SelectValue placeholder="Selecione a quantidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit">Próximo</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Selecione os Drinks</h3>
              <p className="text-zinc-400">
                Escolha {form.getValues("alcoholicCount")} drinks alcoólicos e {form.getValues("nonAlcoholicCount")} drinks não alcoólicos para o seu menu.
              </p>
            </div>

            <DrinkSelector 
              alcoholicCount={parseInt(form.getValues("alcoholicCount"))}
              nonAlcoholicCount={parseInt(form.getValues("nonAlcoholicCount"))}
              onAlcoholicDrinksSelected={setSelectedAlcoholicDrinks}
              onNonAlcoholicDrinksSelected={setSelectedNonAlcoholicDrinks}
            />
            
            <div className="flex justify-between mt-6">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Gerando Menu..." : "Gerar Menu"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Form>
  );
};

export default MenuForm;
