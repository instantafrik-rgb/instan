import { jsPDF } from 'jspdf';
import { Devis, Facture, Client, Parametres, Paiement } from '../types';
import { formatCurrency, formatPdfCurrency, formatDate } from './formatters';

// Palette Professionnelle & Sobre (Monochrome Chic & Accents Épurés)
const cInk = [18, 18, 18];          // #121212 - Titres & éléments principaux
const cDark = [15, 23, 42];         // #0F172A - Texte sombre
const cSlate = [51, 65, 85];        // #334155 - Texte secondaire
const cMuted = [100, 116, 139];     // #64748B - Métadonnées & libellés
const cCardBg = [248, 250, 252];    // #F8FAFC - Fond cartes & alternance
const cBorder = [226, 232, 240];    // #E2E8F0 - Bordures fines
const cBorderSubtle = [241, 245, 249]; // #F1F5F9 - Lignes légères

// Accents Statuts (Discrets & élégants)
const cEmerald = [5, 150, 105];     // #059669 - Soldé / Payé
const cEmeraldBg = [236, 253, 245]; // #ECFDF5
const cEmeraldBorder = [16, 185, 129]; // #10B981

const cAmber = [180, 83, 9];        // #B45309 - Acompte partiel
const cAmberBg = [254, 243, 199];   // #FEF3C7
const cAmberBorder = [245, 158, 11]; // #F59E0B

/**
 * Dessine une image en conservant strictement ses proportions originales (sans étirement ni déformation).
 */
function drawContainedImage(
  doc: jsPDF,
  imgData: string,
  boxX: number,
  boxY: number,
  maxW: number,
  maxH: number
): boolean {
  if (!imgData || typeof imgData !== 'string') return false;
  try {
    const props = doc.getImageProperties(imgData);
    if (!props || !props.width || !props.height) return false;
    const imgRatio = props.width / props.height;
    const boxRatio = maxW / maxH;
    let w = maxW;
    let h = maxH;
    if (imgRatio > boxRatio) {
      w = maxW;
      h = maxW / imgRatio;
    } else {
      h = maxH;
      w = maxH * imgRatio;
    }
    const offsetX = boxX + (maxW - w) / 2;
    const offsetY = boxY + (maxH - h) / 2;
    let format = props.fileType || 'JPEG';
    if (imgData.includes('image/png')) format = 'PNG';
    else if (imgData.includes('image/webp')) format = 'WEBP';
    doc.addImage(imgData, format, offsetX, offsetY, w, h, undefined, 'FAST');
    return true;
  } catch (err) {
    console.warn('Image PDF non chargée:', err);
    return false;
  }
}

/**
 * Dessine un emplacement neutre et discret pour un produit sans photo.
 * Ne contient JAMAIS la mention "Sans photo".
 */
function drawNeutralPhotoPlaceholder(doc: jsPDF, x: number, y: number, size: number): void {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(x, y, size, size, 1, 1, 'FD');

  // Silhouette minimaliste / Icône discrète
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  const iconW = size * 0.46;
  const iconH = size * 0.36;
  const iconX = x + (size - iconW) / 2;
  const iconY = y + (size - iconH) / 2;
  doc.roundedRect(iconX, iconY, iconW, iconH, 0.6, 0.6, 'S');
  doc.circle(x + size / 2, y + size / 2, size * 0.1, 'S');
  doc.setLineWidth(0.2);
}

/**
 * Dessine l'en-tête commun standardisé (AFRIQUE-CHINA SOURCING PRO)
 */
function drawCommonHeader(
  doc: jsPDF,
  params: Parametres,
  docType: 'FACTURE' | 'DEVIS',
  docNumero: string,
  docDate: string,
  badgeInfo?: { text: string; type: 'paid' | 'partial' | 'unpaid' }
): number {
  // Fine bande d'accentuation en tête de page (2.5mm)
  doc.setFillColor(cInk[0], cInk[1], cInk[2]);
  doc.rect(0, 0, 210, 2.5, 'F');

  // Détection et affichage du Logo
  let leftTextX = 14;
  const hasLogo = !!params.entreprise.logo;
  if (hasLogo && params.entreprise.logo) {
    const drawn = drawContainedImage(doc, params.entreprise.logo, 14, 6, 20, 16);
    if (drawn) {
      leftTextX = 38;
    }
  }

  // Entreprise (À gauche)
  const nomEntreprise = params.entreprise.nom || 'AFRIQUE-CHINA SOURCING PRO';
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(nomEntreprise, leftTextX, 11);

  // Informations de contact essentielles (Téléphone, WhatsApp, Email, Ville/pays)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);

  const telWa = `Tél : ${params.entreprise.telephone || '+228 90 12 34 56'}   •   WhatsApp : ${params.entreprise.whatsapp || '+228 90 12 34 56'}`;
  doc.text(telWa, leftTextX, 16);

  const emailVille = `Email : ${params.entreprise.email || 'contact@nantorsourcing.com'}   •   Ville : ${params.entreprise.ville || 'Lomé'}${params.entreprise.pays ? `, ${params.entreprise.pays}` : ''}`;
  doc.text(emailVille, leftTextX, 20.5);

  if (params.entreprise.adresse) {
    const adr = params.entreprise.adresse.length > 55 ? `${params.entreprise.adresse.substring(0, 52)}...` : params.entreprise.adresse;
    doc.text(`Adresse : ${adr}`, leftTextX, 25);
  }

  // Bloc Document (À droite)
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(docType, 196, 12, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(`N° ${docNumero}`, 196, 17.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  doc.text(`Date : ${formatDate(docDate)}`, 196, 22.5, { align: 'right' });

  // Badge Statut discret dans l'en-tête (Unique indication visuelle du statut)
  if (badgeInfo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const textWidth = doc.getTextWidth(badgeInfo.text);
    const badgeW = Math.max(30, textWidth + 8);
    const badgeH = 5.8;
    const badgeX = 196 - badgeW;
    const badgeY = 25;

    if (badgeInfo.type === 'paid') {
      doc.setFillColor(cEmeraldBg[0], cEmeraldBg[1], cEmeraldBg[2]);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
      doc.setDrawColor(cEmeraldBorder[0], cEmeraldBorder[1], cEmeraldBorder[2]);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'S');

      doc.setTextColor(cEmerald[0], cEmerald[1], cEmerald[2]);
      doc.text(badgeInfo.text, badgeX + badgeW / 2, badgeY + 4.1, { align: 'center' });
    } else if (badgeInfo.type === 'partial') {
      doc.setFillColor(cAmberBg[0], cAmberBg[1], cAmberBg[2]);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
      doc.setDrawColor(cAmberBorder[0], cAmberBorder[1], cAmberBorder[2]);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'S');

      doc.setTextColor(cAmber[0], cAmber[1], cAmber[2]);
      doc.text(badgeInfo.text, badgeX + badgeW / 2, badgeY + 4.1, { align: 'center' });
    } else if (badgeInfo.type === 'unpaid') {
      doc.setFillColor(241, 245, 249); // #F1F5F9 (neutre doux)
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'F');
      doc.setDrawColor(203, 213, 225); // #CBD5E1
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, 'S');

      doc.setTextColor(cDark[0], cDark[1], cDark[2]);
      doc.text(badgeInfo.text, badgeX + badgeW / 2, badgeY + 4.1, { align: 'center' });
    }
  }

  // Ligne de séparation élégante
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.line(14, 33, 196, 33);

  return 37; // Retourne le Y suivant
}

/**
 * Dessine l'en-tête compact de continuation sur les pages suivantes (Page 2+)
 */
function drawContinuationHeader(
  doc: jsPDF,
  params: Parametres,
  docType: 'FACTURE' | 'DEVIS',
  docNumero: string
): number {
  doc.setFillColor(cInk[0], cInk[1], cInk[2]);
  doc.rect(0, 0, 210, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  const nom = params.entreprise.nom || 'AFRIQUE-CHINA SOURCING PRO';
  doc.text(`${nom}   —   ${docType} N° ${docNumero} (suite)`, 14, 8);

  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.line(14, 11, 196, 11);

  return 15;
}

/**
 * Ajoute la numérotation "Page X / Y" et le pied de page officiel sur toutes les pages.
 */
function finalizeDocumentPages(doc: jsPDF, params: Parametres): void {
  const totalPages = doc.getNumberOfPages();
  const nomEntreprise = params.entreprise.nom || 'AFRIQUE-CHINA SOURCING PRO';

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Ligne fine séparatrice de bas de page
    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.line(14, 284, 196, 284);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
    doc.text(`${nomEntreprise} • Document officiel de gestion commerciale`, 14, 288.5);
    doc.text(`Page ${p} sur ${totalPages}`, 196, 288.5, { align: 'right' });
  }
}

// =========================================================================
// 1. GÉNÉRATION PDF DEVIS (PROPOSITION COMMERCIALE VISUELLE)
// =========================================================================
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

  // 1. En-tête Commun
  let curY = drawCommonHeader(doc, params, 'DEVIS', devis.numero, devis.date);

  // 2. Blocs Client & Informations Devis (Côte à côte)
  const clientBoxY = curY;
  const boxHeight = 27;

  // Bloc Client (Gauche)
  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(14, clientBoxY, 98, boxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(14, clientBoxY, 98, boxHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  doc.text('CLIENT DESTINATAIRE', 18, clientBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(client ? client.nom : 'Client particulier', 18, clientBoxY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);

  let cInfoY = clientBoxY + 16.5;
  if (client?.telephone) {
    const waText = client.whatsapp && client.whatsapp !== client.telephone ? `   •   WA : ${client.whatsapp}` : '';
    doc.text(`Tél : ${client.telephone}${waText}`, 18, cInfoY);
    cInfoY += 4.5;
  }
  if (client?.ville || client?.quartier || client?.adresse) {
    const adr = [client.ville, client.quartier, client.adresse].filter(Boolean).join(' - ');
    const truncatedAdr = adr.length > 50 ? `${adr.substring(0, 48)}...` : adr;
    doc.text(`Ville / Adresse : ${truncatedAdr}`, 18, cInfoY);
  }

  // Bloc Informations Devis (Droite)
  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(116, clientBoxY, 80, boxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(116, clientBoxY, 80, boxHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  doc.text('INFORMATIONS DEVIS', 120, clientBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
  doc.text(`Date d'émission : ${formatDate(devis.date)}`, 120, clientBoxY + 11.5);
  doc.text(`Statut : ${devis.statut}`, 120, clientBoxY + 16.5);
  doc.text(`Validité : 7 jours sous réserve stocks Chine`, 120, clientBoxY + 21.5);

  curY = clientBoxY + boxHeight + 6;

  // 3. Tableau des Articles (Photos Produits Obligatoires)
  const drawDevisTableHeader = (startY: number) => {
    doc.setFillColor(cInk[0], cInk[1], cInk[2]);
    doc.rect(14, startY, 182, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PHOTO', 24, startY + 5, { align: 'center' });
    doc.text('ARTICLE / DÉSIGNATION', 38, startY + 5);
    doc.text(`P.U. (${params.devise})`, 146, startY + 5, { align: 'right' });
    doc.text('QTÉ', 162, startY + 5, { align: 'center' });
    doc.text(`TOTAL (${params.devise})`, 192, startY + 5, { align: 'right' });
  };

  drawDevisTableHeader(curY);
  curY += 7.5;

  const rowHeight = 17; // Hauteur uniforme optimale pour vignette photo 13x13mm
  const photoSize = 13;

  devis.articles.forEach((art, idx) => {
    // Gestion multi-pages dynamique
    if (curY + rowHeight > 265) {
      doc.addPage();
      curY = drawContinuationHeader(doc, params, 'DEVIS', devis.numero);
      drawDevisTableHeader(curY);
      curY += 7.5;
    }

    // Fond alterné
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(14, curY, 182, rowHeight, 'F');
    }
    doc.setDrawColor(cBorderSubtle[0], cBorderSubtle[1], cBorderSubtle[2]);
    doc.line(14, curY + rowHeight, 196, curY + rowHeight);

    // Photo Produit Obligatoire (Taille uniforme & proportions conservées)
    const photoBoxX = 18;
    const photoBoxY = curY + 2;

    if (art.photo) {
      const drawn = drawContainedImage(doc, art.photo, photoBoxX, photoBoxY, photoSize, photoSize);
      if (!drawn) {
        drawNeutralPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoSize);
      }
    } else {
      // Emplacement neutre et discret (JAMAIS "Sans photo")
      drawNeutralPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoSize);
    }

    // Désignation & Spécifications
    doc.setTextColor(cDark[0], cDark[1], cDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    const splitTitle = doc.splitTextToSize(art.nomProduit, 82);
    doc.text(splitTitle[0] || art.nomProduit, 38, curY + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
    if (art.description) {
      const descLine = art.description.length > 58 ? `${art.description.substring(0, 55)}...` : art.description;
      doc.text(descLine, 38, curY + 10.2);
    }
    if (art.lienAlibaba) {
      doc.setFontSize(6.5);
      doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
      doc.text('Réf / Fournisseur Chine vérifié', 38, curY + 14);
    }

    // Prix et Quantité
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(cDark[0], cDark[1], cDark[2]);
    doc.text(formatPdfCurrency(art.prixUnitaire, '').trim(), 146, curY + 9.5, { align: 'right' });
    doc.text(String(art.quantite), 162, curY + 9.5, { align: 'center' });

    // Total ligne
    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(art.total, '').trim(), 192, curY + 9.5, { align: 'right' });

    curY += rowHeight;
  });

  // 4. Récapitulatif Financier & Conditions
  const totalsNeededHeight = 55;
  if (curY + totalsNeededHeight > 268) {
    doc.addPage();
    curY = drawContinuationHeader(doc, params, 'DEVIS', devis.numero);
  }

  curY += 6;
  const startRecapY = curY;

  // Conditions & Validité (Gauche)
  const conditionsW = 98;
  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(14, startRecapY, conditionsW, 36, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(14, startRecapY, conditionsW, 36, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.text('CONDITIONS & MODALITÉS DU DEVIS', 18, startRecapY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  const terms = [
    '• Validité : 7 jours sous réserve de confirmation des prix fournisseurs en Chine.',
    '• Lancement des achats après réception de l\'acompte convenu.',
    '• Délais logistiques : dépendants des compagnies de transport partenaires.',
    '• Règlements acceptés : Espèces, TMoney, Flooz, Virement bancaire.',
  ];
  terms.forEach((t, tIdx) => {
    doc.text(t, 18, startRecapY + 11.5 + tIdx * 4.5);
  });

  if (devis.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    const n = devis.notes.length > 55 ? `${devis.notes.substring(0, 52)}...` : devis.notes;
    doc.text(`Note : ${n}`, 18, startRecapY + 31);
  }

  // Bloc Financier Unique (Droite)
  const totalsX = 116;
  const totalsW = 80;
  let finY = startRecapY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
  doc.text('Sous-total articles :', totalsX, finY + 4);
  doc.text(formatPdfCurrency(devis.sousTotal, params.devise), 196, finY + 4, { align: 'right' });

  if (devis.fraisLivraisonChine > 0) {
    finY += 5.5;
    doc.text('Livraison locale en Chine :', totalsX, finY + 4);
    doc.text(formatPdfCurrency(devis.fraisLivraisonChine, params.devise), 196, finY + 4, { align: 'right' });
  }

  if (devis.fraisTransaction > 0) {
    finY += 5.5;
    doc.text(`Frais transaction (${devis.fraisTransactionPourcent || 5} %) :`, totalsX, finY + 4);
    doc.text(formatPdfCurrency(devis.fraisTransaction, params.devise), 196, finY + 4, { align: 'right' });
  }

  // TOTAL DU DEVIS (L'un des éléments les plus visibles)
  finY += 7.5;
  doc.setFillColor(cInk[0], cInk[1], cInk[2]);
  doc.roundedRect(totalsX - 2, finY, totalsW + 2, 11, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TOTAL DU DEVIS :', totalsX + 2, finY + 7.2);
  doc.text(formatPdfCurrency(devis.total, params.devise), 194, finY + 7.2, { align: 'right' });

  // 5. Finalisation des pages et pieds de page
  finalizeDocumentPages(doc, params);

  const blob = doc.output('blob');
  return { blob, filename, doc };
}

// =========================================================================
// 2. GÉNÉRATION PDF FACTURE (DOCUMENT DE FACTURATION ET DE RÈGLEMENT)
// =========================================================================
export function generateFacturePDF(
  facture: Facture,
  client: Client | undefined,
  params: Parametres,
  paiementsList?: Paiement[]
): { blob: Blob; filename: string; doc: jsPDF } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const clientName = client ? client.nom.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Client';
  const filename = `${facture.numero}_${clientName}.pdf`;

  // Vérification stricte des statuts
  const isPayee = facture.solde <= 0 || facture.statut === 'Payée' || facture.statut === 'PAYÉ';
  const isPartielle =
    !isPayee &&
    (facture.montantPaye > 0 ||
      facture.statut === 'Partiellement payée' ||
      facture.statut === 'PARTIELLEMENT PAYÉ');

  // Badge unique dans l'en-tête (SEULE indication visuelle du statut de paiement dans toute la facture)
  let headerBadge: { text: string; type: 'paid' | 'partial' | 'unpaid' } = {
    text: 'À PAYER',
    type: 'unpaid',
  };
  if (isPayee) {
    headerBadge = { text: '✓ PAYÉE / SOLDÉE', type: 'paid' };
  } else if (isPartielle) {
    headerBadge = { text: '🟠 PARTIELLEMENT PAYÉE', type: 'partial' };
  }

  // 1. En-tête Commun
  let curY = drawCommonHeader(doc, params, 'FACTURE', facture.numero, facture.date, headerBadge);

  // 2. Blocs Client & Informations Facture (Côte à côte)
  const clientBoxY = curY;
  const boxHeight = 27;

  // Bloc FACTURÉ À (Gauche)
  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(14, clientBoxY, 98, boxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(14, clientBoxY, 98, boxHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  doc.text('FACTURÉ À', 18, clientBoxY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(client ? client.nom : 'Client particulier', 18, clientBoxY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);

  let cInfoY = clientBoxY + 16.5;
  if (client?.telephone) {
    const waText = client.whatsapp && client.whatsapp !== client.telephone ? `   •   WA : ${client.whatsapp}` : '';
    doc.text(`Tél : ${client.telephone}${waText}`, 18, cInfoY);
    cInfoY += 4.5;
  }
  if (client?.ville || client?.quartier || client?.adresse) {
    const adr = [client.ville, client.quartier, client.adresse].filter(Boolean).join(' - ');
    const truncatedAdr = adr.length > 50 ? `${adr.substring(0, 48)}...` : adr;
    doc.text(`Ville / Adresse : ${truncatedAdr}`, 18, cInfoY);
  }

  // Bloc INFORMATIONS FACTURE (Droite)
  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(116, clientBoxY, 80, boxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(116, clientBoxY, 80, boxHeight, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  doc.text('INFORMATIONS FACTURE', 120, clientBoxY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
  doc.text(`Date d'émission : ${formatDate(facture.date)}`, 120, clientBoxY + 11.5);

  const refCommande = facture.commandeId
    ? `Réf. Commande : ${facture.commandeId}`
    : facture.devisId
    ? `Réf. Devis : ${facture.devisId}`
    : 'Facture directe';
  doc.text(refCommande.length > 28 ? `${refCommande.substring(0, 26)}...` : refCommande, 120, clientBoxY + 16.5);

  const echeance = facture.dateEcheance ? `Échéance : ${formatDate(facture.dateEcheance)}` : 'Règlement : Comptant';
  doc.text(echeance, 120, clientBoxY + 21.5);

  curY = clientBoxY + boxHeight + 6;

  // 3. Tableau des Articles
  // Règle photos : Si les produits n'ont AUCUNE photo, supprimer simplement la colonne photo !
  const hasAnyPhoto = facture.articles.some((art) => !!art.photo);

  const drawFactureTableHeader = (startY: number) => {
    doc.setFillColor(cInk[0], cInk[1], cInk[2]);
    doc.rect(14, startY, 182, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    if (hasAnyPhoto) {
      doc.text('PHOTO', 24, startY + 5, { align: 'center' });
      doc.text('ARTICLE / DÉSIGNATION', 38, startY + 5);
      doc.text(`P.U. (${params.devise})`, 146, startY + 5, { align: 'right' });
      doc.text('QTÉ', 162, startY + 5, { align: 'center' });
      doc.text(`TOTAL (${params.devise})`, 192, startY + 5, { align: 'right' });
    } else {
      // Pas de colonne photo : N° en première colonne et colonne désignation élargie
      doc.text('N°', 19, startY + 5, { align: 'center' });
      doc.text('ARTICLE / DÉSIGNATION', 30, startY + 5);
      doc.text(`P.U. (${params.devise})`, 146, startY + 5, { align: 'right' });
      doc.text('QTÉ', 162, startY + 5, { align: 'center' });
      doc.text(`TOTAL (${params.devise})`, 192, startY + 5, { align: 'right' });
    }
  };

  drawFactureTableHeader(curY);
  curY += 7.5;

  // Hauteur de ligne adaptée
  const rowHeight = hasAnyPhoto ? 16 : 10.5;
  const photoSize = 12;

  facture.articles.forEach((art, idx) => {
    if (curY + rowHeight > 265) {
      doc.addPage();
      curY = drawContinuationHeader(doc, params, 'FACTURE', facture.numero);
      drawFactureTableHeader(curY);
      curY += 7.5;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(14, curY, 182, rowHeight, 'F');
    }
    doc.setDrawColor(cBorderSubtle[0], cBorderSubtle[1], cBorderSubtle[2]);
    doc.line(14, curY + rowHeight, 196, curY + rowHeight);

    if (hasAnyPhoto) {
      // Photo disponible
      const photoBoxX = 18;
      const photoBoxY = curY + 2;

      if (art.photo) {
        const drawn = drawContainedImage(doc, art.photo, photoBoxX, photoBoxY, photoSize, photoSize);
        if (!drawn) {
          drawNeutralPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoSize);
        }
      } else {
        drawNeutralPhotoPlaceholder(doc, photoBoxX, photoBoxY, photoSize);
      }

      // Désignation avec photo
      doc.setTextColor(cDark[0], cDark[1], cDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      const splitTitle = doc.splitTextToSize(art.nomProduit, 82);
      doc.text(splitTitle[0] || art.nomProduit, 38, curY + 5.8);

      if (art.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
        const descLine = art.description.length > 58 ? `${art.description.substring(0, 55)}...` : art.description;
        doc.text(descLine, 38, curY + 10.2);
      }
    } else {
      // Sans colonne photo (Plus aéré et compact)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
      doc.text(String(idx + 1), 19, curY + 6.5, { align: 'center' });

      doc.setTextColor(cDark[0], cDark[1], cDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      const splitTitle = doc.splitTextToSize(art.nomProduit, 94);
      doc.text(splitTitle[0] || art.nomProduit, 30, curY + 5);

      if (art.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
        const descLine = art.description.length > 68 ? `${art.description.substring(0, 65)}...` : art.description;
        doc.text(descLine, 30, curY + 8.8);
      }
    }

    // Prix, Quantité et Total
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(cDark[0], cDark[1], cDark[2]);
    const verticalAlign = hasAnyPhoto ? curY + 9 : curY + 6.5;

    doc.text(formatPdfCurrency(art.prixUnitaire, '').trim(), 146, verticalAlign, { align: 'right' });
    doc.text(String(art.quantite), 162, verticalAlign, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(art.total, '').trim(), 192, verticalAlign, { align: 'right' });

    curY += rowHeight;
  });

  // 4. Récapitulatif Financier & Modalités de règlement
  const neededRecapHeight = 44;
  if (curY + neededRecapHeight > 268) {
    doc.addPage();
    curY = drawContinuationHeader(doc, params, 'FACTURE', facture.numero);
  }

  curY += 6;
  const startRecapY = curY;
  const boxH = 34;

  // Modalités de règlement (Gauche) - Factuelle, sobre et neutre
  const leftBoxW = 98;
  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(14, startRecapY, leftBoxW, boxH, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(14, startRecapY, leftBoxW, boxH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.text('MODALITÉS DE RÈGLEMENT', 18, startRecapY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
  doc.text('• Modes acceptés : Espèces, TMoney, Flooz, Virement bancaire.', 18, startRecapY + 12);
  doc.text('• Règlement attendu selon les conditions de la commande.', 18, startRecapY + 17.5);
  doc.text('• Un reçu officiel est émis pour chaque versement.', 18, startRecapY + 23);

  if (facture.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
    const n = facture.notes.length > 55 ? `${facture.notes.substring(0, 52)}...` : facture.notes;
    doc.text(`Note : ${n}`, 18, startRecapY + 29);
  } else {
    doc.setFontSize(6.8);
    doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
    doc.text('Merci pour votre confiance et votre collaboration.', 18, startRecapY + 29);
  }

  // Récapitulatif Financier (Droite) - Uniquement les données financières, sans répétition de statut
  const totalsX = 116;
  const totalsW = 80;

  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(totalsX, startRecapY, totalsW, boxH, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(totalsX, startRecapY, totalsW, boxH, 1.5, 1.5, 'S');

  const hasFrais = facture.frais > 0;
  let finY = startRecapY + (hasFrais ? 5.2 : 6.2);

  // Sous-total articles
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
  doc.text('Sous-total articles :', totalsX + 4, finY);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  doc.text(formatPdfCurrency(facture.sousTotal, params.devise), 192, finY, { align: 'right' });

  if (hasFrais) {
    finY += 4.8;
    doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
    doc.text('Livraison & frais annexes :', totalsX + 4, finY);
    doc.setTextColor(cDark[0], cDark[1], cDark[2]);
    doc.text(formatPdfCurrency(facture.frais, params.devise), 192, finY, { align: 'right' });
  }

  // Ligne de séparation fine
  finY += 2.8;
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.line(totalsX + 4, finY, 192, finY);

  // TOTAL FACTURE
  finY += 4.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.text('TOTAL FACTURE :', totalsX + 4, finY);
  doc.text(formatPdfCurrency(facture.total, params.devise), 192, finY, { align: 'right' });

  // Montant payé
  finY += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(cSlate[0], cSlate[1], cSlate[2]);
  doc.text('Montant payé :', totalsX + 4, finY);
  doc.setTextColor(cDark[0], cDark[1], cDark[2]);
  const montantPayeVal = facture.montantPaye || 0;
  doc.text(formatPdfCurrency(montantPayeVal, params.devise), 192, finY, { align: 'right' });

  // Ligne de séparation fine
  finY += 2.6;
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.line(totalsX + 4, finY, 192, finY);

  // Solde restant
  finY += 4.6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.text('Solde restant :', totalsX + 4, finY);
  const soldeRestantVal = isPayee ? 0 : Math.max(0, facture.solde);
  doc.text(formatPdfCurrency(soldeRestantVal, params.devise), 192, finY, { align: 'right' });

  curY = startRecapY + boxH + 6;

  // 5. Historique Compact des Règlements Reçus
  if (paiementsList && paiementsList.length > 0) {
    const payHistoryHeight = 14 + paiementsList.length * 5.5;
    if (curY + payHistoryHeight > 268) {
      doc.addPage();
      curY = drawContinuationHeader(doc, params, 'FACTURE', facture.numero);
    }

    doc.setFillColor(cInk[0], cInk[1], cInk[2]);
    doc.rect(14, curY, 182, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(`PAIEMENTS REÇUS — ${paiementsList.length}`, 16, curY + 4.2);

    curY += 6;

    // En-tête de colonnes des paiements
    doc.setFillColor(244, 244, 245);
    doc.rect(14, curY, 182, 5, 'F');
    doc.setTextColor(cDark[0], cDark[1], cDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('DATE', 16, curY + 3.6);
    doc.text('MODE', 44, curY + 3.6);
    doc.text('RÉFÉRENCE & NOTE', 80, curY + 3.6);
    doc.text(`MONTANT (${params.devise})`, 192, curY + 3.6, { align: 'right' });

    curY += 5;

    paiementsList.forEach((p, pIdx) => {
      if (curY + 5.5 > 270) {
        doc.addPage();
        curY = drawContinuationHeader(doc, params, 'FACTURE', facture.numero);
      }

      if (pIdx % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(14, curY, 182, 5.2, 'F');
      }
      doc.setDrawColor(cBorderSubtle[0], cBorderSubtle[1], cBorderSubtle[2]);
      doc.line(14, curY + 5.2, 196, curY + 5.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(cDark[0], cDark[1], cDark[2]);
      doc.text(formatDate(p.date), 16, curY + 3.8);
      doc.text(p.modePaiement, 44, curY + 3.8);

      const refNote = p.reference ? `${p.reference}${p.note ? ` - ${p.note}` : ''}` : p.note || '-';
      const refTrunc = refNote.length > 44 ? `${refNote.substring(0, 42)}...` : refNote;
      doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
      doc.text(refTrunc, 80, curY + 3.8);

      doc.setTextColor(cDark[0], cDark[1], cDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(p.montant, '').trim(), 192, curY + 3.8, { align: 'right' });

      curY += 5.2;
    });

    curY += 4;
  }

  // 6. Mentions Légales & Pièce Justificative (Zone finale sobre et compacte)
  const noticeH = 14;
  if (curY + noticeH > 275) {
    doc.addPage();
    curY = drawContinuationHeader(doc, params, 'FACTURE', facture.numero);
  }

  doc.setFillColor(cCardBg[0], cCardBg[1], cCardBg[2]);
  doc.roundedRect(14, curY, 182, noticeH, 1.5, 1.5, 'F');
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.roundedRect(14, curY, 182, noticeH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(cInk[0], cInk[1], cInk[2]);
  doc.text('MENTIONS LÉGALES & CONDITIONS', 18, curY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(cMuted[0], cMuted[1], cMuted[2]);
  const mentionText =
    params.mentionsLegalesDefaut ||
    'Document officiel attestant des prestations facturées et des règlements enregistrés. Tout retard de paiement est soumis aux conditions générales.';
  doc.text(mentionText, 18, curY + 9.5);

  // 7. Finalisation des pages et pieds de page
  finalizeDocumentPages(doc, params);

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
  const isPayee = facture.solde <= 0 || facture.statut === 'Payée' || facture.statut === 'PAYÉ';
  const isPartielle =
    !isPayee &&
    (facture.montantPaye > 0 ||
      facture.statut === 'Partiellement payée' ||
      facture.statut === 'PARTIELLEMENT PAYÉ');

  let statutLigne = `• Statut : *${facture.statut}*`;
  let conclusion = 'Merci pour votre confiance.';

  if (isPayee) {
    statutLigne = `• Statut : *PAYÉE / SOLDÉE (Règlement intégral)*\n• Reste à payer : *0 FCFA*`;
    conclusion = 'Nous confirmons la bonne réception de l\'intégralité de votre règlement.\nMerci infiniment pour votre confiance !';
  } else if (isPartielle) {
    statutLigne = `• Statut : *PARTIELLEMENT PAYÉE*\n• Montant réglé : *${payeFormatte} FCFA*\n• Solde restant : *${soldeFormatte} FCFA*`;
    conclusion = 'Nous vous remercions pour votre acompte. Le solde restant sera dû selon les modalités convenues.';
  } else {
    statutLigne = `• Statut : *${facture.statut}*\n• Reste à payer : *${soldeFormatte} FCFA*`;
  }

  return `Bonjour ${clientNom},

Voici votre *Facture N° ${facture.numero}* :
• Montant total : *${totalFormatte} FCFA*
${statutLigne}

${conclusion}

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
