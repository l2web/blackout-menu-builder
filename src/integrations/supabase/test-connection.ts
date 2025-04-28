import { supabase } from './client';

/**
 * Testa a conexão com o Supabase
 */
async function testSupabaseConnection() {
  try {
    // Tenta fazer uma consulta simples para testar a conexão
    const { data, error } = await supabase.from('drinks').select('id').limit(1);
    
    if (error) {
      console.error('Erro ao conectar com o Supabase:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('Conexão com o Supabase estabelecida com sucesso!');
    console.log('Dados de teste:', data);
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro inesperado ao testar conexão com Supabase:', error);
    return { success: false, error };
  }
}

export { testSupabaseConnection }; 