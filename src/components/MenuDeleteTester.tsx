import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ReloadIcon, CopyIcon } from "@radix-ui/react-icons";
import { deleteMenuViaRPC } from "@/utils/deleteMenuRPC";

// Importar as constantes diretamente do arquivo de configuração do cliente
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

// Função para validar se uma string é um UUID válido
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

interface Menu {
  id: string;
  name: string;
  created_at: string;
}

export default function MenuDeleteTester() {
  const [menuId, setMenuId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
  } | null>(null);
  const [policies, setPolicies] = useState<any>(null);
  const [roles, setRoles] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [isLoadingRPC, setIsLoadingRPC] = useState(false);
  const [rpcResult, setRPCResult] = useState<{
    success?: boolean;
    message?: string;
    error?: any;
  } | null>(null);

  // Buscar a lista de menus para o usuário escolher
  const fetchMenus = async () => {
    setIsLoadingMenus(true);
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setMenus(data || []);
    } catch (error) {
      console.error("Erro ao carregar menus:", error);
      toast.error("Falha ao carregar a lista de menus");
    } finally {
      setIsLoadingMenus(false);
    }
  };
  
  // Carregar menus quando o componente montar
  useEffect(() => {
    fetchMenus();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("ID copiado para a área de transferência"))
      .catch(() => toast.error("Erro ao copiar ID"));
  };

  const selectMenu = (id: string) => {
    setMenuId(id);
  };

  const testMenuDeletion = async () => {
    if (!menuId) {
      toast.error("Por favor, informe o ID do menu");
      return;
    }

    // Validar se o ID é um UUID válido
    if (!isValidUUID(menuId)) {
      setResult({
        success: false,
        message: `Erro: O ID fornecido não é um UUID válido. O formato deve ser como: "123e4567-e89b-12d3-a456-426614174000"`,
        details: { error: { message: "ID inválido", code: "INVALID_UUID" } }
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // 1. Primeiro verificar se o menu existe
      const { data: menuData, error: menuCheckError } = await supabase
        .from('menus')
        .select('id, name')
        .eq('id', menuId)
        .single();

      if (menuCheckError) {
        if (menuCheckError.code === 'PGRST116') {
          setResult({
            success: false,
            message: `Menu com ID ${menuId} não encontrado`,
          });
          return;
        }
        throw menuCheckError;
      }

      // 2. Verificar entradas em menu_drinks antes da deleção
      const { data: menuDrinksBefore, error: drinkCheckError } = await supabase
        .from('menu_drinks')
        .select('*')
        .eq('menu_id', menuId);

      if (drinkCheckError) throw drinkCheckError;

      // 3. Tentar deletar entradas em menu_drinks com a nova abordagem
      const { data: deletedDrinks, error: drinksError } = await supabase
        .from('menu_drinks')
        .delete()
        .filter('menu_id', 'eq', menuId)
        .select();
      
      if (drinksError) throw drinksError;
      
      // Aguardar um momento para garantir que o banco de dados processou a deleção dos relacionamentos
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Deletar o menu principal com a nova abordagem
      const { data: deletedMenu, error: menuError } = await supabase
        .from('menus')
        .delete()
        .filter('id', 'eq', menuId)
        .select();

      if (menuError) throw menuError;

      // Aguardar um momento para garantir que o banco de dados processou as deleções
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Verificar se o menu ainda existe após a tentativa de deleção
      const { data: menuAfter, error: menuCheckAfterError } = await supabase
        .from('menus')
        .select('id, name')
        .eq('id', menuId);

      // Verificar se há entradas em menu_drinks após a tentativa de deleção
      const { data: menuDrinksAfter, error: drinkCheckAfterError } = await supabase
        .from('menu_drinks')
        .select('*')
        .eq('menu_id', menuId);

      if (menuCheckAfterError) throw menuCheckAfterError;
      if (drinkCheckAfterError) throw drinkCheckAfterError;

      setResult({
        success: (!menuAfter || menuAfter.length === 0) && (!menuDrinksAfter || menuDrinksAfter.length === 0),
        message: (!menuAfter || menuAfter.length === 0) && (!menuDrinksAfter || menuDrinksAfter.length === 0)
          ? `Menu "${menuData.name}" (ID: ${menuId}) excluído com sucesso`
          : `Falha ao excluir o menu completamente`,
        details: {
          menuData,
          menuDrinksBefore,
          deletedDrinks,
          deletedMenu,
          menuAfter,
          menuDrinksAfter
        }
      });
      
      // Atualizar a lista de menus após a exclusão bem-sucedida
      if (!menuAfter || menuAfter.length === 0) {
        fetchMenus();
      }

    } catch (error: any) {
      console.error("Erro durante teste de deleção:", error);
      setResult({
        success: false,
        message: `Erro: ${error.message || "Erro desconhecido"}`,
        details: { error }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar permissões no Supabase
  const checkPermissions = async () => {
    setChecking(true);
    try {
      // Verificar permissões na tabela menus
      console.log("Verificando permissões...");
      
      // Verificar a sessão atual para saber com que papel o usuário está conectado
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Erro ao verificar sessão:", sessionError);
        setRoles({ error: sessionError });
      } else {
        setRoles(session);
        console.log("Sessão atual:", session);
      }
      
      // Tentar executar uma operação DELETE simulada (sem realmente excluir) para ver se há permissão
      const menusTestResult = await fetch(`${SUPABASE_URL}/rest/v1/menus?id=eq.${menuId}`, {
        method: 'OPTIONS',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      
      const menuDrinksTestResult = await fetch(`${SUPABASE_URL}/rest/v1/menu_drinks?menu_id=eq.${menuId}`, {
        method: 'OPTIONS',
        headers: {
          'apikey': SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      
      setPolicies({
        menus: {
          status: menusTestResult.status,
          headers: Object.fromEntries(menusTestResult.headers.entries()),
          body: await menusTestResult.text()
        },
        menu_drinks: {
          status: menuDrinksTestResult.status,
          headers: Object.fromEntries(menuDrinksTestResult.headers.entries()),
          body: await menuDrinksTestResult.text()
        }
      });
      
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      setPolicies({ error });
    } finally {
      setChecking(false);
    }
  };

  // Função para testar a exclusão via RPC
  const testDeleteViaRPC = async () => {
    if (!menuId) {
      toast.error("Por favor, informe o ID do menu");
      return;
    }

    // Validar se o ID é um UUID válido
    if (!isValidUUID(menuId)) {
      setRPCResult({
        success: false,
        message: `Erro: O ID fornecido não é um UUID válido.`,
        error: { message: "ID inválido", code: "INVALID_UUID" }
      });
      return;
    }

    setIsLoadingRPC(true);
    setRPCResult(null);

    try {
      // Verificar se o menu existe
      const { data: menuData, error: menuCheckError } = await supabase
        .from('menus')
        .select('id, name')
        .eq('id', menuId)
        .single();

      if (menuCheckError) {
        if (menuCheckError.code === 'PGRST116') {
          setRPCResult({
            success: false,
            message: `Menu com ID ${menuId} não encontrado`,
          });
          return;
        }
        throw menuCheckError;
      }

      // Chamar a função RPC
      const rpcResponse = await deleteMenuViaRPC(menuId);
      setRPCResult(rpcResponse);

      // Se for bem-sucedido, atualizar a lista de menus
      if (rpcResponse.success) {
        toast.success(`Menu "${menuData.name}" excluído com sucesso via RPC!`);
        fetchMenus();
      } else {
        toast.error(rpcResponse.message);
      }

    } catch (error: any) {
      console.error("Erro ao excluir via RPC:", error);
      setRPCResult({
        success: false,
        message: error.message || "Erro desconhecido",
        error
      });
    } finally {
      setIsLoadingRPC(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full max-w-lg mx-auto mb-6">
        <CardHeader>
          <CardTitle>Teste de Deleção de Menu</CardTitle>
          <CardDescription>
            Verifique se a deleção de menu está funcionando corretamente
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Menus Disponíveis</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Nome</th>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoadingMenus ? (
                      <tr>
                        <td colSpan={3} className="text-center py-4">
                          Carregando menus...
                        </td>
                      </tr>
                    ) : menus.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-4">
                          Nenhum menu encontrado
                        </td>
                      </tr>
                    ) : (
                      menus.map(menu => (
                        <tr key={menu.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-2">{menu.name}</td>
                          <td className="px-4 py-2 font-mono text-xs truncate max-w-[140px]">
                            {menu.id}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => selectMenu(menu.id)}
                                title="Usar este ID"
                              >
                                <ReloadIcon className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(menu.id)}
                                title="Copiar ID"
                              >
                                <CopyIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchMenus} 
              disabled={isLoadingMenus}
              className="w-full"
            >
              {isLoadingMenus ? "Atualizando..." : "Atualizar Lista"}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Testar Deleção</h3>
            <div className="flex gap-4">
              <Input
                value={menuId}
                onChange={(e) => setMenuId(e.target.value)}
                placeholder="ID do menu para deletar (formato UUID)"
                disabled={isLoading}
              />
              <Button
                onClick={testMenuDeletion}
                disabled={!menuId || isLoading}
              >
                {isLoading ? "Testando..." : "Testar Deleção"}
              </Button>
            </div>

            <div className="text-sm text-zinc-500">
              <p>O ID deve ser um UUID válido, como:</p>
              <code className="bg-zinc-100 px-1 py-0.5 rounded">123e4567-e89b-12d3-a456-426614174000</code>
            </div>
          </div>

          {/* Seção de verificação de permissões */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Verificar Permissões</h3>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={checkPermissions}
                disabled={checking || !menuId || !isValidUUID(menuId)}
                className="w-full"
              >
                {checking ? "Verificando..." : "Verificar Permissões"}
              </Button>
            </div>
            
            {(policies || roles) && (
              <Alert className="bg-blue-50">
                <AlertTitle>Informações de Permissões</AlertTitle>
                <AlertDescription>
                  <div className="mt-4">
                    <details>
                      <summary className="cursor-pointer font-semibold">Ver detalhes de permissões</summary>
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto max-h-[400px]">
                        <h4 className="font-semibold">Sessão/Papel do usuário:</h4>
                        <pre>{JSON.stringify(roles, null, 2)}</pre>
                        
                        <h4 className="font-semibold mt-4">Políticas de acesso:</h4>
                        <pre>{JSON.stringify(policies, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {result && (
            <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
              <AlertTitle>
                {result.success ? "Sucesso" : "Falha"}
              </AlertTitle>
              <AlertDescription>
                <p>{result.message}</p>
                
                {result.details && (
                  <div className="mt-4">
                    <details>
                      <summary className="cursor-pointer font-semibold">Ver detalhes técnicos</summary>
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto max-h-[400px]">
                        <pre>{JSON.stringify(result.details, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-lg mx-auto mb-6">
        <CardHeader>
          <CardTitle>Excluir via função RPC</CardTitle>
          <CardDescription>
            Método mais direto que contorna restrições de permissão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              value={menuId}
              onChange={(e) => setMenuId(e.target.value)}
              placeholder="ID do menu para deletar"
              disabled={isLoadingRPC}
            />
            <Button
              onClick={testDeleteViaRPC}
              disabled={!menuId || isLoadingRPC}
            >
              {isLoadingRPC ? "Excluindo..." : "Excluir via RPC"}
            </Button>
          </div>

          {rpcResult && (
            <Alert className={rpcResult.success ? "bg-green-50" : "bg-red-50"}>
              <AlertTitle>
                {rpcResult.success ? "Sucesso" : "Falha"}
              </AlertTitle>
              <AlertDescription>
                <p>{rpcResult.message}</p>
                
                {rpcResult.error && (
                  <div className="mt-4">
                    <details>
                      <summary className="cursor-pointer font-semibold">Ver detalhes técnicos</summary>
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto max-h-[400px]">
                        <pre>{JSON.stringify(rpcResult.error, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-2">Instruções para criar a função RPC:</h4>
            <p className="text-sm text-gray-600 mb-2">
              No console do Supabase, crie uma nova função SQL com o seguinte código:
            </p>
            <div className="text-xs font-mono p-2 bg-gray-100 rounded whitespace-pre-wrap overflow-auto">
{`CREATE OR REPLACE FUNCTION delete_menu_complete(menu_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Primeiro exclui os relacionamentos
  DELETE FROM menu_drinks WHERE menu_id = menu_id_param;
  
  -- Depois exclui o menu
  DELETE FROM menus WHERE id = menu_id_param;
  
  RETURN TRUE;
END;
$$;`}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Tente uma abordagem direta</CardTitle>
          <CardDescription>
            Caso o teste acima não funcione, tente uma deleção direta via SQL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Como último recurso, tente executar diretamente o SQL para excluir o menu e seus relacionamentos. 
            <br />Execute estes comandos no console SQL do Supabase:
          </p>
          
          <div className="p-3 bg-gray-50 rounded-md text-xs font-mono whitespace-pre-wrap overflow-auto">
{`-- Primeiro exclui os relacionamentos
DELETE FROM menu_drinks WHERE menu_id = '${menuId || 'seu-id-aqui'}';

-- Depois exclui o menu
DELETE FROM menus WHERE id = '${menuId || 'seu-id-aqui'}';
`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 