-- Função para excluir um menu e seus relacionamentos
-- Esta função usa SECURITY DEFINER para executar com permissões elevadas
-- e contornar as políticas RLS que podem estar impedindo a deleção

CREATE OR REPLACE FUNCTION delete_menu_complete(menu_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Isso faz a função executar com permissões do proprietário do banco
AS $$
DECLARE
  menu_exists BOOLEAN;
BEGIN
  -- Verificar se o menu existe
  SELECT EXISTS(SELECT 1 FROM menus WHERE id = menu_id_param) INTO menu_exists;
  
  IF NOT menu_exists THEN
    RAISE NOTICE 'Menu com ID % não encontrado', menu_id_param;
    RETURN FALSE;
  END IF;

  -- Registrar a operação (para logs)
  RAISE NOTICE 'Excluindo menu e relacionamentos para o menu_id: %', menu_id_param;
  
  -- Primeiro, excluir os relacionamentos na tabela menu_drinks
  DELETE FROM menu_drinks WHERE menu_id = menu_id_param;
  
  -- Em seguida, excluir o menu principal
  DELETE FROM menus WHERE id = menu_id_param;
  
  -- Verificar se a exclusão foi bem-sucedida
  IF EXISTS(SELECT 1 FROM menus WHERE id = menu_id_param) THEN
    RAISE NOTICE 'Falha ao excluir o menu: % - o menu ainda existe', menu_id_param;
    RETURN FALSE;
  END IF;
  
  RAISE NOTICE 'Menu % excluído com sucesso', menu_id_param;
  RETURN TRUE;
END;
$$; 