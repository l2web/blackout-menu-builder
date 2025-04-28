import { supabase } from "@/integrations/supabase/client";

/**
 * Função para deletar um menu usando uma chamada RPC direta ao PostgreSQL
 * 
 * Esta abordagem contorna as políticas RLS padrão do Supabase e executa
 * operações SQL diretamente, com as permissões de serviço
 */
export async function deleteMenuViaRPC(menuId: string): Promise<{
  success: boolean;
  message: string;
  error?: any;
}> {
  try {
    console.log("Tentando excluir menu via RPC direta:", menuId);
    
    // Chamada RPC que executa um SQL direto para excluir o menu e seus relacionamentos
    // @ts-ignore - A função RPC pode não estar definida ainda no tipo, mas será criada no Supabase
    const { data, error } = await supabase.rpc('delete_menu_complete', {
      menu_id_param: menuId
    });
    
    if (error) throw error;
    
    console.log("Resposta da função RPC:", data);
    
    return {
      success: true,
      message: `Menu excluído com sucesso via RPC.`
    };
  } catch (error: any) {
    console.error("Erro ao excluir menu via RPC:", error);
    
    // Se a função RPC não existir, sugerimos como criá-la
    if (error.code === "PGRST301" || error.message?.includes("function not found")) {
      return {
        success: false,
        message: "Função RPC 'delete_menu_complete' não encontrada no Supabase. " +
                "Você precisa criar esta função no Console do Supabase.",
        error
      };
    }
    
    return {
      success: false,
      message: error.message || "Erro desconhecido ao excluir o menu",
      error
    };
  }
} 