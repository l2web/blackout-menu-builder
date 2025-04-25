
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

export const generatePDF = async (menuName: string, menuDrinks: MenuDrink[]): Promise<void> => {
  // Criar um novo documento PDF no tamanho A4
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Adicionar título
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text("BLACKOUT", 105, 20, { align: "center" });
  
  // Adicionar subtítulo (nome do menu)
  doc.setFontSize(16);
  doc.text(menuName, 105, 30, { align: "center" });

  // Separar drinks alcoólicos e não alcoólicos
  const alcoholicDrinks = menuDrinks.filter(item => item.drinks.is_alcoholic);
  const nonAlcoholicDrinks = menuDrinks.filter(item => !item.drinks.is_alcoholic);

  // Adicionar seção de drinks alcoólicos
  if (alcoholicDrinks.length > 0) {
    doc.setFontSize(14);
    doc.text("Drinks Alcoólicos", 105, 45, { align: "center" });
    
    // Preparar dados para a tabela
    const alcoholicData = alcoholicDrinks.map(item => [
      item.drinks.name,
      item.drinks.description
    ]);

    // Adicionar tabela de drinks alcoólicos
    autoTable(doc, {
      startY: 50,
      head: [['Nome', 'Descrição']],
      body: alcoholicData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      styles: { 
        overflow: 'linebreak',
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { top: 50 },
    });
  }

  // Adicionar seção de drinks não alcoólicos
  if (nonAlcoholicDrinks.length > 0) {
    // Determinar a posição Y para os drinks não alcoólicos
    // (após a tabela de alcoólicos ou no topo se não houver alcoólicos)
    const startY = alcoholicDrinks.length > 0 
      ? (doc as any).lastAutoTable.finalY + 15 
      : 45;
      
    doc.setFontSize(14);
    doc.text("Drinks Não Alcoólicos", 105, startY, { align: "center" });
    
    // Preparar dados para a tabela
    const nonAlcoholicData = nonAlcoholicDrinks.map(item => [
      item.drinks.name,
      item.drinks.description
    ]);

    // Adicionar tabela de drinks não alcoólicos
    autoTable(doc, {
      startY: startY + 5,
      head: [['Nome', 'Descrição']],
      body: nonAlcoholicData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      styles: { 
        overflow: 'linebreak',
        cellPadding: 5,
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
    });
  }

  // Adicionar rodapé
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`BLACKOUT DRINK BUILDER - ${new Date().toLocaleDateString('pt-BR')}`, 105, 290, { align: "center" });
    doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: "right" });
  }

  // Salvar o PDF
  const pdfOutput = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfOutput);
  
  // Abrir o PDF em uma nova aba
  window.open(pdfUrl, '_blank');
  
  // Criar um link para download
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = `${menuName.replace(/\s+/g, '_')}.pdf`;
  downloadLink.click();
};

// Expor a função globalmente para ser usada pelos componentes
window.generatePDF = generatePDF;

export default generatePDF;
