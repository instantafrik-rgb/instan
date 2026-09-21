import React, { useState } from 'react';
import {
  X,
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
} from 'lucide-react';
import { Facture, Client, Commande } from '../types';
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
  facture,
  onClose,
  onSelectCommande,
}) => {
  const { clients, commandes, parametres, archiveFacture, deleteFacture } = useApp();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  if (!facture) return null;

  const client = clients.find((c) => c.id === facture.clientId);
  const commande = commandes.find((cmd) => cmd.id === facture.commandeId);

  const handleGeneratePdf = () => {
    setIsPdfGenerating(true);
    try {
      const { blob, filename } = generateFacturePDF(facture, client, parametres);
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
      const { blob, filename } = generateFacturePDF(facture, client, parametres);
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
      case 'Payé':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'Partiellement payé':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'Non payé':
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121214] rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header - Modern Monochrome */}
        <div className="bg-neutral-950 p-4 sm:p-5 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xs tracking-wider border border-neutral-200">
              <Receipt className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">{facture.numero}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatutBadge(facture.statut)}`}>
                  {facture.statut}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Émise le {formatDate(facture.date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition"
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

          {/* Breakdown & Payment balances (Section 21) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sous-total articles :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(facture.sousTotal, parametres.devise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Frais de livraison en Chine :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(facture.fraisLivraisonChine || 0, parametres.devise)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Frais de transaction :</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(facture.fraisTransaction || 0, parametres.devise)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
              <span>TOTAL GÉNÉRAL FACTURÉ :</span>
              <span className="text-base text-indigo-600 dark:text-indigo-400 font-mono">
                {formatCurrency(facture.total, parametres.devise)}
              </span>
            </div>

            {/* Payment history on this invoice */}
            <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>Montant déjà payé :</span>
              <span className="font-mono font-bold">
                {formatCurrency(facture.montantPaye, parametres.devise)}
              </span>
            </div>

            <div className="flex justify-between font-bold text-sm pt-1">
              <span className={facture.solde <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                SOLDE RESTANT DÛ :
              </span>
              <span className={`font-mono text-base ${facture.solde <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(facture.solde, parametres.devise)}
              </span>
            </div>
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

      {/* WhatsApp Share Modal with customizable message */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        documentTitle={`Facture ${facture.numero}`}
        filename={`${facture.numero}_${client?.nom.replace(/\s+/g, '_') || 'Client'}.pdf`}
        clientName={client?.nom || 'Client'}
        clientPhone={client?.whatsapp || client?.telephone || ''}
        defaultMessage={getFactureWhatsAppMessage(facture, client)}
        generatePdfBlob={() => generateFacturePDF(facture, client, parametres).blob}
      />
    </div>
  );
};
