
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const { register, handleSubmit, watch } = useForm<DrinkFormData>();
  const isAlcoholic = watch("is_alcoholic", true);

  const onSubmit = async (data: DrinkFormData) => {
    try {
      setIsSubmitting(true);
      let image_url = null;

      if (isAlcoholic && data.image?.[0]) {
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

      toast.success("Drink cadastrado com sucesso!");
      onComplete();
    } catch (error) {
      toast.error("Erro ao cadastrar drink");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Drink</Label>
        <Input 
          id="name" 
          {...register("name", { required: true })}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea 
          id="description" 
          {...register("description", { required: true })}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="is_alcoholic" 
          {...register("is_alcoholic")}
          defaultChecked
        />
        <Label htmlFor="is_alcoholic">Drink Alcoólico</Label>
      </div>

      {isAlcoholic && (
        <div>
          <Label htmlFor="image">Foto do Drink</Label>
          <Input 
            id="image" 
            type="file" 
            accept="image/*"
            {...register("image")}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar Drink"}
      </Button>
    </form>
  );
};

export default DrinkForm;
