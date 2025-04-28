import { jsPDF } from "jspdf";

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

// Função global para gerar o PDF
declare global {
  interface Window {
    generatePDF: (menuName: string, menuDrinks: MenuDrink[]) => Promise<void>;
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

export const generatePDF = async (menuName: string, menuDrinks: MenuDrink[]) => {
  // Configuração do documento
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  
  // Dimensões da página
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  
  // Margens e espaços
  const margin = 15;
  const headerSpace = 60; // Aumentado para evitar sobreposição com o logo/elementos do topo
  const footerSpace = 10; // Espaço reduzido para o rodapé
  
  // Separar drinks por tipo
  const alcoholicDrinks = menuDrinks.filter(item => item.drinks.is_alcoholic || item.drinks.image_url);
  const nonAlcoholicDrinks = menuDrinks.filter(item => !item.drinks.is_alcoholic && !item.drinks.image_url);
  
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
  const nonAlcNameFontSize = 14; // Tamanho maior para nomes de drinks não alcoólicos
  
  // Tamanho da imagem otimizado
  const imageSize = Math.min(45, spacePerAlcItem * 0.85); // Imagem menor para caber mais itens
  
  // Cache para imagens
  let backgroundImageBase64 = '';
  const drinkImageCache: { [key: string]: string } = {};
  
  // Carregar imagem de fundo
  try {
    const response = await fetch('/fundo_menu.png');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const imageBlob = await response.blob();
    backgroundImageBase64 = await blobToBase64(imageBlob);
  } catch (error) {
    console.error("Não foi possível carregar a imagem de fundo:", error);
  }
  
  // Pré-carregar imagens dos drinks
  const imageLoadPromises = menuDrinks
    .filter(item => item.drinks.image_url)
    .map(async (item) => {
      try {
        const imageUrl = item.drinks.image_url!;
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        drinkImageCache[imageUrl] = await blobToBase64(blob);
      } catch (error) {
        console.error(`Erro ao carregar imagem do drink ${item.drinks.name}:`, error);
      }
    });
  
  await Promise.all(imageLoadPromises);
  
  // Adicionar fundo
  if (backgroundImageBase64) {
    doc.addImage(backgroundImageBase64, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }
  
  // Função para exibir drink alcoólico na coluna específica
  const drawAlcoholicDrink = (drink: DrinkDetails, x: number, y: number, maxWidth: number) => {
    const drinkImageBase64 = drink.image_url ? drinkImageCache[drink.image_url] : null;
    
    // Posicionar texto e imagem
    const imageX = x;
    const textX = x + (drinkImageBase64 ? imageSize + 5 : 0);
    const textWidth = maxWidth - (drinkImageBase64 ? imageSize + 5 : 0);
    
    // Preparar nome
    doc.setFontSize(nameFontSize);
    doc.setFont('times', 'bold');
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
        console.error(`Erro ao adicionar imagem ${drink.name}:`, error);
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
    doc.setFont('times', 'bold');
    const drinkName = drink.name.toUpperCase();
    
    // Quebrar texto em linhas (usando largura menor para centralizar melhor)
    const nameWidth = contentWidth * 0.7;
    const nameLines = doc.splitTextToSize(drinkName, nameWidth);
    
    // Altura do nome
    const nameHeight = nameLines.length * (nonAlcNameFontSize * 0.5);
    
    // Desenhar nome (centralizado)
    doc.setTextColor(0, 0, 0);
    doc.text(nameLines, centerX, y, { align: 'center' });
    
    // Preparar descrição
    doc.setFontSize(descFontSize);
    doc.setFont('times', 'normal');
    
    // Limitar a descrição conforme necessário
    let drinkDesc = drink.description;
    
    // Quebrar texto da descrição
    const descWidth = contentWidth * 0.7;
    const descLines = doc.splitTextToSize(drinkDesc, descWidth);
    
    // Desenhar descrição (centralizada)
    doc.text(descLines, centerX, y + nameHeight + 5, { align: 'center' });
    
    // Retornar a altura aproximada usada por este drink
    return nameHeight + descLines.length * (descFontSize * 0.5) + 10;
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
    // Adicionar título centralizado "- DRINKS NÃO ALCOÓLICOS -"
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text("— DRINKS NÃO ALCOÓLICOS —", pageWidth / 2, currentY, { align: 'center' });
    currentY += 20; // Aumentado o espaço após o título
    
    // Renderizar cada drink não alcoólico centralizado
    nonAlcoholicDrinks.forEach((item) => {
      const drinkHeight = drawNonAlcoholicDrink(item.drinks, currentY);
      currentY += drinkHeight + 10; // Espaço entre drinks
    });
  }
  
  // Adicionar rodapé
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(`BLACKOUT DRINK BUILDER - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.text(`Página 1 de 1`, pageWidth - margin, pageHeight - 10, { align: "right" });
  
  // Salvar e abrir o PDF
  const pdfOutput = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfOutput);
  window.open(pdfUrl, '_blank');
  
  // Opção para download
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = `${menuName.replace(/\s+/g, '_')}.pdf`;
};

export default generatePDF;
