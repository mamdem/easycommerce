import { Injectable } from '@angular/core';
import { Order } from '../models/order.model';
import { StoreService } from './store.service';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  constructor(private storeService: StoreService) {
    // Ajout des polices personnalisées
    const OpenSansRegular = '';  // Vous devrez ajouter le contenu de la police en base64
    const OpenSansBold = '';     // Vous devrez ajouter le contenu de la police en base64
    const RobotoRegular = '';    // Vous devrez ajouter le contenu de la police en base64
    const RobotoBold = '';       // Vous devrez ajouter le contenu de la police en base64
  }

  private generateInvoiceNumber(date: Date): string {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `FAC-${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  private formatPrice(price: number): string {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' FCFA';
  }

  private generateBarcode(doc: jsPDF, text: string, x: number, y: number, width: number): void {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: "CODE128",
      width: 1,
      height: 50,
      displayValue: false
    });
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', x, y, width, 15);
  }

  private async generateTicketPDF(order: Order, store: any): Promise<jsPDF> {
    // Créer un nouveau document PDF format ticket
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 180]
    });

    // Configuration initiale
    let yPos = 10;
    const margin = 5;
    const width = doc.internal.pageSize.getWidth();
    const center = width / 2;

    // En-tête avec logo
    if (store.logoUrl) {
      const logoSize = 25;
      const logoX = (width - logoSize) / 2;
      doc.addImage(store.logoUrl, 'JPEG', logoX, yPos, logoSize, logoSize);
      yPos += logoSize + 5;
    }

    // Nom de la boutique
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(store.legalName, center, yPos, { align: 'center' });
    
    // Informations boutique
    yPos += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(store.address, center, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`${store.city}, ${store.zipCode}`, center, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`Tél: ${store.phoneNumber}`, center, yPos, { align: 'center' });
    
    // Séparateur stylisé
    yPos += 6;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, yPos, width - margin, yPos);

    // Numéro de facture et date
    yPos += 8;
    const orderDate = new Date(order.createdAt);
    const invoiceNumber = this.generateInvoiceNumber(orderDate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(invoiceNumber, center, yPos, { align: 'center' });
    
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(orderDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }), center, yPos, { align: 'center' });

    // Client
    yPos += 8;
    doc.text(`Client: ${order.customerInfo.fullName}`, center, yPos, { align: 'center' });

    // Séparateur stylisé
    yPos += 6;
    doc.line(margin, yPos, width - margin, yPos);

    // En-tête des articles
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    const colWidth = (width - (2 * margin)) / 3;
    doc.text('Article', margin + (colWidth/2), yPos, { align: 'center' });
    doc.text('Qté', margin + colWidth + (colWidth/2), yPos, { align: 'center' });
    doc.text('Prix', margin + (2 * colWidth) + (colWidth/2), yPos, { align: 'center' });
    
    // Liste des articles
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    order.items.forEach(item => {
      const itemName = item.product.name.length > 15 ? 
        item.product.name.substring(0, 12) + '...' : 
        item.product.name;
      
      doc.text(itemName, margin + (colWidth/2), yPos, { align: 'center' });
      doc.text(item.quantity.toString(), margin + colWidth + (colWidth/2), yPos, { align: 'center' });
      doc.text(this.formatPrice(item.product.price), margin + (2 * colWidth) + (colWidth/2), yPos, { align: 'center' });
      yPos += 5;
    });

    // Séparateur stylisé
    yPos += 3;
    doc.line(margin, yPos, width - margin, yPos);

    // Total
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const totalText = 'TOTAL:';
    const totalAmount = this.formatPrice(order.subtotal);
    const totalWidth = doc.getTextWidth(totalText + ' ' + totalAmount);
    const totalX = center - (totalWidth / 2);
    doc.text(totalText, totalX, yPos);
    doc.text(totalAmount, totalX + doc.getTextWidth(totalText + ' '), yPos);

    // Séparateur stylisé
    yPos += 8;
    doc.line(margin, yPos, width - margin, yPos);

    // Message de remerciement
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Merci pour votre achat!', center, yPos, { align: 'center' });
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Conservez ce reçu comme preuve d\'achat', center, yPos, { align: 'center' });

    // Date d'impression
    yPos += 6;
    const now = new Date();
    doc.setFontSize(7);
    doc.text(`Date d'impression: ${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR')}`, 
             center, yPos, { align: 'center' });

    // Code-barres
    yPos += 8;
    this.generateBarcode(doc, '000054', margin, yPos, width - (2 * margin));
    
    // Numéro sous le code-barres
    yPos += 18;
    doc.text('000054', center, yPos, { align: 'center' });

    return doc;
  }

  generateOrderTicket(order: Order, shouldPrint: boolean = false): void {
    this.storeService.getSelectedStore().subscribe(async store => {
      if (!store) return;

      const doc = await this.generateTicketPDF(order, store);

      if (shouldPrint) {
        // Impression directe
        const pdfData = doc.output('datauristring');
        const printWindow = window.open('');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Impression du ticket</title>
                <style>
                  @media print {
                    body { margin: 0; }
                    iframe { display: none; }
                  }
                </style>
              </head>
              <body>
                <iframe src="${pdfData}" width="100%" height="100%" style="border: none;">
                </iframe>
                <script>
                  document.querySelector('iframe').onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else {
        // Téléchargement
        const invoiceNumber = this.generateInvoiceNumber(new Date(order.createdAt));
        doc.save(`${invoiceNumber}.pdf`);
      }
    });
  }
} 