import { Client, Commande, Devis, Fournisseur, Paiement, Sourcing } from '../types';

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string;
}

export interface SheetsSyncPayload {
  commandes: Commande[];
  devis: Devis[];
  sourcingList: Sourcing[];
  clients: Client[];
  fournisseurs: Fournisseur[];
  paiements: Paiement[];
  devise: string;
}

export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  updatedSheetsCount: number;
  totalRowsCount: number;
}

/**
 * Lists Google Spreadsheets in the user's Google Drive.
 */
export const listUserSpreadsheets = async (
  accessToken: string
): Promise<GoogleSpreadsheetItem[]> => {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,webViewLink,modifiedTime)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Échec de récupération des fichiers Google Sheets: ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
    modifiedTime: f.modifiedTime,
  }));
};

/**
 * Creates a brand new Google Spreadsheet dedicated to Nantor Sourcing App.
 */
export const createDedicatedSpreadsheet = async (
  title: string,
  accessToken: string
): Promise<{ id: string; url: string }> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const sheetTitles = [
    'Commandes',
    'Devis Sourcing',
    'Demandes Sourcing',
    'Clients',
    'Fournisseurs Chine',
    'Paiements',
  ];

  const body = {
    properties: {
      title,
    },
    sheets: sheetTitles.map((t) => ({
      properties: {
        title: t,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    })),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Impossible de créer le classeur Google Sheets : ${err}`);
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
};

/**
 * Clears and populates a specific range in a Google Spreadsheet.
 */
export const writeSheetValues = async (
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<any> => {
  // Clear first
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  // Then update
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur lors de l’écriture des données dans ${range} : ${err}`);
  }

  return await res.json();
};

/**
 * Appends rows to a specific sheet.
 */
export const appendSheetValues = async (
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string
): Promise<any> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur d'ajout de ligne dans ${range} : ${err}`);
  }

  return await res.json();
};

/**
 * Reads values from a Google Spreadsheet range.
 */
export const readSheetValues = async (
  spreadsheetId: string,
  range: string,
  accessToken: string
): Promise<any[][]> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur de lecture de la feuille ${range} : ${err}`);
  }

  const data = await res.json();
  return data.values || [];
};

/**
 * Formats table rows for Commandes
 */
const prepareCommandesRows = (commandes: Commande[], clients: Client[], devise: string): any[][] => {
  const headers = [
    'N° Commande',
    'Date',
    'Client',
    'Téléphone Client',
    'Statut Commande',
    `Montant Total (${devise})`,
    `Montant Payé (${devise})`,
    `Solde Restant (${devise})`,
    'Statut Logistique',
    'N° Suivi Expédition',
    'Transitaire / Cargo',
    'Articles / Description',
  ];

  const rows = commandes.map((cmd) => {
    const client = clients.find((c) => c.id === cmd.clientId);
    const articlesDesc = (cmd.articles || [])
      .map((a) => `${a.nomProduit} (x${a.quantite})`)
      .join(' ; ');

    return [
      cmd.numero,
      cmd.date ? new Date(cmd.date).toLocaleDateString('fr-FR') : '',
      client?.nom || cmd.clientId,
      client?.telephone || '',
      cmd.statut,
      cmd.montantTotal,
      cmd.montantPaye,
      cmd.solde,
      cmd.logistique?.statutLogistique || (cmd.statut === 'En transit' ? 'EN TRANSIT' : cmd.statut === 'Arrivé au Togo' ? 'ARRIVÉ TOGO' : 'EN PRÉPARATION'),
      cmd.numeroSuivi || cmd.logistique?.numeroSuivi || '',
      cmd.logistique?.transporteur || 'Cargo maritime / aérien Lomé',
      articlesDesc,
    ];
  });

  return [headers, ...rows];
};

/**
 * Formats table rows for Devis
 */
const prepareDevisRows = (devisList: Devis[], clients: Client[], devise: string): any[][] => {
  const headers = [
    'N° Devis',
    'Date',
    'Client',
    'Téléphone Client',
    `Sous-Total Articles (${devise})`,
    `Frais Livraison Chine (${devise})`,
    'Frais Transaction %',
    `Frais Transaction (${devise})`,
    `Total Devis (${devise})`,
    'Statut Devis',
    'Détail Articles',
  ];

  const rows = devisList.map((d) => {
    const client = clients.find((c) => c.id === d.clientId);
    const articlesDesc = (d.articles || [])
      .map((a) => `${a.nomProduit} (${a.quantite} pcs à ${a.prixUnitaire} ${devise})`)
      .join(' ; ');

    return [
      d.numero,
      d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
      client?.nom || d.clientId,
      client?.telephone || '',
      d.sousTotal,
      d.fraisLivraisonChine || 0,
      d.fraisTransactionPourcent || 5,
      d.fraisTransaction || 0,
      d.total,
      d.statut,
      articlesDesc,
    ];
  });

  return [headers, ...rows];
};

/**
 * Formats table rows for Sourcing
 */
const prepareSourcingRows = (sourcingList: Sourcing[], clients: Client[]): any[][] => {
  const headers = [
    'N° Demande',
    'Date Création',
    'Client',
    'Produit Recherché',
    'Description / Spécifications',
    'Quantité Souhaitée',
    'Prix Fournisseur Estimé',
    'Fournisseur / Usine',
    'Statut Sourcing',
    'Lien Produit Chine',
  ];

  const rows = sourcingList.map((s) => {
    const client = clients.find((c) => c.id === s.clientId);
    return [
      s.numero,
      s.dateCreation ? new Date(s.dateCreation).toLocaleDateString('fr-FR') : '',
      client?.nom || s.clientId,
      s.produitRecherche,
      s.description || '',
      s.quantiteSouhaitee,
      s.prixFournisseur || '',
      s.fournisseurNom || '',
      s.statut,
      s.lienAlibaba || '',
    ];
  });

  return [headers, ...rows];
};

/**
 * Formats table rows for Clients
 */
const prepareClientsRows = (clients: Client[]): any[][] => {
  const headers = [
    'Nom & Prénom',
    'Téléphone',
    'WhatsApp',
    'Ville',
    'Quartier',
    'Email',
    'Notes',
    'Date Ajout',
  ];

  const rows = clients.map((c) => [
    c.nom,
    c.telephone,
    c.whatsapp,
    c.ville,
    c.quartier || '',
    c.email || '',
    c.notes || '',
    c.dateCreation ? new Date(c.dateCreation).toLocaleDateString('fr-FR') : '',
  ]);

  return [headers, ...rows];
};

/**
 * Formats table rows for Fournisseurs Chine
 */
const prepareFournisseursRows = (fournisseurs: Fournisseur[]): any[][] => {
  const headers = [
    'Nom Entreprise / Boutique',
    'Contact Principal',
    'ID WeChat',
    'Téléphone',
    'Plateforme (1688 / Alibaba)',
    'Ville / Province Chine',
    'Lien Boutique',
    'Note / Évaluation',
    'Spécialités / Catégories',
  ];

  const rows = fournisseurs.map((f) => [
    f.nom,
    f.contactNom || '',
    f.wechat || '',
    f.telephone || '',
    f.boutiqueAlibaba || '1688 / Alibaba',
    f.villeChine || 'Guangzhou / Yiwu',
    f.lienAlibaba || '',
    f.noteFiabilite ? `${f.noteFiabilite} / 5` : '',
    f.categorieProduits || '',
  ]);

  return [headers, ...rows];
};

/**
 * Formats table rows for Paiements
 */
const preparePaiementsRows = (paiements: Paiement[], commandes: Commande[], clients: Client[], devise: string): any[][] => {
  const headers = [
    'N° Reçu',
    'Date',
    'N° Commande',
    'Client',
    `Montant Encaissé (${devise})`,
    'Mode de Paiement (TMoney / Flooz / Espèces)',
    'Référence Transaction',
    'Note',
  ];

  const rows = paiements.map((p) => {
    const cmd = commandes.find((c) => c.id === p.commandeId);
    const client = clients.find((c) => c.id === p.clientId) || (cmd ? clients.find((c) => c.id === cmd.clientId) : undefined);

    return [
      p.numero,
      p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '',
      cmd?.numero || p.commandeId,
      client?.nom || p.clientId,
      p.montant,
      p.modePaiement,
      p.reference || '',
      p.note || '',
    ];
  });

  return [headers, ...rows];
};

/**
 * Synchronizes entire app data to a Google Spreadsheet.
 */
export const syncAllDataToGoogleSheets = async (
  spreadsheetId: string,
  payload: SheetsSyncPayload,
  accessToken: string
): Promise<SyncResult> => {
  const { commandes, devis, sourcingList, clients, fournisseurs, paiements, devise } = payload;

  const sheetsToUpdate = [
    {
      title: 'Commandes',
      rows: prepareCommandesRows(commandes, clients, devise),
    },
    {
      title: 'Devis Sourcing',
      rows: prepareDevisRows(devis, clients, devise),
    },
    {
      title: 'Demandes Sourcing',
      rows: prepareSourcingRows(sourcingList, clients),
    },
    {
      title: 'Clients',
      rows: prepareClientsRows(clients),
    },
    {
      title: 'Fournisseurs Chine',
      rows: prepareFournisseursRows(fournisseurs),
    },
    {
      title: 'Paiements',
      rows: preparePaiementsRows(paiements, commandes, clients, devise),
    },
  ];

  let totalRows = 0;

  for (const sheet of sheetsToUpdate) {
    await writeSheetValues(
      spreadsheetId,
      `'${sheet.title}'!A1:Z${sheet.rows.length + 5}`,
      sheet.rows,
      accessToken
    );
    totalRows += sheet.rows.length;
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    updatedSheetsCount: sheetsToUpdate.length,
    totalRowsCount: totalRows,
  };
};
