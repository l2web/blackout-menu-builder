import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wine, Coffee } from "lucide-react";

interface DrinkFormProps {
  onComplete: () => void;
}

interface DrinkFormData {
  name: string;
  description: string;
  is_alcoholic: boolean;
  image?: FileList;
}

const DrinkForm = ({ onComplete }: DrinkFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DrinkFormData>({
    defaultValues: {
      is_alcoholic: true
    }
  });
  const isAlcoholic = watch("is_alcoholic", true);

  const onSubmit = async (data: DrinkFormData) => {
    try {
      setIsSubmitting(true);
      let image_url = null;

      // Se for alcoólico, a imagem é obrigatória
      if (isAlcoholic) {
        if (!data.image?.[0]) {
          toast.error("Foto é obrigatória para drinks alcoólicos");
          setIsSubmitting(false);
          return;
        }

        const file = data.image[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('drink-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('drink-images')
          .getPublicUrl(fileName);

        image_url = publicUrl;
      }

      const { error } = await supabase
        .from('drinks')
        .insert({
          name: data.name,
          description: data.description,
          is_alcoholic: isAlcoholic,
          image_url
        });

      if (error) throw error;

      toast.success(`${isAlcoholic ? "Drink alcoólico" : "Drink não alcoólico"} cadastrado com sucesso!`);
      onComplete();
    } catch (error) {
      toast.error(`Erro ao cadastrar ${isAlcoholic ? "drink alcoólico" : "drink não alcoólico"}`);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-6 flex items-center gap-4">
        <div 
          className={`flex-1 p-4 rounded-lg ${isAlcoholic ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-blue-500/10 border border-blue-500/30'} cursor-pointer`}
          onClick={() => setValue("is_alcoholic", true)}
        >
          <div className="flex items-center gap-2">
            <Wine size={24} className={`${isAlcoholic ? 'text-amber-500' : 'text-amber-500/40'}`} />
            <div>
              <h3 className={`font-medium ${isAlcoholic ? 'text-amber-300' : 'text-zinc-400'}`}>Drink Alcoólico</h3>
              <p className="text-xs text-zinc-500">Com foto obrigatória</p>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Checkbox 
              id="is_alcoholic_yes" 
              checked={isAlcoholic}
              onCheckedChange={() => setValue("is_alcoholic", true)}
            />
          </div>
        </div>
        
        <div 
          className={`flex-1 p-4 rounded-lg ${!isAlcoholic ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-500/5 border border-blue-500/20'} cursor-pointer`}
          onClick={() => setValue("is_alcoholic", false)}
        >
          <div className="flex items-center gap-2">
            <Coffee size={24} className={`${!isAlcoholic ? 'text-blue-400' : 'text-blue-400/40'}`} />
            <div>
              <h3 className={`font-medium ${!isAlcoholic ? 'text-blue-300' : 'text-zinc-400'}`}>Drink Não Alcoólico</h3>
              <p className="text-xs text-zinc-500">Sem foto</p>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Checkbox 
              id="is_alcoholic_no" 
              checked={!isAlcoholic}
              onCheckedChange={() => setValue("is_alcoholic", false)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="name">Nome do {isAlcoholic ? "Drink" : "Drink Não Alcoólico"}</Label>
        <Input 
          id="name" 
          {...register("name", { required: true })}
          className="bg-zinc-800 border-zinc-700"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">Nome é obrigatório</p>}
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea 
          id="description" 
          {...register("description", { required: true })}
          className="bg-zinc-800 border-zinc-700"
        />
        {errors.description && <p className="text-sm text-red-500 mt-1">Descrição é obrigatória</p>}
      </div>

      {isAlcoholic && (
        <div>
          <Label htmlFor="image" className="flex items-center">
            Foto do Drink 
            <span className="text-red-400 ml-1">*</span>
            <span className="text-xs text-zinc-500 ml-2">(Obrigatório para drinks alcoólicos)</span>
          </Label>
          <Input 
            id="image" 
            type="file" 
            accept="image/*"
            {...register("image", { required: isAlcoholic })}
            className="bg-zinc-800 border-zinc-700"
          />
          {errors.image && <p className="text-sm text-red-500 mt-1">Foto é obrigatória para drinks alcoólicos</p>}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={isSubmitting}
        className={isAlcoholic ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}
      >
        {isSubmitting ? "Salvando..." : `Salvar ${isAlcoholic ? "Drink" : "Drink Não Alcoólico"}`}
      </Button>
    </form>
  );
};

export default DrinkForm;
