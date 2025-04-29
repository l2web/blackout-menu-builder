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
import { generatePDFV3, cleanupPreviousPdfs } from "@/utils/pdfGeneratorV3";

// Constantes para os limites
const MIN_ALCOHOLIC = 1;
const MAX_ALCOHOLIC = 6;
const MIN_NON_ALCOHOLIC = 1;
const MAX_NON_ALCOHOLIC = 3;

const menuFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  alcoholicCount: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= MIN_ALCOHOLIC && num <= MAX_ALCOHOLIC;
    },
    {
      message: `Quantidade deve ser entre ${MIN_ALCOHOLIC} e ${MAX_ALCOHOLIC} drinks`,
    }
  ),
  nonAlcoholicCount: z.string().refine(
    (val) => {
      const num = parseInt(val);
      return !isNaN(num) && num >= MIN_NON_ALCOHOLIC && num <= MAX_NON_ALCOHOLIC;
    },
    {
      message: `Quantidade deve ser entre ${MIN_NON_ALCOHOLIC} e ${MAX_NON_ALCOHOLIC} drinks`,
    }
  ),
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
      alcoholicCount: MIN_ALCOHOLIC.toString(),
      nonAlcoholicCount: MIN_NON_ALCOHOLIC.toString(),
    },
  });

  const handleNextStep = () => {
    if (step === 2) {
      const alcoholicCountNum = parseInt(form.getValues("alcoholicCount"));
      if (selectedAlcoholicDrinks.length !== alcoholicCountNum) {
        toast.error(`Selecione exatamente ${alcoholicCountNum} drinks alcoólicos.`);
        return;
      }
      setStep(3);
    }
  };

  const onSubmit = async (values: MenuFormValues) => {
    if (step === 1) {
       const alcoholicCountNum = parseInt(values.alcoholicCount);
       const nonAlcoholicCountNum = parseInt(values.nonAlcoholicCount);
       
       // Validar as quantidades de acordo com as regras
       if (alcoholicCountNum < MIN_ALCOHOLIC || alcoholicCountNum > MAX_ALCOHOLIC) {
         toast.error(`Selecione entre ${MIN_ALCOHOLIC} e ${MAX_ALCOHOLIC} drinks alcoólicos.`);
         return;
       }
       
       if (nonAlcoholicCountNum < MIN_NON_ALCOHOLIC || nonAlcoholicCountNum > MAX_NON_ALCOHOLIC) {
         toast.error(`Selecione entre ${MIN_NON_ALCOHOLIC} e ${MAX_NON_ALCOHOLIC} drinks não alcoólicos.`);
         return;
       }
       
       setStep(2);
       return;
    }

    if (step === 3) {
      try {
        setIsGenerating(true);
        const alcoholicCountNum = parseInt(values.alcoholicCount);
        const nonAlcoholicCountNum = parseInt(values.nonAlcoholicCount);

        // Validar seleção de drinks
        if (selectedAlcoholicDrinks.length !== alcoholicCountNum) {
          toast.error(`Selecione exatamente ${alcoholicCountNum} drinks alcoólicos.`);
          setStep(2);
          setIsGenerating(false);
          return;
        }

        if (selectedNonAlcoholicDrinks.length !== nonAlcoholicCountNum) {
          toast.error(`Selecione exatamente ${nonAlcoholicCountNum} drinks não alcoólicos.`);
          setIsGenerating(false);
          return;
        }

        const { data: menuData, error: menuError } = await supabase
          .from("menus")
          .insert({ name: values.name })
          .select("id")
          .single();

        if (menuError) throw menuError;

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

        if (menuDrinks.length > 0) {
            const { error: menuDrinksError } = await supabase
              .from("menu_drinks")
              .insert(menuDrinks);
             if (menuDrinksError) throw menuDrinksError;
        }

        await generateMenuPDF(menuData.id, values.name);

        toast.success("Menu criado com sucesso!");
        onComplete();

      } catch (error: any) {
        console.error("Erro ao criar menu:", error);
        toast.error(error?.message || "Ocorreu um erro ao criar o menu");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  // Função que limpa cache e só depois gera o PDF
  const generatePDFWithCleanup = async (menuName: string, menuDrinks: any[], menuId?: string) => {
    console.log(`🧹 Limpando cache antes de gerar PDF para: ${menuName}`);
    // Limpar qualquer cache existente antes
    cleanupPreviousPdfs();
    
    // Adicionar pequeno delay para garantir limpeza
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Gerar o PDF com a nova versão
    return generatePDFV3(menuName, menuDrinks, menuId);
  }

  const generateMenuPDF = async (menuId: string, menuName: string) => {
    try {
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

      if (menuDrinksError) throw menuDrinksError;

      if (menuDrinks && menuDrinks.length > 0) {
        // Mostrar toast informando o usuário
        toast.loading("Gerando o PDF do cardápio, aguarde...");
        
        // Gerar PDF e fazer download diretamente
        await generatePDFWithCleanup(menuName, menuDrinks, menuId);
        
        toast.dismiss();
        toast.success("PDF gerado com sucesso! Verifique o download.");
        
        // Não precisamos mais abrir o PDF numa nova aba, pois a função já faz isso automaticamente
      } else {
        toast.info("Menu salvo, mas PDF não gerado pois não há drinks selecionados.");
      }

    } catch (error: any) {
      toast.dismiss();
      console.error("Erro ao gerar PDF:", error);
      toast.error(error?.message || "Erro ao gerar o PDF do menu");
    }
  };

  const getAlcoholicCount = () => parseInt(form.getValues("alcoholicCount") || MIN_ALCOHOLIC.toString());
  const getNonAlcoholicCount = () => parseInt(form.getValues("nonAlcoholicCount") || MIN_NON_ALCOHOLIC.toString());

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
                          {Array.from({ length: MAX_ALCOHOLIC - MIN_ALCOHOLIC + 1 }, (_, i) => MIN_ALCOHOLIC + i).map((num) => (
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
                          {Array.from({ length: MAX_NON_ALCOHOLIC - MIN_NON_ALCOHOLIC + 1 }, (_, i) => MIN_NON_ALCOHOLIC + i).map((num) => (
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
              <h3 className="text-xl font-semibold mb-2">Selecione os Drinks Alcoólicos</h3>
              <p className="text-zinc-400">
                Escolha {getAlcoholicCount()} drinks alcoólicos para o seu menu.
              </p>
            </div>
            <DrinkSelector 
              type="alcoholic"
              count={getAlcoholicCount()}
              selectedDrinks={selectedAlcoholicDrinks}
              onSelect={setSelectedAlcoholicDrinks}
            />
            
            <div className="flex justify-between mt-6">
              <Button type="button" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="button" onClick={handleNextStep}>
                Próximo (Não Alcoólicos)
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
             <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Selecione os Drinks Não Alcoólicos</h3>
               <p className="text-zinc-400">
                 Escolha {getNonAlcoholicCount()} drinks não alcoólicos para o seu menu.
               </p>
            </div>
            <DrinkSelector 
              type="non-alcoholic"
              count={getNonAlcoholicCount()}
              selectedDrinks={selectedNonAlcoholicDrinks}
              onSelect={setSelectedNonAlcoholicDrinks}
            />
            
            <div className="flex justify-between mt-6">
               <Button 
                type="button" 
                onClick={() => setStep(2)}
              >
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
