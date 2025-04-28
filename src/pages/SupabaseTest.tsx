import { useState } from 'react';
import { testSupabaseConnection } from '@/integrations/supabase/test-connection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function SupabaseTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    data?: any;
    error?: string;
    tested: boolean;
  }>({ tested: false });

  const runTest = async () => {
    setIsLoading(true);
    try {
      const connectionResult = await testSupabaseConnection();
      setResult({
        ...connectionResult,
        tested: true
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        tested: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Teste de Conexão Supabase</CardTitle>
          <CardDescription>
            Verifique se a conexão com o Supabase está funcionando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.tested && (
            <Alert className={result.success ? "bg-green-50" : "bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <AlertTitle>
                {result.success ? "Conexão bem-sucedida" : "Falha na conexão"}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {result.success
                  ? "Sua conexão com o Supabase está funcionando corretamente."
                  : `Erro: ${result.error}`}
                
                {result.success && result.data && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={runTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              "Testar Conexão"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 