import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Package,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  Search,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Truck,
  Building2,
} from 'lucide-react';
import { Client, Devis, Commande, Paiement, Facture, Sourcing, TabType } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ClientDetailModalProps {
  client: Client | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onNewDevis: (client: Client) => void;
  onSelectDevis: (devis: Devis) => void;
  onSelectCommande: (commande: Commande) => void;
  onSelectFacture?: (facture: Facture) => void;
  onSelectPaiement?: (paiement: Paiement) => void;
  onSelectSourcing?: (sourcing: Sourcing) => void;
  onNavigateToTab?: (tab: TabType) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onEdit,
  onNewDevis,
  onSelectDevis,
  onSelectCommande,
  onSelectFacture,
  onSelectPaiement,
  onSelectSourcing,
  onNavigateToTab,
}) => {
  const {
    devis,
    commandes,
    paiements,
    factures,
    sourcingList,
    archiveClient,
    unarchiveClient,
    deleteClient,
    showToast,
    parametres,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'commandes' | 'devis' | 'factures' | 'paiements' | 'sourcings'>('commandes');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [selectedReceiptPaiement, setSelectedReceiptPaiement] = useState<Paiement | null>(null);

  if (!client) return null;

  // Filter client data from real existing application collections
  const clientDevis = devis.filter((d) => d.clientId === client.id);
  const clientCommandes = commandes.filter((c) => c.clientId === client.id);
  const clientPaiements = paiements.filter((p) => p.clientId === client.id);
  const clientFactures = factures.filter((f) => f.clientId === client.id);
  const clientSourcings = (sourcingList || []).filter((s) => s.clientId === client.id);

  // 360° Financial Calculations for this client
  const totalCommande = clientCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0);
  const totalPaye = clientCommandes.reduce((acc, c) => acc + (c.montantPaye || 0), 0);
  const resteAEncaisser = Math.max(0, totalCommande - totalPaye);

  // Devis en attente
  const devisEnAttente = clientDevis.filter(
    (d) => d.statut === 'Envoyé' || d.statut === 'Brouillon'
  );
  const totalDevisMontant = clientDevis.reduce((acc, d) => acc + (d.total || 0), 0);

  // Factures impayées
  const facturesImpayees = clientFactures.filter(
    (f) => (f.solde || 0) > 0 && f.statut !== 'Annulée'
  );
  const totalFacturesImpayees = facturesImpayees.reduce((acc, f) => acc + (f.solde || 0), 0);

  // Sourcings en cours (statuts actifs non clôturés)
  const sourcingsEnCours = clientSourcings.filter(
    (s) =>
      s.statut !== 'Validé' &&
      s.statut !== 'Refusé' &&
      s.statut !== 'Abandonné' &&
      s.statut !== 'Transformé en devis'
  );

  // Total paiements réels reçus
  const totalPaiementsReçus = clientPaiements.reduce((acc, p) => acc + (p.montant || 0), 0);

  const cleanPhoneForWa = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  const handleCopyPhone = (phone: string) => {
    try {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
      showToast('✓ Numéro copié dans le presse-papier !', 'info');
    } catch {
      showToast('Numéro : ' + phone, 'info');
    }
  };

  const handleDelete = () => {
    deleteClient(client.id);
    showToast(`Client ${client.nom} supprimé`, 'info');
    onClose();
  };

  const handleToggleArchive = () => {
    if (client.isArchived) {
      unarchiveClient(client.id);
      showToast(`✓ Client ${client.nom} restauré`, 'success');
    } else {
      archiveClient(client.id);
      showToast(`Client ${client.nom} archivé`, 'info');
    }
    setConfirmArchive(false);
    onClose();
  };

  // Cross-Navigation handlers
  const handleOpenCommande = (cmd: Commande) => {
    onSelectCommande(cmd);
    onClose();
  };

  const handleOpenDevis = (d: Devis) => {
    onSelectDevis(d);
    onClose();
  };

  const handleOpenFacture = (f: Facture) => {
    if (onSelectFacture) {
      onSelectFacture(f);
      onClose();
    } else if (onNavigateToTab) {
      onNavigateToTab('factures');
      onClose();
    }
  };

  const handleOpenPaiement = (p: Paiement) => {
    if (p.commandeId) {
      const linkedCmd = clientCommandes.find((c) => c.id === p.commandeId);
      if (linkedCmd) {
        onSelectCommande(linkedCmd);
        onClose();
        return;
      }
    }
    setSelectedReceiptPaiement(p);
  };

  const handleOpenSourcing = (s: Sourcing) => {
    if (onSelectSourcing) {
      onSelectSourcing(s);
      onClose();
    } else if (onNavigateToTab) {
      onNavigateToTab('sourcing');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111827] rounded-2xl max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-neutral-950 p-4 sm:p-5 text-white relative border-b border-neutral-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-neutral-200 to-white text-neutral-950 font-black text-lg flex items-center justify-center shadow-md shrink-0">
              {client.nom.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  {client.nom} {client.prenom || ''}
                </h3>
                {client.isArchived && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Archivé
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Client depuis le {formatDate(client.dateCreation)} • ID: <span className="font-mono text-[11px] text-neutral-300">{client.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>

          {/* Quick Communication & Management Actions (Android Touch-Friendly >= 44px) */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <a
              href={`tel:${client.telephone}`}
              className="flex-1 min-w-[90px] h-10 px-3 bg-white/10 hover:bg-white/20 active:scale-98 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Appeler</span>
            </a>
            <a
              href={`https://wa.me/${cleanPhoneForWa(client.whatsapp || client.telephone)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-[100px] h-10 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={() => onEdit(client)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Modifier la fiche client"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setConfirmArchive(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                client.isArchived
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                  : 'bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white'
              }`}
              title={client.isArchived ? 'Restaurer ce client' : 'Archiver ce client'}
            >
              {client.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setConfirmDelete(true)}
              className="w-10 h-10 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              title="Supprimer définitivement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Confirmation Archive Dialog */}
        {confirmArchive && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 flex items-start gap-3">
            <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {client.isArchived ? 'Restaurer ce client ?' : 'Archiver ce client ?'}
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                {client.isArchived
                  ? 'Le client réapparaîtra dans la liste principale des clients actifs.'
                  : 'Le client sera masqué de la vue active mais toutes ses commandes, devis et factures resteront conservés.'}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleToggleArchive}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  {client.isArchived ? 'Oui, restaurer' : 'Oui, archiver'}
                </button>
                <button
                  onClick={() => setConfirmArchive(false)}
                  className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Delete Dialog */}
        {confirmDelete && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-900 dark:text-rose-200">
                Confirmer la suppression définitive du client ?
              </p>
              <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                Cette action supprime la fiche contact. Les commandes et factures historiques liées sont conservées conformément aux règles d’audit.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* 360° SYNTHÈSE METRICS: Commandes, Reste à encaisser, Devis, Factures, Sourcings */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Vision Commerciale & Financière 360°</span>
              </h4>
              <span className="text-[10px] text-neutral-400">Calculs réels vérifiés</span>
            </div>

            {/* Main Financial KPIs Grid (Row 1) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Total Commandé */}
              <div
                onClick={() => setActiveTab('commandes')}
                className="bg-neutral-50 dark:bg-neutral-900/70 p-2.5 sm:p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <span className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold block uppercase">
                  Commandes ({clientCommandes.length})
                </span>
                <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate font-mono mt-0.5">
                  {formatCurrency(totalCommande, parametres.devise)}
                </p>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium block truncate mt-0.5">
                  {clientCommandes.length > 0 ? `${clientCommandes.length} commande(s)` : 'Aucune'}
                </span>
              </div>

              {/* Total Encaissé */}
              <div
                onClick={() => setActiveTab('paiements')}
                className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 sm:p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-center cursor-pointer hover:border-emerald-400 transition-colors"
              >
                <span className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block uppercase">
                  Encaissé
                </span>
                <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate font-mono mt-0.5">
                  {formatCurrency(totalPaye, parametres.devise)}
                </p>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block truncate mt-0.5">
                  {clientPaiements.length} versement(s)
                </span>
              </div>

              {/* Reste à Encaisser */}
              <div
                onClick={() => setActiveTab(resteAEncaisser > 0 ? 'commandes' : 'paiements')}
                className={`p-2.5 sm:p-3 rounded-xl border text-center cursor-pointer transition-colors ${
                  resteAEncaisser > 0
                    ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-400'
                    : 'bg-neutral-50 dark:bg-neutral-900/70 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold block uppercase ${
                    resteAEncaisser > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  Reste à encaisser
                </span>
                <p
                  className={`text-xs sm:text-sm font-bold truncate font-mono mt-0.5 ${
                    resteAEncaisser > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {formatCurrency(resteAEncaisser, parametres.devise)}
                </p>
                <span
                  className={`text-[10px] font-medium block truncate mt-0.5 ${
                    resteAEncaisser > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {resteAEncaisser > 0 ? 'Solde à régler' : '✓ À jour'}
                </span>
              </div>
            </div>

            {/* Secondary Activity Indicators (Row 2) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Devis */}
              <div
                onClick={() => setActiveTab('devis')}
                className="bg-neutral-50 dark:bg-neutral-900/50 p-2 sm:p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors text-xs"
              >
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-semibold">Devis</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{clientDevis.length}</span>
                </div>
                {devisEnAttente.length > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                    {devisEnAttente.length} en attente
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400">Aucun en attente</span>
                )}
              </div>

              {/* Factures */}
              <div
                onClick={() => setActiveTab('factures')}
                className="bg-neutral-50 dark:bg-neutral-900/50 p-2 sm:p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors text-xs"
              >
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-semibold">Factures</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{clientFactures.length}</span>
                </div>
                {facturesImpayees.length > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                    {facturesImpayees.length} impayée(s)
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Soldées</span>
                )}
              </div>

              {/* Sourcings */}
              <div
                onClick={() => setActiveTab('sourcings')}
                className="bg-neutral-50 dark:bg-neutral-900/50 p-2 sm:p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between cursor-pointer hover:border-violet-400 transition-colors text-xs"
              >
                <div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-semibold">Sourcings</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{clientSourcings.length}</span>
                </div>
                {sourcingsEnCours.length > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                    {sourcingsEnCours.length} en cours
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400">0 en cours</span>
                )}
              </div>
            </div>
          </div>

          {/* Client Coordonnées & Informations Section */}
          <div className="bg-neutral-50 dark:bg-neutral-900/40 p-3 sm:p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-[11px]">
                Coordonnées & Localisation
              </h4>
              <button
                onClick={() => handleCopyPhone(client.telephone)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPhone ? 'Copié !' : 'Copier n°'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-neutral-700 dark:text-neutral-300 pt-1">
              <div>
                <span className="text-neutral-400 block text-[10px]">Téléphone</span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white">{client.telephone}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">WhatsApp</span>
                <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                  {client.whatsapp || client.telephone}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Ville</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{client.ville || 'Lomé'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px]">Quartier</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{client.quartier || 'Non précisé'}</span>
              </div>
            </div>

            {client.adresse && (
              <div className="pt-1.5 border-t border-neutral-200/60 dark:border-neutral-800">
                <span className="text-neutral-400 block text-[10px]">Adresse complète</span>
                <span className="text-neutral-700 dark:text-neutral-300 font-medium">{client.adresse}</span>
              </div>
            )}

            {client.email && (
              <div className="pt-1">
                <span className="text-neutral-400 block text-[10px]">Email</span>
                <a
                  href={`mailto:${client.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {client.email}
                </a>
              </div>
            )}

            {client.notes && (
              <div className="pt-1.5 border-t border-neutral-200/60 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 p-2 rounded-lg">
                <span className="text-neutral-400 block text-[10px] font-semibold">Notes internes</span>
                <p className="text-neutral-600 dark:text-neutral-300 italic text-[11px] mt-0.5">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Direct CTA: + Nouveau devis pour ce client */}
          <button
            onClick={() => {
              onNewDevis(client);
              onClose();
            }}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un nouveau devis pour ce client</span>
          </button>

          {/* 360° Historique Tabs (Commandes, Devis, Factures, Paiements, Sourcings) */}
          <div className="pt-2">
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
              <button
                onClick={() => setActiveTab('commandes')}
                className={`py-2 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'commandes'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Commandes ({clientCommandes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('devis')}
                className={`py-2 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'devis'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Devis ({clientDevis.length})</span>
                {devisEnAttente.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('factures')}
                className={`py-2 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'factures'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Factures ({clientFactures.length})</span>
                {facturesImpayees.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('paiements')}
                className={`py-2 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'paiements'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Paiements ({clientPaiements.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('sourcings')}
                className={`py-2 px-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'sourcings'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Sourcings ({clientSourcings.length})</span>
              </button>
            </div>

            {/* TAB CONTENT WITH CROSS-NAVIGATION */}
            <div className="pt-3 space-y-2">
              {/* 1. COMMANDES */}
              {activeTab === 'commandes' && (
                clientCommandes.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Package className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p>Aucune commande enregistrée pour ce client.</p>
                  </div>
                ) : (
                  clientCommandes.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleOpenCommande(c)}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group shadow-xs"
                      title="Cliquer pour ouvrir la fiche de commande"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 group-hover:underline">
                              {c.numero}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                              {c.statut}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {formatDate(c.date)} • {c.articles.length} article(s)
                            {c.numeroSuivi && <span className="ml-1 font-mono text-[10px]">({c.numeroSuivi})</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-xs sm:text-sm font-mono text-neutral-900 dark:text-white">
                            {formatCurrency(c.montantTotal, parametres.devise)}
                          </div>
                          <div className="text-[10px] mt-0.5">
                            {c.solde > 0 ? (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                Reste : {formatCurrency(c.solde, parametres.devise)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Soldé</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-400">
                        <span className="truncate max-w-[260px]">
                          {c.articles.map((a) => a.nomProduit).join(', ')}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Ouvrir commande <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* 2. DEVIS */}
              {activeTab === 'devis' && (
                clientDevis.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <FileSpreadsheet className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p>Aucun devis enregistré pour ce client.</p>
                  </div>
                ) : (
                  clientDevis.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleOpenDevis(d)}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer group shadow-xs"
                      title="Cliquer pour ouvrir le devis"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">
                              {d.numero}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                d.statut === 'Accepté' || d.statut === 'Converti en commande'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                  : d.statut === 'Refusé'
                                  ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                                  : d.statut === 'Envoyé'
                                  ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              {d.statut}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {formatDate(d.date)} • {d.articles.length} article(s)
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-xs sm:text-sm font-mono text-neutral-900 dark:text-white">
                            {formatCurrency(d.total, parametres.devise)}
                          </div>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                            Ouvrir devis <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {/* 3. FACTURES */}
              {activeTab === 'factures' && (
                clientFactures.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Receipt className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p>Aucune facture enregistrée pour ce client.</p>
                  </div>
                ) : (
                  clientFactures.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => handleOpenFacture(f)}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group shadow-xs"
                      title="Cliquer pour ouvrir la facture"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {f.numero}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                f.solde === 0 || f.statut === 'Payée'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              {f.statut}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {formatDate(f.date)}
                            {f.commandeId && <span className="ml-1 text-[10px] text-neutral-400">(Issu de commande)</span>}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-xs sm:text-sm font-mono text-neutral-900 dark:text-white">
                            {formatCurrency(f.total, parametres.devise)}
                          </div>
                          <div className="text-[10px] mt-0.5">
                            {f.solde > 0 ? (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                Reste : {formatCurrency(f.solde, parametres.devise)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Réglée</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-end text-[10px] text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Consulter facture</span> <ArrowRight className="w-3 h-3 ml-0.5" />
                      </div>
                    </div>
                  ))
                )
              )}

              {/* 4. PAIEMENTS */}
              {activeTab === 'paiements' && (
                clientPaiements.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <CreditCard className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p>Aucun paiement enregistré pour ce client.</p>
                  </div>
                ) : (
                  clientPaiements.map((p) => {
                    const linkedCmd = clientCommandes.find((c) => c.id === p.commandeId);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleOpenPaiement(p)}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer group shadow-xs"
                        title="Cliquer pour voir les détails du règlement"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                {p.numero}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {p.modePaiement}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{formatDate(p.date)}</span>
                              {linkedCmd && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                                    {linkedCmd.numero}
                                  </span>
                                </>
                              )}
                              {p.reference && (
                                <>
                                  <span>•</span>
                                  <span className="text-neutral-400 font-mono text-[10px]">Réf: {p.reference}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-bold text-xs sm:text-sm font-mono text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(p.montant, parametres.devise)}
                            </div>
                            {linkedCmd && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium inline-flex items-center gap-0.5 mt-0.5">
                                Voir commande <ArrowRight className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        {p.note && (
                          <p className="text-[10px] text-neutral-400 italic mt-1 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
                            Note : {p.note}
                          </p>
                        )}
                      </div>
                    );
                  })
                )
              )}

              {/* 5. SOURCINGS */}
              {activeTab === 'sourcings' && (
                clientSourcings.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Search className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p>Aucun dossier de sourcing pour ce client.</p>
                  </div>
                ) : (
                  clientSourcings.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpenSourcing(s)}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-violet-500 dark:hover:border-violet-500 transition-all cursor-pointer group shadow-xs"
                      title="Cliquer pour accéder au dossier sourcing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-violet-600 dark:text-violet-400">
                              {s.numero}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
                              {s.statut}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-neutral-900 dark:text-white mt-1 truncate">
                            {s.produitRecherche}
                          </h5>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            Demandé le {formatDate(s.dateCreation)}
                            {s.quantiteSouhaitee && <span> • Qté: {s.quantiteSouhaitee}</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {s.prixFournisseur ? (
                            <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white block">
                              {formatCurrency(s.prixFournisseur, parametres.devise)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">Prix en cours</span>
                          )}
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold inline-flex items-center gap-0.5 mt-1">
                            Voir dossier <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
            {clientCommandes.length} commande(s) • {clientDevis.length} devis • {clientFactures.length} facture(s)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-black text-white dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Payment Receipt Pop-over if clicked on payment without direct command */}
      {selectedReceiptPaiement && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-sm w-full p-4 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Détail du Règlement
              </h4>
              <button
                onClick={() => setSelectedReceiptPaiement(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-400">Reçu N°</span>
                <span className="font-mono font-bold">{selectedReceiptPaiement.numero}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-400">Date</span>
                <span>{formatDate(selectedReceiptPaiement.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-400">Mode</span>
                <span className="font-semibold">{selectedReceiptPaiement.modePaiement}</span>
              </div>
              {selectedReceiptPaiement.reference && (
                <div className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-400">Référence</span>
                  <span className="font-mono">{selectedReceiptPaiement.reference}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 font-bold text-sm">
                <span>Montant perçu</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(selectedReceiptPaiement.montant, parametres.devise)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedReceiptPaiement(null)}
              className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
