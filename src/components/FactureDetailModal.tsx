import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  FileDown,
  Share2,
  MessageCircle,
  Mail,
  Receipt,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Archive,
  Trash2,
  CreditCard,
  Check,
  Calendar,
  AlertTriangle,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Facture, Client, Commande, ModePaiement, FactureStatut } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateFacturePDF, downloadPdfBlob, sharePdfBlob, getFactureWhatsAppMessage } from '../utils/pdfGenerator';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface FactureDetailModalProps {
  facture: Facture | null;
  onClose: () => void;
  onSelectCommande?: (commande: Commande) => void;
}

export const FactureDetailModal: React.FC<FactureDetailModalProps> = ({
  facture: initialFacture,
  onClose,
  onSelectCommande,
}) => {
  const {
    factures,
    clients,
    commandes,
    parametres,
    archiveFacture,
    deleteFacture,
    getFacturePaiements,
    addPaiement,
    deletePaiement,
    marquerFacturePayeeManuellement,
    updateFactureStatutManuel,
  } = useApp();

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Modals for payment actions
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [showMarkPayeeModal, setShowMarkPayeeModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);

  // Form states for new payment
  const [payMontant, setPayMontant] = useState<number>(0);
  const [payMode, setPayMode] = useState<ModePaiement>('TMoney');
  const [payReference, setPayReference] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payError, setPayError] = useState('');

  // Form states for mark as paid manually
  const [markMode, setMarkMode] = useState<ModePaiement>('Espèces');
  const [markNotes, setMarkNotes] = useState('');

  // Form state for status override
  const [nouveauStatut, setNouveauStatut] = useState<FactureStatut>('Envoyée');
  const [statutNotes, setStatutNotes] = useState('');

  if (!initialFacture) return null;

  // Always bind to latest state in AppContext
  const facture = factures.find((f) => f.id === initialFacture.id) || initialFacture;
  const client = clients.find((c) => c.id === facture.clientId);
  const commande = commandes.find((cmd) => cmd.id === facture.commandeId);
  const paiementsFacture = getFacturePaiements(facture.id);

  const handleOpenPaiementModal = () => {
    setPayMontant(facture.solde > 0 ? facture.solde : 0);
    setPayMode('TMoney');
    setPayReference('');
    setPayNote('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayError('');
    setShowPaiementModal(true);
  };

  const handleSavePaiement = (e: React.FormEvent) => {
    e.preventDefault();
    if (payMontant <= 0) {
      setPayError('Veuillez saisir un montant supérieur à 0');
      return;
    }

    addPaiement({
      clientId: facture.clientId,
      commandeId: facture.commandeId,
      factureId: facture.id,
      date: new Date(payDate).toISOString(),
      montant: Number(payMontant),
      modePaiement: payMode,
      reference: payReference.trim(),
      note: payNote.trim(),
    });

    setShowPaiementModal(false);
    setPdfMessage('Paiement enregistré avec succès sur cette facture !');
    setTimeout(() => setPdfMessage(''), 4000);
  };

  const handleConfirmMarkPayee = () => {
    marquerFacturePayeeManuellement(facture.id, {
      note: markNotes,
      modePaiement: markMode,
    });
    setShowMarkPayeeModal(false);
    setPdfMessage('Facture marquée comme intégralement payée !');
    setTimeout(() => setPdfMessage(''), 4000);
  };

  const handleConfirmStatutChange = () => {
    updateFactureStatutManuel(
      facture.id,
      nouveauStatut,
      nouveauStatut === 'Payée',
      statutNotes
    );
    setShowStatutModal(false);
    setPdfMessage(`Statut mis à jour : ${nouveauStatut}`);
    setTimeout(() => setPdfMessage(''), 4000);
  };

  const handleGeneratePdf = () => {
    setIsPdfGenerating(true);
    try {
      const { blob, filename } = generateFacturePDF(facture, client, parametres, paiementsFacture);
      downloadPdfBlob(blob, filename);
      setPdfMessage(`Facture ${filename} téléchargée avec succès !`);
      setTimeout(() => setPdfMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    setIsPdfGenerating(true);
    try {
      const { blob, filename } = generateFacturePDF(facture, client, parametres, paiementsFacture);
      await sharePdfBlob(blob, filename, `Facture ${facture.numero} - ${client?.nom || ''}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!client) return;
    const phone = client.whatsapp || client.telephone;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Bonjour ${client.nom},\n\nVoici votre *Facture N° ${facture.numero}* (${parametres.entreprise.nom}) :\n` +
      `• Total : *${formatCurrency(facture.total, parametres.devise)}*\n` +
      `• Montant réglé : *${formatCurrency(facture.montantPaye, parametres.devise)}*\n` +
      `• Solde restant : *${formatCurrency(facture.solde, parametres.devise)}*\n` +
      `• Statut : *${facture.statut}*\n\nMerci pour votre confiance !`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleSendEmail = () => {
    if (!client?.email) return;
    const subject = encodeURIComponent(`Facture ${facture.numero} - ${parametres.entreprise.nom}`);
    const body = encodeURIComponent(
      `Bonjour ${client.nom},\n\nVeuillez trouver votre facture N° ${facture.numero}. Montant total : ${formatCurrency(
        facture.total,
        parametres.devise
      )}. Solde restant : ${formatCurrency(facture.solde, parametres.devise)}.\n\nCordialement,\n${parametres.entreprise.nom}`
    );
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const getStatutBadge = (st: string) => {
    switch (st) {
      case 'Payée':
      case 'Payé':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'Partiellement payée':
      case 'Partiellement payé':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'En retard':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'Annulée':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      case 'Envoyée':
      case 'Émise':
      case 'Brouillon':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121214] rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header - Modern Monochrome */}
        <div className="bg-neutral-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer border border-neutral-700"
              title="Retour à l'écran précédent"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xs tracking-wider border border-neutral-200 shrink-0">
              <Receipt className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base tracking-tight">{facture.numero}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatutBadge(facture.statut)}`}>
                  {facture.statut}
                </span>
                {facture.payeeManuellement && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
                    Payée manuellement
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">Émise le {formatDate(facture.date)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {pdfMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border-b border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {pdfMessage}
          </div>
        )}

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Client & Commande Reference */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Client Destinataire
              </span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {client?.nom || 'Client inconnu'}
              </h4>
              <p className="text-slate-500 mt-0.5">
                {client?.telephone} • {client?.ville || 'Lomé'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Origine / Source
              </span>
              {commande ? (
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    Commande
                  </span>
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {commande.numero}
                  </p>
                </div>
              ) : facture.devisId ? (
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    Devis direct
                  </span>
                  <p className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {facture.devisId}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                    Facture directe
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Sans commande préalable
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Articles Table */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
              Articles facturés ({facture.articles.length})
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
              {facture.articles.map((art, idx) => (
                <div key={art.id || idx} className="p-3 bg-white dark:bg-slate-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {art.photo ? (
                      <img
                        src={art.photo}
                        alt={art.nomProduit}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
                        #{idx + 1}
                      </div>
                    )}
                    <div>
                      <h5 className="font-semibold text-slate-900 dark:text-white">
                        {art.nomProduit}
                      </h5>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatCurrency(art.prixUnitaire, parametres.devise)} × {art.quantite}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold font-mono text-xs sm:text-sm text-slate-900 dark:text-white text-right shrink-0">
                    {formatCurrency(art.total, parametres.devise)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown & Balances */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sous-total articles :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(facture.sousTotal, parametres.devise)}
              </span>
            </div>
            {Boolean(facture.fraisLivraisonChine) && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Frais livraison Chine :</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(facture.fraisLivraisonChine || 0, parametres.devise)}
                </span>
              </div>
            )}
            {Boolean(facture.fraisTransaction) && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Frais de transaction :</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(facture.fraisTransaction || 0, parametres.devise)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
              <span>TOTAL GÉNÉRAL FACTURÉ :</span>
              <span className="text-base text-indigo-600 dark:text-indigo-400 font-mono">
                {formatCurrency(facture.total, parametres.devise)}
              </span>
            </div>

            {/* Payment total on this invoice */}
            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Montant déjà réglé :</span>
              <span className="font-mono font-bold">
                {formatCurrency(facture.montantPaye, parametres.devise)}
              </span>
            </div>

            <div className="flex justify-between font-bold text-sm pt-1 items-center">
              <span className={facture.solde <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                SOLDE RESTANT DÛ :
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-base ${facture.solde <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(facture.solde, parametres.devise)}
                </span>
                {facture.solde <= 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    PAYÉE
                  </span>
                )}
              </div>
            </div>

            {facture.payeeManuellement && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold">Facture acquittée manuellement (règlement constaté hors application)</p>
                  {facture.dateReglementFinal && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Clôturée le {formatDate(facture.dateReglementFinal)}
                    </p>
                  )}
                  {facture.notesReglement && (
                    <p className="text-[10px] italic mt-0.5 text-emerald-600 dark:text-emerald-300">
                      Note : {facture.notesReglement}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Payment Action Buttons */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Gestion des règlements
              </h4>
              <button
                type="button"
                onClick={() => setShowStatutModal(true)}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-semibold flex items-center gap-1"
              >
                Changer statut manuel
              </button>
            </div>

            {facture.solde > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenPaiementModal}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <CreditCard className="w-4 h-4" />
                  Enregistrer un paiement
                </button>

                <button
                  type="button"
                  onClick={() => setShowMarkPayeeModal(true)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  Marquer comme payée
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Facture intégralement payée — Solde à zéro</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPaiementModal}
                  className="text-[10px] text-emerald-700 dark:text-emerald-300 hover:underline font-bold"
                >
                  + Ajouter versement
                </button>
              </div>
            )}
          </div>

          {/* Payment History on this Invoice */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Historique des paiements ({paiementsFacture.length})
              </h4>
            </div>

            {paiementsFacture.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500">
                <Info className="w-5 h-5 mx-auto mb-1 text-slate-400 opacity-60" />
                <p>Aucun paiement spécifique enregistré pour cette facture.</p>
                {facture.montantPaye > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    (Montant d'acompte hérité : {formatCurrency(facture.montantPaye, parametres.devise)})
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {paiementsFacture.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white dark:bg-[#121214] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {p.numero}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.modePaiement}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(p.date)}
                        </span>
                      </div>
                      {(p.reference || p.note) && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {p.reference && <span className="font-medium text-slate-700 dark:text-slate-300 mr-1.5">Réf: {p.reference}</span>}
                          {p.note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(p.montant, parametres.devise)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Supprimer le versement ${p.numero} de ${formatCurrency(p.montant, parametres.devise)} ? Le solde de la facture sera recalculé.`)) {
                            deletePaiement(p.id);
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Supprimer ce versement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legal / Company Terms */}
          {facture.conditions && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Mentions & conditions de facturation
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">{facture.conditions}</p>
            </div>
          )}

          {/* PDF GENERATION & ACTIONS (Section 21) */}
          <div className="pt-2 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Export & Communication
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                onClick={handleGeneratePdf}
                disabled={isPdfGenerating}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <FileDown className="w-4 h-4" />
                Générer PDF
              </button>

              <button
                onClick={handleSharePdf}
                disabled={isPdfGenerating}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="w-4 h-4 text-blue-500" />
                Partager
              </button>

              {client?.email ? (
                <button
                  onClick={handleSendEmail}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Mail className="w-4 h-4 text-amber-500" />
                  Email
                </button>
              ) : (
                <button
                  onClick={() => {
                    archiveFacture(facture.id);
                    onClose();
                  }}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Archive className="w-4 h-4 text-slate-500" />
                  Archiver
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  archiveFacture(facture.id);
                  onClose();
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Archiver cette facture
              </button>

              <button
                onClick={() => {
                  deleteFacture(facture.id);
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

      {/* Sub-Modal: Enregistrer un paiement */}
      {showPaiementModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Enregistrer un paiement — {facture.numero}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaiementModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaiement} className="p-5 space-y-4 text-xs">
              {payError && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 rounded-lg border border-rose-200">
                  {payError}
                </div>
              )}

              {/* Financial context */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total facture :</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(facture.total, parametres.devise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Déjà réglé :</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatCurrency(facture.montantPaye, parametres.devise)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">Solde restant :</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(facture.solde, parametres.devise)}
                  </span>
                </div>
              </div>

              {/* Montant versé */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Montant versé ({parametres.devise}) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={payMontant === 0 ? '' : payMontant}
                  onChange={(e) => setPayMontant(parseFloat(e.target.value) || 0)}
                  placeholder="Montant du versement..."
                  className="w-full px-3 py-2 text-base font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                  required
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPayMontant(facture.solde > 0 ? facture.solde : 0)}
                    className="text-[10px] text-emerald-600 hover:underline font-semibold"
                  >
                    Régler tout le solde ({formatCurrency(facture.solde, parametres.devise)})
                  </button>
                  {facture.solde > 0 && (
                    <button
                      type="button"
                      onClick={() => setPayMontant(Math.round(facture.solde / 2))}
                      className="text-[10px] text-slate-500 hover:underline font-semibold"
                    >
                      50% du solde
                    </button>
                  )}
                </div>
              </div>

              {/* Mode de paiement */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mode de paiement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['TMoney', 'Flooz', 'Espèces', 'Virement bancaire', 'Chèque', 'Autre'] as ModePaiement[]).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setPayMode(mode)}
                      className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] transition-all ${
                        payMode === mode
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Référence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date du paiement
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Référence (ID / Reçu)
                  </label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Ex: TMoney ID..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note ou commentaire (facultatif)
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Ex: Acompte sur commande, remise en mains propres..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaiementModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Valider le versement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Modal: Confirmer "Marquer comme payée" */}
      {showMarkPayeeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Clôturer la facture comme Payée
                </h3>
                <p className="text-slate-500 text-[11px]">Facture {facture.numero}</p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Cette opération certifie que l'intégralité du solde restant dû (
                <strong className="text-rose-600 font-mono font-bold">
                  {formatCurrency(facture.solde, parametres.devise)}
                </strong>
                ) a été perçue ou régularisée. Le statut sera définitivement basculé en{' '}
                <strong className="text-emerald-600 font-bold">Payée</strong> et le solde restant à payer sera mis à 0.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mode de règlement constaté
                </label>
                <select
                  value={markMode}
                  onChange={(e) => setMarkMode(e.target.value as ModePaiement)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="TMoney">TMoney</option>
                  <option value="Flooz">Flooz</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motif ou note de traçabilité (facultatif)
                </label>
                <input
                  type="text"
                  value={markNotes}
                  onChange={(e) => setMarkNotes(e.target.value)}
                  placeholder="Ex: Règlement complet au bureau, virement vérifié..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMarkPayeeModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  onClick={handleConfirmMarkPayee}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Confirmer le règlement intégral
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Changer le statut manuel */}
      {showStatutModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Modifier le statut de la facture
              </h3>
              <button
                type="button"
                onClick={() => setShowStatutModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nouveau statut
                </label>
                <select
                  value={nouveauStatut}
                  onChange={(e) => setNouveauStatut(e.target.value as FactureStatut)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Envoyée">Envoyée</option>
                  <option value="Partiellement payée">Partiellement payée</option>
                  <option value="Payée">Payée</option>
                  <option value="En retard">En retard</option>
                  <option value="Annulée">Annulée</option>
                  <option value="Brouillon">Brouillon</option>
                </select>
              </div>

              {nouveauStatut === 'Payée' && facture.solde > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    Attention : Le solde restant calculé est de {formatCurrency(facture.solde, parametres.devise)}. Passer le statut en 'Payée' forcera le règlement manuel de cette facture.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note explicative (facultatif)
                </label>
                <input
                  type="text"
                  value={statutNotes}
                  onChange={(e) => setStatutNotes(e.target.value)}
                  placeholder="Ex: Facture annulée suite accord, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatutModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatutChange}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Share Modal with customizable message */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        documentTitle={`Facture ${facture.numero}`}
        filename={`${facture.numero}_${client?.nom.replace(/\s+/g, '_') || 'Client'}.pdf`}
        clientName={client?.nom || 'Client'}
        clientPhone={client?.whatsapp || client?.telephone || ''}
        defaultMessage={getFactureWhatsAppMessage(facture, client)}
        generatePdfBlob={() => generateFacturePDF(facture, client, parametres, paiementsFacture).blob}
      />
    </div>
  );
};
