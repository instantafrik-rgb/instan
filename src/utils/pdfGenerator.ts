import { jsPDF } from 'jspdf';
import { Devis, Facture, Client, Parametres } from '../types';
import { formatCurrency, formatPdfCurrency, formatDate } from './formatters';

export function generateDevisPDF(
  devis: Devis,
  client: Client | undefined,
  params: Parametres
): { blob: Blob; filename: string; doc: jsPDF } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const clientName = client ? client.nom.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Client';
  const filename = `${devis.numero}_${clientName}.pdf`;

  // Palette Monochrome Moderne (Blanc, Noir & Nuances Épurées)
  const primaryBlack = [18, 18, 18]; // #121212
  const charcoalDark = [38, 38, 38]; // #262626
  const textDark = [24, 24, 27]; // #18181B
  const textMuted = [113, 113, 122]; // #71717A
  const bgLight = [250, 250, 250]; // #FAFAFA
  const borderLight = [228, 228, 231]; // #E4E4E7
  const borderSubtle = [212, 212, 216]; // #D4D4D8

  // Header Background Bar (Noir épuré)
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Company Name & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(params.entreprise.nom || 'NANTOR SOURCING APP', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);
  doc.text('Sourcing Alibaba & Logistique Chine - Afrique', 14, 20);

  // Document Badge (Right Header - Monochrome Chic)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(138, 7, 58, 18, 1.5, 1.5, 'F');
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('DEVIS PROFORMA', 142, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor( charcoals(charcoalDark) );
  doc.text(`N° ${devis.numero}`, 142, 20);

  function charcoals(c: number[]): number {
    return c[0];
  }

  // Company Contact block
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  let topInfoY = 40;
  const compLines = [
    `Tél : ${params.entreprise.telephone || '+228 90 00 00 00'} | WhatsApp : ${params.entreprise.whatsapp || '+228 90 00 00 00'}`,
    `Email : ${params.entreprise.email || 'contact@nantorsourcing.com'} | Ville : ${params.entreprise.ville || 'Lomé, Togo'}`,
    params.entreprise.adresse ? `Adresse : ${params.entreprise.adresse}` : '',
  ].filter(Boolean);

  compLines.forEach((line) => {
    doc.text(line, 14, topInfoY);
    topInfoY += 4.5;
  });

  // Divider
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(14, topInfoY + 2, 196, topInfoY + 2);

  // Client Box & Metadata Box
  const clientBoxY = topInfoY + 6;
  // Left: Client Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(14, clientBoxY, 100, 30, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, clientBoxY, 100, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('CLIENT DESTINATAIRE', 18, clientBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(client ? client.nom : 'Client Inconnu', 18, clientBoxY + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Tél : ${client?.telephone || 'Non renseigné'} / WA : ${client?.whatsapp || 'Non renseigné'}`, 18, clientBoxY + 18.5);
  doc.text(`Ville : ${client?.ville || 'Lomé'}${client?.quartier ? ` - ${client.quartier}` : ''}`, 18, clientBoxY + 24);

  // Right: Devis Info Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(120, clientBoxY, 76, 30, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(120, clientBoxY, 76, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('RÉFÉRENCES COTATION', 124, clientBoxY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Date : ${formatDate(devis.date)}`, 124, clientBoxY + 13);
  doc.text(`Statut : ${devis.statut}`, 124, clientBoxY + 19);
  doc.text(`Devise : ${params.devise || 'FCFA'}`, 124, clientBoxY + 25);

  // Items Table Header
  const tableStartY = clientBoxY + 36;
  const drawTableHeader = (startY: number) => {
    doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
    doc.rect(14, startY, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('N°', 16, startY + 5.5);
    doc.text('PHOTO', 27, startY + 5.5);
    doc.text('DÉSIGNATION / ARTICLE', 46, startY + 5.5);
    doc.text(`P.U. (${params.devise})`, 136, startY + 5.5, { align: 'right' });
    doc.text('QTÉ', 158, startY + 5.5, { align: 'center' });
    doc.text(`TOTAL (${params.devise})`, 192, startY + 5.5, { align: 'right' });
  };

  drawTableHeader(tableStartY);

  // Rows with Photo Thumbnail Rendering
  let curY = tableStartY + 8;
  const rowHeight = 17; // mm for row with photo

  devis.articles.forEach((art, idx) => {
    // Pagination check
    if (curY + rowHeight > 265) {
      doc.addPage();
      // Mini header
      doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`${params.entreprise.nom || 'NANTOR SOURCING APP'} — Devis N° ${devis.numero} (suite)`, 14, 8);

      curY = 18;
      drawTableHeader(curY);
      curY += 8;
    }

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(252, 252, 252);
      doc.rect(14, curY, 182, rowHeight, 'F');
    }
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(14, curY + rowHeight, 196, curY + rowHeight);

    // Number
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${idx + 1}`, 16, curY + 9);

    // Photo Box & Image Embedding
    const photoBoxX = 24;
    const photoBoxY = curY + 2;
    const photoSize = 13;

    doc.setFillColor(244, 244, 245);
    doc.setDrawColor(borderSubtle[0], borderSubtle[1], borderSubtle[2]);
    doc.roundedRect(photoBoxX, photoBoxY, photoSize, photoSize, 1, 1, 'FD');

    if (art.photo) {
      try {
        let imgFormat = 'JPEG';
        if (art.photo.includes('image/png')) imgFormat = 'PNG';
        else if (art.photo.includes('image/webp')) imgFormat = 'WEBP';
        doc.addImage(art.photo, imgFormat, photoBoxX, photoBoxY, photoSize, photoSize, undefined, 'FAST');
      } catch (e) {
        console.warn('Erreur lors de l\'intégration de l\'image dans le PDF:', e);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('Photo', photoBoxX + 6.5, photoBoxY + 7.5, { align: 'center' });
      }
    } else {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text('Sans photo', photoBoxX + 6.5, photoBoxY + 7.5, { align: 'center' });
    }

    // Designation & Spec
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const splitTitle = doc.splitTextToSize(art.nomProduit, 72);
    doc.text(splitTitle[0] || art.nomProduit, 44, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    if (art.description) {
      const descLine = art.description.length > 55 ? `${art.description.substring(0, 52)}...` : art.description;
      doc.text(descLine, 44, curY + 10.5);
    }
    if (art.lienAlibaba) {
      doc.setFontSize(6.5);
      doc.setTextColor(70, 70, 70);
      doc.text('Réf / Lien fournisseur Chine fourni', 44, curY + 14);
    }

    // Pricing
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(formatPdfCurrency(art.prixUnitaire, '').trim(), 136, curY + 9, { align: 'right' });
    doc.text(`${art.quantite}`, 158, curY + 9, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(art.total, '').trim(), 192, curY + 9, { align: 'right' });

    curY += rowHeight;
  });

  // Check if enough room for totals and terms (needs ~65mm)
  if (curY + 65 > 280) {
    doc.addPage();
    doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${params.entreprise.nom || 'NANTOR SOURCING APP'} — Devis N° ${devis.numero} (Récapitulatif)`, 14, 8);
    curY = 20;
  }

  // Totals Area (Épuré Monochrome)
  curY += 6;
  const totalsX = 114;
  const totalsWidth = 82;

  // Sous-total
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Sous-total articles :', totalsX, curY + 4);
  doc.text(formatPdfCurrency(devis.sousTotal, params.devise), 196, curY + 4, { align: 'right' });

  // Frais livraison Chine
  curY += 6;
  doc.text('Frais de livraison en Chine :', totalsX, curY + 4);
  doc.text(formatPdfCurrency(devis.fraisLivraisonChine, params.devise), 196, curY + 4, { align: 'right' });

  // Frais transaction
  curY += 6;
  doc.text(`Frais transaction (${devis.fraisTransactionPourcent || 5} %) :`, totalsX, curY + 4);
  doc.text(formatPdfCurrency(devis.fraisTransaction, params.devise), 196, curY + 4, { align: 'right' });

  // Total à payer Box - Noir Épuré Minimaliste
  curY += 8;
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.roundedRect(totalsX - 4, curY, totalsWidth + 4, 12, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL À PAYER :', totalsX, curY + 8);
  doc.text(formatPdfCurrency(devis.total, params.devise), 194, curY + 8, { align: 'right' });

  // Notes & Terms (Monochrome & Épuré)
  const termsY = curY + 18;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(14, termsY, 182, 34, 1.5, 1.5, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, termsY, 182, 34, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('CONDITIONS & MODALITÉS DE SOURCING', 18, termsY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const defaultTerms = [
    '1. Validité du devis : 7 jours sous réserve de fluctuation des prix fournisseurs en Chine.',
    '2. Lancement des achats après réception de l\'acompte ou du paiement convenu.',
    '3. Les délais de transit maritime/aérien dépendent des compagnies de transport partenaires.',
    '4. Modes de paiement acceptés : Espèces, TMoney, Flooz, Virement bancaire.',
  ];
  defaultTerms.forEach((term, tIdx) => {
    doc.text(term, 18, termsY + 12 + tIdx * 5);
  });

  if (devis.notes) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Notes particulières : ${devis.notes}`, 18, termsY + 31);
  }

  // Footer Bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(`Document officiel — Nantor Sourcing App — ${params.entreprise.nom}`, 105, 287, { align: 'center' });

  const blob = doc.output('blob');
  return { blob, filename, doc };
}

export function generateFacturePDF(
  facture: Facture,
  client: Client | undefined,
  params: Parametres
): { blob: Blob; filename: string; doc: jsPDF } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const clientName = client ? client.nom.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Client';
  const filename = `${facture.numero}_${clientName}.pdf`;

  const primaryBlack = [18, 18, 18];
  const charcoalDark = [38, 38, 38];
  const textDark = [24, 24, 27];
  const textMuted = [113, 113, 122];
  const bgLight = [250, 250, 250];
  const borderLight = [228, 228, 231];
  const borderSubtle = [212, 212, 216];

  // Header Bar (Noir Épuré)
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(params.entreprise.nom || 'NANTOR SOURCING APP', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);
  doc.text('Facture officielle & Récapitulatif des règlements', 14, 20);

  // Badge Status Right
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(138, 7, 58, 18, 1.5, 1.5, 'F');
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`FACTURE : ${facture.statut}`, 142, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(charcoalDark[0], charcoalDark[1], charcoalDark[2]);
  doc.text(`N° ${facture.numero}`, 142, 20);

  // Contacts
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  let topInfoY = 40;
  const compLines = [
    `Tél : ${params.entreprise.telephone || '+228 90 00 00 00'} | WhatsApp : ${params.entreprise.whatsapp || '+228 90 00 00 00'}`,
    `Email : ${params.entreprise.email || 'contact@nantorsourcing.com'} | Ville : ${params.entreprise.ville || 'Lomé, Togo'}`,
  ];
  compLines.forEach((line) => {
    doc.text(line, 14, topInfoY);
    topInfoY += 4.5;
  });

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(14, topInfoY + 2, 196, topInfoY + 2);

  // Boxes
  const clientBoxY = topInfoY + 6;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(14, clientBoxY, 100, 30, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, clientBoxY, 100, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('FACTURÉ À', 18, clientBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(client ? client.nom : 'Client Inconnu', 18, clientBoxY + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Tél : ${client?.telephone || 'Non renseigné'} / WA : ${client?.whatsapp || 'Non renseigné'}`, 18, clientBoxY + 18.5);
  doc.text(`Ville : ${client?.ville || 'Lomé'}${client?.quartier ? ` - ${client.quartier}` : ''}`, 18, clientBoxY + 24);

  // Facture Info Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(120, clientBoxY, 76, 30, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(120, clientBoxY, 76, 30, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('DÉTAILS FACTURE', 124, clientBoxY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Date : ${formatDate(facture.date)}`, 124, clientBoxY + 13);
  const refText = facture.commandeId
    ? `Réf. Commande : ${facture.commandeId}`
    : facture.devisId
    ? `Réf. Devis : ${facture.devisId}`
    : 'Facture directe';
  doc.text(refText.length > 25 ? `${refText.substring(0, 24)}.` : refText, 124, clientBoxY + 19);
  doc.text(`Statut : ${facture.statut}`, 124, clientBoxY + 25);

  // Table Header
  const tableStartY = clientBoxY + 36;
  const drawFactureTableHeader = (startY: number) => {
    doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
    doc.rect(14, startY, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('N°', 16, startY + 5.5);
    doc.text('PHOTO', 27, startY + 5.5);
    doc.text('ARTICLE / DÉSIGNATION', 46, startY + 5.5);
    doc.text(`P.U. (${params.devise})`, 136, startY + 5.5, { align: 'right' });
    doc.text('QTÉ', 158, startY + 5.5, { align: 'center' });
    doc.text(`TOTAL (${params.devise})`, 192, startY + 5.5, { align: 'right' });
  };

  drawFactureTableHeader(tableStartY);

  // Rows
  let curY = tableStartY + 8;
  const rowHeight = 17;

  facture.articles.forEach((art, idx) => {
    if (curY + rowHeight > 265) {
      doc.addPage();
      doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
      doc.rect(0, 0, 210, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`${params.entreprise.nom || 'NANTOR SOURCING APP'} — Facture N° ${facture.numero} (suite)`, 14, 8);

      curY = 18;
      drawFactureTableHeader(curY);
      curY += 8;
    }

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(252, 252, 252);
      doc.rect(14, curY, 182, rowHeight, 'F');
    }
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(14, curY + rowHeight, 196, curY + rowHeight);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${idx + 1}`, 16, curY + 9);

    // Photo Box & Image Embedding
    const photoBoxX = 24;
    const photoBoxY = curY + 2;
    const photoSize = 13;

    doc.setFillColor(244, 244, 245);
    doc.setDrawColor(borderSubtle[0], borderSubtle[1], borderSubtle[2]);
    doc.roundedRect(photoBoxX, photoBoxY, photoSize, photoSize, 1, 1, 'FD');

    if (art.photo) {
      try {
        let imgFormat = 'JPEG';
        if (art.photo.includes('image/png')) imgFormat = 'PNG';
        else if (art.photo.includes('image/webp')) imgFormat = 'WEBP';
        doc.addImage(art.photo, imgFormat, photoBoxX, photoBoxY, photoSize, photoSize, undefined, 'FAST');
      } catch (e) {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('Photo', photoBoxX + 6.5, photoBoxY + 7.5, { align: 'center' });
      }
    } else {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text('Sans photo', photoBoxX + 6.5, photoBoxY + 7.5, { align: 'center' });
    }

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const splitTitle = doc.splitTextToSize(art.nomProduit, 72);
    doc.text(splitTitle[0] || art.nomProduit, 44, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    if (art.description) {
      const descLine = art.description.length > 55 ? `${art.description.substring(0, 52)}...` : art.description;
      doc.text(descLine, 44, curY + 10.5);
    }

    // Pricing
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(formatPdfCurrency(art.prixUnitaire, '').trim(), 136, curY + 9, { align: 'right' });
    doc.text(`${art.quantite}`, 158, curY + 9, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(art.total, '').trim(), 192, curY + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    curY += rowHeight;
  });

  if (curY + 65 > 280) {
    doc.addPage();
    doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
    doc.rect(0, 0, 210, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`${params.entreprise.nom || 'NANTOR SOURCING APP'} — Facture N° ${facture.numero} (Récapitulatif)`, 14, 8);
    curY = 20;
  }

  // Totals Area
  curY += 6;
  const totalsX = 114;

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Sous-total articles :', totalsX, curY + 4);
  doc.text(formatPdfCurrency(facture.sousTotal, params.devise), 196, curY + 4, { align: 'right' });

  curY += 6;
  doc.text('Frais (Livraison & Annexes) :', totalsX, curY + 4);
  doc.text(formatPdfCurrency(facture.frais, params.devise), 196, curY + 4, { align: 'right' });

  curY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL FACTURE :', totalsX, curY + 4);
  doc.text(formatPdfCurrency(facture.total, params.devise), 196, curY + 4, { align: 'right' });

  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Montant déjà réglé :', totalsX, curY + 4);
  doc.text(formatPdfCurrency(facture.montantPaye, params.devise), 196, curY + 4, { align: 'right' });

  // Solde Restant Box (Monochrome Chic)
  curY += 8;
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.roundedRect(totalsX - 4, curY, 86, 12, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RESTE À PAYER (SOLDE) :', totalsX, curY + 8);
  doc.text(formatPdfCurrency(facture.solde, params.devise), 194, curY + 8, { align: 'right' });

  // Footer Notice
  const noticeY = curY + 20;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(14, noticeY, 182, 24, 1.5, 1.5, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, noticeY, 182, 24, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.text('MENTIONS LÉGALES & ENREGISTREMENT', 18, noticeY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Ce document atteste des montants engagés et des règlements perçus pour votre commande.', 18, noticeY + 12);
  doc.text('Pour toute réclamation, veuillez contacter le service client muni du numéro de facture.', 18, noticeY + 17);

  // Footer Bottom
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(`Document officiel — Nantor Sourcing App — ${params.entreprise.nom}`, 105, 287, { align: 'center' });

  const blob = doc.output('blob');
  return { blob, filename, doc };
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function sharePdfBlob(blob: Blob, filename: string, title: string, text?: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title,
        text: text || `Voici votre document ${filename}`,
        files: [file],
      });
      return true;
    } catch {
      // User cancelled or aborted
      return false;
    }
  }
  // Fallback to download
  downloadPdfBlob(blob, filename);
  return true;
}

// Section 6: Message WhatsApp pour Devis
export function getDevisWhatsAppMessage(devis: Devis, client: Client | undefined): string {
  const clientNom = client ? client.nom : 'Client';
  const totalFormatte = devis.total.toLocaleString('fr-FR');

  return `Bonjour ${clientNom},

Veuillez trouver ci-joint votre devis N° ${devis.numero}.

Montant total : ${totalFormatte} FCFA.

Nous restons à votre disposition pour toute information complémentaire.

Merci pour votre confiance.

Nantor Sourcing App`;
}

// Section 7: Message WhatsApp pour Facture
export function getFactureWhatsAppMessage(facture: Facture, client: Client | undefined): string {
  const clientNom = client ? client.nom : 'Client';
  const totalFormatte = facture.total.toLocaleString('fr-FR');
  const payeFormatte = facture.montantPaye.toLocaleString('fr-FR');
  const soldeFormatte = facture.solde.toLocaleString('fr-FR');

  return `Bonjour ${clientNom},

Veuillez trouver ci-joint votre facture N° ${facture.numero}.

Montant total : ${totalFormatte} FCFA.
Montant payé : ${payeFormatte} FCFA.
Solde : ${soldeFormatte} FCFA.

Merci pour votre confiance.

Nantor Sourcing App`;
}

// Helper to sanitize phone for WhatsApp link
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  // Remove non-numeric characters except leading +
  const cleaned = phone.replace(/[^0-9]/g, '');
  // If it's a 8-digit Togo number without country code, prepend 228
  if (cleaned.length === 8) {
    return `228${cleaned}`;
  }
  return cleaned;
}

export function openWhatsAppChat(phone?: string, message?: string): void {
  const cleaned = cleanPhoneNumber(phone);
  const encodedText = message ? encodeURIComponent(message) : '';
  const url = cleaned
    ? `https://wa.me/${cleaned}${encodedText ? `?text=${encodedText}` : ''}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Section: Rapport d'Activité & Statistiques V3
export function generateRapportStatistiquesPDF(
  stats: {
    periode: string;
    totalFacture: number;
    totalEncaisse: number;
    totalSoldeDu: number;
    totalBenefice: number;
    margeMoyenne: string;
    commandesCount: number;
    enTransitCount: number;
    auTogoCount: number;
    livresCount: number;
    topClients: { nom: string; total: number; count: number }[];
    isModePrive: boolean;
  },
  params: Parametres
): { blob: Blob; filename: string; doc: jsPDF } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const filename = `Rapport_Statistiques_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Colors
  const primaryBlack = [18, 18, 18];
  const borderLight = [228, 228, 231];

  // Header Bar
  doc.setFillColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(params.entreprise.nom || 'NANTOR SOURCING APP', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(212, 212, 216);
  doc.text('RAPPORT D’ACTIVITÉ COMMERCIALE & ANALYTIQUE V3', 14, 20);

  // Date badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(140, 7, 56, 16, 1.5, 1.5, 'F');
  doc.setTextColor(primaryBlack[0], primaryBlack[1], primaryBlack[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SYNTHÈSE V3', 144, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(new Date().toLocaleDateString('fr-FR'), 144, 19);

  let y = 40;

  // Filter info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.text(`Période sélectionnée : ${stats.periode}`, 14, y);
  y += 7;

  // KPI boxes (Grid 2x2)
  const boxWidth = 88;
  const boxHeight = 18;

  // Box 1: CA Facturé
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, boxWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(14, y, boxWidth, boxHeight, 2, 2, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('CHIFFRE D’AFFAIRES FACTURÉ', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(stats.totalFacture, params.devise), 18, y + 13);

  // Box 2: Total Encaissé
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, boxWidth, boxHeight, 2, 2, 'F');
  doc.roundedRect(108, y, boxWidth, boxHeight, 2, 2, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ENCAISSEMENTS VALIDÉS', 112, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(formatPdfCurrency(stats.totalEncaisse, params.devise), 112, y + 13);

  y += 22;

  // Box 3: Créances
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, boxWidth, boxHeight, 2, 2, 'F');
  doc.roundedRect(14, y, boxWidth, boxHeight, 2, 2, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('CRÉANCES CLIENTS (RESTE DÛ)', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72);
  doc.text(formatPdfCurrency(stats.totalSoldeDu, params.devise), 18, y + 13);

  // Box 4: Rentabilité / Bénéfice
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, y, boxWidth, boxHeight, 2, 2, 'F');
  doc.roundedRect(108, y, boxWidth, boxHeight, 2, 2, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('BÉNÉFICE NET ESTIMÉ', 112, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(124, 58, 237);
  doc.text(
    stats.isModePrive
      ? '•••••• FCFA'
      : `${formatPdfCurrency(stats.totalBenefice, params.devise)} (${stats.margeMoyenne}%)`,
    112,
    y + 13
  );

  y += 28;

  // Pipeline Logistique
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.text('État de la Chaîne Logistique & Expéditions', 14, y);
  y += 5;

  const colW = 44;
  const colH = 14;

  const pipeline = [
    { label: 'Commandes totales', val: String(stats.commandesCount) },
    { label: 'En transit Chine', val: String(stats.enTransitCount) },
    { label: 'Disponibles Lomé', val: String(stats.auTogoCount) },
    { label: 'Livrées au client', val: String(stats.livresCount) },
  ];

  pipeline.forEach((item, idx) => {
    const x = 14 + idx * 47;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, colW, colH, 1.5, 1.5, 'F');
    doc.roundedRect(x, y, colW, colH, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(18, 18, 18);
    doc.text(item.val, x + 3, y + 11);
  });

  y += 22;

  // Top Clients
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 18, 18);
  doc.text('Principaux Clients Partenaires', 14, y);
  y += 6;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('#', 18, y + 4.5);
  doc.text('NOM DU CLIENT', 30, y + 4.5);
  doc.text('NB COMMANDES', 120, y + 4.5);
  doc.text('TOTAL ACHATS', 160, y + 4.5);
  y += 7;

  if (stats.topClients.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucune commande enregistrée sur cette période.', 18, y + 6);
    y += 10;
  } else {
    stats.topClients.slice(0, 10).forEach((cli, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, 250, 250);
      doc.rect(14, y, 182, 7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(String(idx + 1), 18, y + 4.5);
      doc.text(cli.nom.slice(0, 35), 30, y + 4.5);
      doc.text(`${cli.count} cmd(s)`, 120, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(cli.total, params.devise), 160, y + 4.5);
      y += 7;
    });
  }

  // Footer note
  y = 280;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(14, y, 196, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Généré automatiquement par ${params.entreprise.nom || 'Nantor Sourcing App'} • Document confidentiel à usage interne`,
    14,
    y + 5
  );

  const blob = doc.output('blob');
  return { blob, filename, doc };
}
