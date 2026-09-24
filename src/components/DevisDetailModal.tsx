import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  FileDown,
  Share2,
  MessageCircle,
  Mail,
  ArrowRight,
  Edit2,
  Archive,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Printer,
  Send,
  Receipt,
} from 'lucide-react';
import { Devis, Client, Commande, Facture } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateDevisPDF, downloadPdfBlob, sharePdfBlob, getDevisWhatsAppMessage } from '../utils/pdfGenerator';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface DevisDetailModalProps {
  devis: Devis | null;
  onClose: () => void;
  onEdit: (devis: Devis) => void;
  onConverted: (commande: Commande) => void;
  onFactureGenerated?: (facture: Facture) => void;
}

export const DevisDetailModal: React.FC<DevisDetailModalProps> = ({
  devis,
  onClose,
  onEdit,
  onConverted,
  onFactureGenerated,
}) => {
  const { clients, convertDevisToCommande, generateFactureFromDevis, archiveDevis, deleteDevis, parametres, showToast } = useApp();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  if (!devis) return null;

  const client = clients.find((c) => c.id === devis.clientId);

  const handleConvert = () => {
    const cmd = convertDevisToCommande(devis.id);
    if (cmd) {
      onConverted(cmd);
      onClose();
    }
  };

  const handleGenerateFactureDirecte = () => {
    const fac = generateFactureFromDevis(devis.id);
    if (fac) {
      showToast(`Facture ${fac.numero} générée depuis le devis ${devis.numero}`, 'success');
      if (onFactureGenerated) {
        onFactureGenerated(fac);
      }
      onClose();
    }
  };

  const handleGeneratePdf = () => {
    setIsPdfGenerating(true);
    try {
      const { blob, filename } = generateDevisPDF(devis, client, parametres);
      downloadPdfBlob(blob, filename);
      setPdfSuccess(`PDF ${filename} généré avec succès !`);
      setTimeout(() => setPdfSuccess(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    setIsPdfGenerating(true);
    try {
      const { blob, filename } = generateDevisPDF(devis, client, parametres);
      await sharePdfBlob(blob, filename, `Devis ${devis.numero} - ${client?.nom || ''}`);
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
      `Bonjour ${client.nom},\n\nVoici votre devis de sourcing Chine *N° ${devis.numero}* :\n` +
      `• Montant total : *${formatCurrency(devis.total, parametres.devise)}*\n` +
      `• Articles : ${devis.articles.map((a) => `${a.nomProduit} (x${a.quantite})`).join(', ')}\n` +
      `• Frais livraison Chine : ${formatCurrency(devis.fraisLivraisonChine, parametres.devise)}\n` +
      `• Frais transaction : ${formatCurrency(devis.fraisTransaction, parametres.devise)}\n\n` +
      `Le document PDF officiel vous a été établi par ${parametres.entreprise.nom}. Merci de nous confirmer votre accord !`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleSendEmail = () => {
    if (!client?.email) return;
    const subject = encodeURIComponent(`Devis ${devis.numero} - ${parametres.entreprise.nom}`);
    const body = encodeURIComponent(
      `Bonjour ${client.nom},\n\nVeuillez trouver le récapitulatif de votre devis N° ${devis.numero} d'un montant de ${formatCurrency(
        devis.total,
        parametres.devise
      )}.\n\nCordialement,\n${parametres.entreprise.nom}`
    );
    window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Converti en commande':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300';
      case 'Accepté':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300';
      case 'Envoyé':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300';
      case 'Refusé':
      case 'Expiré':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300';
      case 'Brouillon':
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300';
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
              DEV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">{devis.numero}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(devis.statut)}`}>
                  {devis.statut}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Établi le {formatDate(devis.date)}</p>
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

        {pdfSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border-b border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {pdfSuccess}
          </div>
        )}

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Client Destination Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Client Destinataire
              </span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {client?.nom || 'Client non spécifié'}
              </h4>
              <p className="text-slate-500 mt-0.5">
                {client?.telephone} • {client?.ville || 'Lomé'} {client?.quartier ? `(${client.quartier})` : ''}
              </p>
            </div>
            {client && (
              <button
                onClick={handleSendWhatsApp}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            )}
          </div>

          {/* Action: CONVERTIR EN COMMANDE (Requirement 14) */}
          {devis.statut !== 'Converti en commande' ? (
            <div className="p-3.5 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-xl border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-bold text-blue-900 dark:text-blue-200 text-xs">
                  Devis accepté par le client ?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Générez instantanément la commande sans ressaisir les articles ni les prix.
                </p>
              </div>
              <button
                onClick={handleConvert}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <ArrowRight className="w-4 h-4" />
                Convertir en commande
              </button>
            </div>
          ) : (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 flex items-center gap-2 text-purple-900 dark:text-purple-300">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Ce devis a été converti en commande active.</span>
            </div>
          )}

          {/* Articles Table (Section 10) */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
              Articles commandés ({devis.articles.length})
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
              {devis.articles.map((art, idx) => (
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
                      {art.lienAlibaba && (
                        <a
                          href={art.lienAlibaba}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          Lien Alibaba <ExternalLink className="w-2.5 h-2.5" />
                        </a>
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

          {/* Financial Totals */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sous-total articles :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(devis.sousTotal, parametres.devise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Frais de livraison en Chine :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(devis.fraisLivraisonChine, parametres.devise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Frais de transaction ({devis.fraisTransactionPourcent || 5} %) :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(devis.fraisTransaction, parametres.devise)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
              <span className="uppercase tracking-wider">TOTAL À PAYER :</span>
              <span className="text-base text-blue-600 dark:text-blue-400 font-mono">
                {formatCurrency(devis.total, parametres.devise)}
              </span>
            </div>
          </div>

          {/* Conditions */}
          {devis.conditions && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Conditions & modalités
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">{devis.conditions}</p>
            </div>
          )}

          {/* PDF GENERATION & ACTIONS (Section 13) */}
          <div className="pt-2 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              Actions & Export Document
            </h4>

            {/* CONVERT TO COMMANDE BUTTON (if not already converted) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {devis.statut !== 'Converti en commande' && (
                <button
                  onClick={handleConvert}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
                >
                  <ArrowRight className="w-4 h-4" />
                  Convertir en Commande
                </button>
              )}

              <button
                onClick={handleGenerateFactureDirecte}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
              >
                <Receipt className="w-4 h-4" />
                Générer Facture Directe
              </button>
            </div>

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
                className="py-2.5 px-3 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
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

              <button
                onClick={() => onEdit(devis)}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit2 className="w-4 h-4 text-slate-500" />
                Modifier
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  archiveDevis(devis.id);
                  onClose();
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                Archiver ce devis
              </button>

              <button
                onClick={() => {
                  deleteDevis(devis.id);
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

      {/* WhatsApp Share Modal with customizable message */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        documentTitle={`Devis ${devis.numero}`}
        filename={`${devis.numero}_${client?.nom.replace(/\s+/g, '_') || 'Client'}.pdf`}
        clientName={client?.nom || 'Client'}
        clientPhone={client?.whatsapp || client?.telephone || ''}
        defaultMessage={getDevisWhatsAppMessage(devis, client)}
        generatePdfBlob={() => generateDevisPDF(devis, client, parametres).blob}
      />
    </div>
  );
};
