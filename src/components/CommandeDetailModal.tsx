import React, { useState } from 'react';
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  DollarSign,
  Eye,
  EyeOff,
  Receipt,
  CreditCard,
  Truck,
  ExternalLink,
  Edit2,
  Trash2,
  Archive,
  Phone,
  MessageCircle,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Commande, Client, CommandeStatut, Rentabilite, Facture, Paiement } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CommandeDetailModalProps {
  commande: Commande | null;
  onClose: () => void;
  onNewPaiement: (commande: Commande) => void;
  onViewFacture: (facture: Facture) => void;
}

export const CommandeDetailModal: React.FC<CommandeDetailModalProps> = ({
  commande,
  onClose,
  onNewPaiement,
  onViewFacture,
}) => {
  const {
    clients,
    paiements,
    factures,
    rentabilites,
    saveRentabilite,
    updateCommandeStatut,
    generateFactureFromCommande,
    archiveCommande,
    deleteCommande,
    parametres,
  } = useApp();

  const [showRentabilite, setShowRentabilite] = useState(false);
  const [editingRentabilite, setEditingRentabilite] = useState(false);
  const [prixAchatChine, setPrixAchatChine] = useState<number>(0);
  const [fraisReels, setFraisReels] = useState<number>(0);

  const [selectedStatut, setSelectedStatut] = useState<CommandeStatut | ''>('');
  const [numeroSuivi, setNumeroSuivi] = useState('');
  const [isEditingTracking, setIsEditingTracking] = useState(false);

  if (!commande) return null;

  const client = clients.find((c) => c.id === commande.clientId);
  const commandePaiements = paiements.filter((p) => p.commandeId === commande.id);
  const commandeFacture = factures.find((f) => f.commandeId === commande.id);

  // Rentabilité data
  const currentRentabilite = rentabilites[commande.id] || {
    commandeId: commande.id,
    prixAchatChine: 0,
    fraisReels: 0,
    prixFacture: commande.montantTotal,
    coutReel: 0,
    benefice: commande.montantTotal,
    marge: 100,
  };

  const handleStartEditRentabilite = () => {
    setPrixAchatChine(currentRentabilite.prixAchatChine || 0);
    setFraisReels(currentRentabilite.fraisReels || 0);
    setEditingRentabilite(true);
  };

  const handleSaveRentabilite = () => {
    saveRentabilite(commande.id, Number(prixAchatChine) || 0, Number(fraisReels) || 0);
    setEditingRentabilite(false);
  };

  const handleStatutChange = (newStatut: CommandeStatut) => {
    updateCommandeStatut(commande.id, newStatut);
  };

  const handleSaveTracking = () => {
    updateCommandeStatut(commande.id, commande.statut, numeroSuivi);
    setIsEditingTracking(false);
  };

  const handleCreateFacture = () => {
    const fac = generateFactureFromCommande(commande.id);
    if (fac) {
      onViewFacture(fac);
    }
  };

  // Timeline steps (Requirement 17)
  const timelineSteps: { key: string; label: string; statuts: CommandeStatut[] }[] = [
    { key: 'step1', label: 'Devis accepté', statuts: ['En attente de paiement', 'Partiellement payé'] },
    { key: 'step2', label: 'Paiement', statuts: ['Partiellement payé', 'Payé'] },
    { key: 'step3', label: 'Commande en Chine', statuts: ['Commande Alibaba'] },
    { key: 'step4', label: 'Produit acheté', statuts: ['Produit acheté', 'En préparation'] },
    { key: 'step5', label: 'Expédition', statuts: ['Expédié de Chine'] },
    { key: 'step6', label: 'Transit', statuts: ['En transit'] },
    { key: 'step7', label: 'Arrivée au Togo', statuts: ['Arrivé au Togo', 'Disponible'] },
    { key: 'step8', label: 'Livraison', statuts: ['Livré'] },
  ];

  // Helper to determine active step in timeline
  const getStepStatus = (stepIndex: number) => {
    const statusOrder: CommandeStatut[] = [
      'En attente de paiement',
      'Partiellement payé',
      'Payé',
      'Commande Alibaba',
      'Produit acheté',
      'En préparation',
      'Expédié de Chine',
      'En transit',
      'Arrivé au Togo',
      'Disponible',
      'Livré',
    ];
    const currentIndex = statusOrder.indexOf(commande.statut);
    // Simplified progression map
    let currentStepProgress = 0;
    if (currentIndex >= 10) currentStepProgress = 7; // Livré
    else if (currentIndex >= 8) currentStepProgress = 6; // Arrivé au Togo
    else if (currentIndex >= 7) currentStepProgress = 5; // Transit
    else if (currentIndex >= 6) currentStepProgress = 4; // Expédition
    else if (currentIndex >= 4) currentStepProgress = 3; // Acheté / prépa
    else if (currentIndex >= 3) currentStepProgress = 2; // Commande Alibaba
    else if (currentIndex >= 1) currentStepProgress = 1; // Paiement
    else currentStepProgress = 0; // Devis accepté

    if (stepIndex < currentStepProgress) return 'completed';
    if (stepIndex === currentStepProgress) return 'active';
    return 'pending';
  };

  const allStatuts: CommandeStatut[] = [
    'En attente de paiement',
    'Partiellement payé',
    'Payé',
    'Commande Alibaba',
    'Produit acheté',
    'En préparation',
    'Expédié de Chine',
    'En transit',
    'Arrivé au Togo',
    'Disponible',
    'Livré',
    'Annulé',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121214] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header - Modern Monochrome */}
        <div className="bg-neutral-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black font-bold flex items-center justify-center text-xs tracking-wider border border-neutral-200">
              CMD
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">{commande.numero}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                  {commande.statut}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Date : {formatDate(commande.date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* CLIENT (Section 17) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Client
              </span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {client?.nom || 'Client inconnu'}
              </h4>
              <p className="text-slate-500 mt-0.5">
                {client?.telephone} • {client?.ville || 'Lomé'}{client?.quartier ? ` (${client.quartier})` : ''}
              </p>
            </div>
            {client && (
              <div className="flex gap-1.5">
                <a
                  href={`tel:${client.telephone}`}
                  className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/${(client.whatsapp || client.telephone).replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-emerald-600 text-white"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* FINANCES (Section 17) */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Total commande
              </span>
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
                {formatCurrency(commande.montantTotal, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Total payé
              </span>
              <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(commande.montantPaye, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Solde restant
              </span>
              <p
                className={`text-sm sm:text-base font-bold font-mono ${
                  commande.solde <= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(commande.solde, parametres.devise)}
              </p>
            </div>
          </div>

          {/* TIMELINE DE SUIVI (Section 17) */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-3">
              Suivi de la commande & Transit
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-center">
              {timelineSteps.map((step, sIdx) => {
                const status = getStepStatus(sIdx);
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                        status === 'completed'
                          ? 'bg-emerald-500 text-white'
                          : status === 'active'
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300 animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {status === 'completed' ? '✓' : sIdx + 1}
                    </div>
                    <span
                      className={`text-[9px] leading-tight ${
                        status === 'active'
                          ? 'font-bold text-blue-600 dark:text-blue-400'
                          : status === 'completed'
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Change Status Dropdown & Tracking Number */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Changer le statut actuel
                </label>
                <select
                  value={commande.statut}
                  onChange={(e) => handleStatutChange(e.target.value as CommandeStatut)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  {allStatuts.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  N° de suivi colis (Guangzhou / Cargo)
                </label>
                {isEditingTracking ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={numeroSuivi}
                      onChange={(e) => setNumeroSuivi(e.target.value)}
                      placeholder="Ex: CAN-GZ-202688"
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      onClick={handleSaveTracking}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-semibold text-xs"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 font-mono text-xs">
                    <span className="text-slate-800 dark:text-slate-200 truncate">
                      {commande.numeroSuivi || 'Non renseigné'}
                    </span>
                    <button
                      onClick={() => {
                        setNumeroSuivi(commande.numeroSuivi || '');
                        setIsEditingTracking(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-semibold text-[11px] ml-2"
                    >
                      Modifier
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PRODUITS COMMANDÉS (Section 17) */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
              Produits commandés ({commande.articles.length})
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
              {commande.articles.map((art, idx) => (
                <div key={art.id || idx} className="p-3 bg-white dark:bg-slate-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {art.photo ? (
                      <img
                        src={art.photo}
                        alt={art.nomProduit}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                        #{idx + 1}
                      </div>
                    )}
                    <div>
                      <h5 className="font-semibold text-slate-900 dark:text-white">
                        {art.nomProduit}
                      </h5>
                      {art.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{art.description}</p>
                      )}
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatCurrency(art.prixUnitaire, parametres.devise)} × {art.quantite}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold font-mono text-sm text-slate-900 dark:text-white text-right shrink-0">
                    {formatCurrency(art.total, parametres.devise)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PAIEMENTS REÇUS SUR CETTE COMMANDE */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Historique des versements ({commandePaiements.length})
              </h4>
              <button
                onClick={() => onNewPaiement(commande)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                + Enregistrer un paiement
              </button>
            </div>

            {commandePaiements.length === 0 ? (
              <p className="text-slate-400 text-center py-2 italic text-xs">
                Aucun versement enregistré pour cette commande.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {commandePaiements.map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{p.numero}</span>
                      <span className="text-slate-400 ml-2">{formatDate(p.date)}</span>
                      <div className="text-[11px] text-slate-500">{p.modePaiement} {p.reference ? `• Réf: ${p.reference}` : ''}</div>
                    </div>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(p.montant, parametres.devise)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTION FACTURE (Section 21) */}
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
            <div>
              <h5 className="font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                Facturation Client
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {commandeFacture
                  ? `Facture ${commandeFacture.numero} générée`
                  : 'Générez la facture officielle avec montants & solde'}
              </p>
            </div>
            {commandeFacture ? (
              <button
                onClick={() => onViewFacture(commandeFacture)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1"
              >
                <Receipt className="w-3.5 h-3.5" />
                Voir facture
              </button>
            ) : (
              <button
                onClick={handleCreateFacture}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Receipt className="w-3.5 h-3.5" />
                Générer facture
              </button>
            )}
          </div>

          {/* RENTABILITÉ INTERNE — SECTION STRICTEMENT PRIVÉE (Sections 22, 23, 24) */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                  RENTABILITÉ — PRIVÉ (CONFIDENTIEL)
                </h4>
              </div>
              <button
                onClick={() => setShowRentabilite(!showRentabilite)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
              >
                {showRentabilite ? (
                  <>
                    <EyeOff className="w-3 h-3" /> Masquer
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" /> Afficher
                  </>
                )}
              </button>
            </div>

            {showRentabilite && (
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <p className="text-[11px] text-slate-400">
                  Ces données de marge et de coût chinois restent strictement privées et ne figurent sur aucun document client.
                </p>

                {editingRentabilite ? (
                  <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Prix d'achat Chine (montant réel fournisseur)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prixAchatChine === 0 ? '' : prixAchatChine}
                        onChange={(e) => setPrixAchatChine(parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 80 000 FCFA"
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                        Frais réels supplémentaires (transport, dédouanement...)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={fraisReels === 0 ? '' : fraisReels}
                        onChange={(e) => setFraisReels(parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 15 000 FCFA"
                        className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveRentabilite}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs"
                      >
                        Enregistrer & Calculer
                      </button>
                      <button
                        onClick={() => setEditingRentabilite(false)}
                        className="py-1.5 px-3 bg-slate-800 text-slate-300 rounded font-semibold text-xs"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Prix d'achat Chine</span>
                        <span className="font-mono font-bold text-sm text-slate-200">
                          {formatCurrency(currentRentabilite.prixAchatChine, parametres.devise)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Frais réels</span>
                        <span className="font-mono font-bold text-sm text-slate-200">
                          {formatCurrency(currentRentabilite.fraisReels, parametres.devise)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Coût réel total</span>
                        <span className="font-mono font-bold text-sm text-amber-400">
                          {formatCurrency(currentRentabilite.coutReel, parametres.devise)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Prix facturé</span>
                        <span className="font-mono font-bold text-sm text-blue-300">
                          {formatCurrency(currentRentabilite.prixFacture, parametres.devise)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Bénéfice net estimé</span>
                        <span className="font-mono font-bold text-sm text-emerald-400">
                          {formatCurrency(currentRentabilite.benefice, parametres.devise)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Marge brute</span>
                        <span className="font-mono font-bold text-sm text-emerald-300">
                          {currentRentabilite.marge} %
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleStartEditRentabilite}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Modifier les montants d'achat Chine & frais réels
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                archiveCommande(commande.id);
                onClose();
              }}
              className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1"
            >
              <Archive className="w-3.5 h-3.5" />
              Archiver la commande
            </button>
            <button
              onClick={() => {
                deleteCommande(commande.id);
                onClose();
              }}
              className="py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
