import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";

interface DrinkDetails {
  id: string;
  name: string;
  description: string;
  is_alcoholic: boolean;
  image_url: string | null;
}

interface MenuDrink {
  display_order: number;
  drink_id: string;
  drinks: DrinkDetails;
}

// Armazenar URLs de PDFs gerados anteriormente
let previousPdfUrls: string[] = [];

// Função global para gerar o PDF
declare global {
  interface Window {
    generatePDFV3: (menuName: string, menuDrinks: MenuDrink[], menuId?: string) => Promise<string>;
    previousPdfUrl?: string | null; // Para compatibilidade com implementações existentes
  }
}

// Helper para converter Blob para Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper para gerar hash único
const generateUniqueHash = (): string => {
  // Usar UUID se disponível no browser
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Fallback para timestamp + random string
  return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

// Função para calcular um checksum simples de uma string
const calculateStringChecksum = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Converter para 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// Função para forçar o download de um arquivo
const forceDownload = (blob: Blob, filename: string): void => {
  // Criar URL temporária
  const url = window.URL.createObjectURL(blob);
  
  // Criar elemento de link invisível
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Adicionar à página, clicar e remover
  document.body.appendChild(link);
  link.click();
  
  // Pequeno timeout para garantir que o navegador inicie o download
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

// Função auxiliar para limpar URLs de PDFs anteriores
// Esta função deve ser chamada antes de iniciar uma nova geração
export const cleanupPreviousPdfs = (): void => {
  console.log(`V3: Limpando ${previousPdfUrls.length} URLs de PDFs anteriores`);
  
  // Revogar todas as URLs anteriores
  previousPdfUrls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('V3: Falha ao revogar URL anterior:', e);
    }
  });
  
  // Limpar array
  previousPdfUrls = [];
  
  // Limpar também a referência global (para compatibilidade)
  if (typeof window !== 'undefined' && window.previousPdfUrl) {
    try {
      URL.revokeObjectURL(window.previousPdfUrl);
      window.previousPdfUrl = null;
    } catch (e) {
      console.warn('V3: Falha ao revogar URL global anterior:', e);
    }
  }
  
  // Limpar qualquer cache de blob no navegador
  try {
    const blobUrlsToRevoke = Array.from(
      window.performance.getEntriesByType('resource')
        .filter(resource => resource.name.startsWith('blob:'))
        .map(resource => resource.name)
    );
    
    blobUrlsToRevoke.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('V3: Falha ao revogar URL de recurso:', e);
      }
    });
  } catch (e) {
    console.warn('V3: Erro ao limpar cache de blobs:', e);
  }
};

// Função principal para gerar PDF - VERSÃO 3 COMPLETAMENTE RENOVADA
export const generatePDFV3 = async (menuName: string, menuDrinks: MenuDrink[], menuId?: string): Promise<string> => {
  // Adicionar distintivo de versão para debug
  console.log(`🔄 VERSÃO V3 🔄 - Gerando PDF para menu "${menuName}"`);
  
  // Limpar URLs anteriores primeiro
  cleanupPreviousPdfs();
  
  // Gerar hash único para esta geração de PDF
  const pdfHash = generateUniqueHash();
  console.log(`V3: Gerando novo PDF para menu: ${menuName} com hash: ${pdfHash}`);
  
  // Configuração do documento
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  
  // Adicionar metadados ao PDF
  doc.setProperties({
    title: `Cardápio ${menuName} (V3)`,
    subject: 'Menu de Drinks',
    creator: 'Blackout Drink Builder V3',
    author: 'Sistema Automatizado',
    keywords: `menu, drinks, ${pdfHash}, v3`,
  });
  
  // Dimensões da página
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  
  // Margens e espaços
  const margin = 15;
  const headerSpace = 60; // Aumentado para evitar sobreposição com o logo/elementos do topo
  const footerSpace = 10; // Espaço reduzido para o rodapé
  
  // Carregar a fonte Felix
  let felixFontBase64 = '';
  try {
    const cacheBreaker = `${pdfHash}_${Date.now()}`;
    const response = await fetch(`/felix.ttf?nocache=${cacheBreaker}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const fontBlob = await response.blob();
    felixFontBase64 = await blobToBase64(fontBlob);
    
    // Extrair a parte Base64 da string
    const base64Font = felixFontBase64.split(',')[1];
    // Adicionar a fonte Felix ao PDF
    doc.addFileToVFS('Felix.ttf', base64Font);
    doc.addFont('Felix.ttf', 'Felix', 'normal');
    console.log("V3: Fonte Felix carregada com sucesso");
  } catch (error) {
    console.error("V3: Não foi possível carregar a fonte Felix:", error);
  }
  
  // Separar drinks por tipo
  // Nova lógica: drinks com imagem são alcoólicos, drinks sem imagem são não alcoólicos
  // Independente do valor de is_alcoholic
  const alcoholicDrinks = menuDrinks.filter(item => !!item.drinks.image_url);
  const nonAlcoholicDrinks = menuDrinks.filter(item => !item.drinks.image_url);
  
  // Log para diagnóstico
  console.log("V3: Valores dos drinks para debug:", menuDrinks.map(item => ({
    name: item.drinks.name,
    is_alcoholic: item.drinks.is_alcoholic,
    has_image: !!item.drinks.image_url,
    categoria_no_pdf: !!item.drinks.image_url ? "alcoólico" : "não-alcoólico"
  })));
  
  console.log(`V3: Drinks alcoólicos: ${alcoholicDrinks.length}, Não-alcoólicos: ${nonAlcoholicDrinks.length}`);
  
  // Calcular espaço disponível
  const availableHeight = pageHeight - headerSpace - footerSpace;
  const contentWidth = pageWidth - (2 * margin);
  
  // Layouts otimizados para até 8 drinks (6 alc + 2 não alc)
  const totalAlcoholicDrinks = alcoholicDrinks.length;
  const totalNonAlcoholicDrinks = nonAlcoholicDrinks.length;
  
  // Definir alturas para cada seção
  // Altura total disponível menos 15mm de espaço entre seções
  const alcSection = totalAlcoholicDrinks > 0 ? 
    (availableHeight * 0.75) : 0; // 75% para alcoólicos quando ambos estão presentes

  const nonAlcSection = totalNonAlcoholicDrinks > 0 ? 
    (availableHeight * 0.25) : 0; // 25% para não alcoólicos quando ambos estão presentes
  
  // Layout em 2 colunas para drinks alcoólicos
  const columns = 2;
  const itemsPerColumn = Math.ceil(totalAlcoholicDrinks / columns);
  
  // Calcular espaço para cada drink baseado no número de itens
  const spacePerAlcItem = totalAlcoholicDrinks > 0 ? 
    (alcSection / (totalAlcoholicDrinks <= columns ? 1 : itemsPerColumn)) : 0;
  
  const spacePerNonAlcItem = totalNonAlcoholicDrinks > 0 ? 
    (nonAlcSection / totalNonAlcoholicDrinks) : 0;
  
  // Tamanhos de fonte ajustados para caber mais conteúdo
  const nameFontSize = 12; // Tamanho fixo para nomes
  const descFontSize = 8;  // Tamanho fixo para descrições
  const nonAlcNameFontSize = 12; // Reduzido de 14 para 12 para economizar espaço
  
  // Tamanho da imagem otimizado
  const imageSize = Math.min(45, spacePerAlcItem * 0.85); // Imagem menor para caber mais itens
  
  // Cache para imagens
  let backgroundImageBase64 = '';
  
  // Carregar imagem de fundo
  try {
    const cacheBreaker = `${pdfHash}_${Date.now()}`;
    const response = await fetch(`/fundo_menu.png?nocache=${cacheBreaker}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const imageBlob = await response.blob();
    backgroundImageBase64 = await blobToBase64(imageBlob);
    console.log("V3: Imagem de fundo carregada com sucesso");
  } catch (error) {
    console.error("V3: Não foi possível carregar a imagem de fundo:", error);
  }
  
  // Pré-carregar imagens dos drinks (usando hash para identificação)
  const drinkImagesBase64: { [key: string]: string } = {};
  
  const imageLoadPromises = menuDrinks
    .filter(item => item.drinks.image_url)
    .map(async (item) => {
      try {
        const cacheBreaker = `${pdfHash}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const imageUrl = `${item.drinks.image_url}?nocache=${cacheBreaker}`;
        console.log(`V3: Carregando imagem para drink ${item.drinks.name}: ${imageUrl}`);
        
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        drinkImagesBase64[item.drinks.id] = await blobToBase64(blob);
      } catch (error) {
        console.error(`V3: Erro ao carregar imagem do drink ${item.drinks.name}:`, error);
      }
    });
  
  await Promise.all(imageLoadPromises);
  console.log(`V3: ${Object.keys(drinkImagesBase64).length} imagens de drinks carregadas`);
  
  // Adicionar fundo
  if (backgroundImageBase64) {
    doc.addImage(backgroundImageBase64, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }
  
  // Função para exibir drink alcoólico na coluna específica
  const drawAlcoholicDrink = (drink: DrinkDetails, x: number, y: number, maxWidth: number) => {
    const drinkImageBase64 = drinkImagesBase64[drink.id];
    
    // Posicionar texto e imagem
    const imageX = x;
    const textX = x + (drinkImageBase64 ? imageSize + 5 : 0);
    const textWidth = maxWidth - (drinkImageBase64 ? imageSize + 5 : 0);
    
    // Preparar nome
    doc.setFontSize(nameFontSize);
    // Usar a fonte Felix para os nomes dos drinks
    doc.setFont(felixFontBase64 ? 'Felix' : 'times', 'normal');
    const drinkName = drink.name.toUpperCase();
    
    // Quebrar texto em linhas
    const nameLines = doc.splitTextToSize(drinkName, textWidth);
    
    // Altura do nome
    const nameHeight = nameLines.length * (nameFontSize * 0.5);
    
    // Desenhar nome
    doc.setTextColor(0, 0, 0);
    doc.text(nameLines, textX, y + 5);
    
    // Preparar descrição
    doc.setFontSize(descFontSize);
    doc.setFont('times', 'normal');
    
    // Limitar a descrição a um número máximo de caracteres para garantir que caiba
    let drinkDesc = drink.description;
    if (drinkDesc.length > 150) {
      drinkDesc = drinkDesc.substring(0, 147) + "...";
    }
    
    // Quebrar texto da descrição
    const descLines = doc.splitTextToSize(drinkDesc, textWidth);
    
    // Desenhar descrição
    doc.text(descLines, textX, y + nameHeight + 8);
    
    // Desenhar imagem
    if (drinkImageBase64) {
      try {
        const formatMatch = drinkImageBase64.match(/^data:image\/(png|jpe?g|gif);base64,/);
        const imageFormat = formatMatch ? formatMatch[1].toUpperCase() : 'PNG';
        doc.addImage(drinkImageBase64, imageFormat, imageX, y, imageSize, imageSize);
      } catch (error) {
        console.error(`V3: Erro ao adicionar imagem ${drink.name}:`, error);
      }
    }
    
    // Retornar a altura aproximada usada por este drink
    return Math.max(nameHeight + descLines.length * (descFontSize * 0.5) + 12, imageSize + 5);
  };
  
  // Função para exibir drink não alcoólico centralizado
  const drawNonAlcoholicDrink = (drink: DrinkDetails, y: number) => {
    const centerX = pageWidth / 2;
    
    // Preparar nome
    doc.setFontSize(nonAlcNameFontSize);
    // Usar a fonte Felix para os nomes dos drinks
    doc.setFont(felixFontBase64 ? 'Felix' : 'times', 'normal');
    const drinkName = drink.name.toUpperCase();
    
    // Quebrar texto em linhas (usando largura menor para centralizar melhor)
    const nameWidth = contentWidth * 0.7;
    const nameLines = doc.splitTextToSize(drinkName, nameWidth);
    
    // Altura do nome
    const nameHeight = nameLines.length * (nonAlcNameFontSize * 0.5);
    
    // Desenhar nome (centralizado) com destaque
    doc.setTextColor(0, 0, 0);
    doc.text(nameLines, centerX, y, { align: 'center' });
    
    // Preparar descrição
    doc.setFontSize(descFontSize);
    doc.setFont('times', 'normal');
    doc.setTextColor(50, 50, 50);
    
    // Limitar a descrição conforme necessário
    let drinkDesc = drink.description;
    // Opcionalmente, limitar tamanho da descrição para economizar espaço
    if (drinkDesc.length > 100) {
      drinkDesc = drinkDesc.substring(0, 97) + "...";
    }
    
    // Quebrar texto da descrição
    const descWidth = contentWidth * 0.6; // Reduzindo um pouco para melhor estética
    const descLines = doc.splitTextToSize(drinkDesc, descWidth);
    
    // Desenhar descrição (centralizada) - reduzir espaço entre nome e descrição
    doc.text(descLines, centerX, y + nameHeight + 3, { align: 'center' }); // Reduzido de 5 para 3
    
    // Reduzir a altura retornada para compactar o layout ainda mais
    return nameHeight + descLines.length * (descFontSize * 0.5) + 6; // Reduzido de 10 para 6
  };
  
  // Começar a renderizar
  let currentY = headerSpace;
  
  // Renderizar drinks alcoólicos (sem título)
  if (alcoholicDrinks.length > 0) {
    // Layout em 2 colunas
    const columnWidth = contentWidth / 2;
    const leftColX = margin;
    const rightColX = margin + columnWidth;
    
    // Renderizar em 2 colunas
    let leftColY = currentY;
    let rightColY = currentY;
    
    alcoholicDrinks.forEach((item, index) => {
      const isLeftColumn = index % 2 === 0;
      const x = isLeftColumn ? leftColX : rightColX;
      const y = isLeftColumn ? leftColY : rightColY;
      
      const drinkHeight = drawAlcoholicDrink(
        item.drinks, 
        x, 
        y, 
        columnWidth - 10 // Deixar margem entre colunas
      );
      
      // Atualizar posição Y da coluna usada
      if (isLeftColumn) {
        leftColY += drinkHeight + 8; // Espaço entre drinks
      } else {
        rightColY += drinkHeight + 8;
      }
    });
    
    // Atualizar Y global para o maior valor entre as colunas
    currentY = Math.max(leftColY, rightColY) + 15; // Aumentado o espaço antes da seção de drinks não alcoólicos
  }
  
  // Renderizar drinks não alcoólicos com o título centralizado
  if (nonAlcoholicDrinks.length > 0) {
    // Aproximar mais os drinks não alcoólicos dos alcoólicos
    currentY -= 20; // Diminuir em 20 unidades (antes era 15)
  
    // Adicionar título centralizado "- DRINKS NÃO ALCOÓLICOS -"
    doc.setFontSize(12); // Reduzido para 12 (antes era 14)
    // Usar a fonte Felix para o título
    doc.setFont(felixFontBase64 ? 'Felix' : 'times', 'normal');
    
    // Desenhar o título centralizado
    doc.text("— DRINKS NÃO ALCOÓLICOS —", pageWidth / 2, currentY, { align: 'center' });
    
    // Reduzir o espaço após o título
    currentY += 6; // Reduzido para 6 (antes era 8)
    
    // Renderizar cada drink não alcoólico centralizado com menos espaço entre eles
    nonAlcoholicDrinks.forEach((item, index) => {
      const drinkHeight = drawNonAlcoholicDrink(item.drinks, currentY);
      // Reduzir ainda mais o espaço entre os drinks não alcoólicos
      currentY += drinkHeight + 2; // Reduzido para 2 (antes era 3)
    });
  }
  
  // Adicionar rodapé
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`BLACKOUT DRINK BUILDER - ${new Date().toLocaleDateString('pt-BR')} - ID: ${pdfHash.substring(0, 8)}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.text(`Página 1 de 1 | V3`, pageWidth - margin, pageHeight - 10, { align: "right" });
  
  // Gerar o PDF como blob
  const pdfOutput = doc.output('blob');
  
  // Gerar nome de arquivo único com hash
  const fileName = `CardapioV3_${menuName.replace(/\s+/g, '_')}_${pdfHash}.pdf`;
  
  // Forçar o download do arquivo
  forceDownload(pdfOutput, fileName);
  
  // Criar URL de objeto temporária para retornar (para compatibilidade com o resto do código)
  const tempUrl = URL.createObjectURL(pdfOutput);
  
  // Armazenar essa URL para limpeza posterior
  previousPdfUrls.push(tempUrl);
  
  // Armazenar também na referência global para compatibilidade
  if (typeof window !== 'undefined') {
    window.previousPdfUrl = tempUrl;
  }
  
  // Também abrir o PDF em uma nova aba (opcional, já que o download já está acontecendo)
  window.open(tempUrl, '_blank');
  
  // Configurar limpeza automática após um tempo
  setTimeout(() => {
    try {
      URL.revokeObjectURL(tempUrl);
      
      // Remover da lista de URLs
      const index = previousPdfUrls.indexOf(tempUrl);
      if (index > -1) {
        previousPdfUrls.splice(index, 1);
      }
      
      // Limpar referência global se for a mesma
      if (window.previousPdfUrl === tempUrl) {
        window.previousPdfUrl = null;
      }
      
      console.log(`V3: URL temporária do PDF revogada após timeout: ${tempUrl}`);
    } catch (e) {
      console.warn('V3: Erro ao revogar URL após timeout:', e);
    }
  }, 30000); // Aumentado para 30 segundos para garantir tempo suficiente para download/visualização
  
  // Registrar logs de geração (opcional)
  try {
    // Criar um checksum simplificado do conteúdo do menu para verificação
    const menuChecksum = calculateStringChecksum(JSON.stringify(menuDrinks));
    
    console.log(`V3: PDF gerado com sucesso:
    - Hash: ${pdfHash}
    - Menu: ${menuName}${menuId ? ` (ID: ${menuId})` : ''}
    - Total de drinks: ${menuDrinks.length}
    - Checksum: ${menuChecksum}
    - Arquivo: ${fileName}`);
    
    // Opcionalmente, você pode salvar esses dados no Supabase
    if (menuId) {
      const logData = {
        generation_hash: pdfHash,
        menu_id: menuId,
        menu_name: menuName,
        timestamp: new Date().toISOString(),
        drink_count: menuDrinks.length,
        file_name: fileName,
        checksum: menuChecksum,
        version: 'V3'
      };
      
      // Comentado para não executar por enquanto
      // const { data, error } = await supabase.from('pdf_generation_logs').insert(logData);
      // if (error) console.error('V3: Erro ao salvar log de geração:', error);
    }
  } catch (e) {
    console.warn('V3: Erro ao registrar logs de geração do PDF:', e);
  }
  
  return tempUrl;
};

// Exportar função principal de geração
export { generatePDFV3 as generatePDF };

// Exportar o objeto com a função principal e a função de limpeza
export const pdfGenerator = {
  generate: generatePDFV3,
  cleanup: cleanupPreviousPdfs
};

export default generatePDFV3; 