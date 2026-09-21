import React, { useState } from 'react';
import { X, Send, Copy, Check, Download, MessageSquare, ExternalLink, FileText } from 'lucide-react';
import { sharePdfBlob, downloadPdfBlob, openWhatsAppChat } from '../utils/pdfGenerator';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string; // e.g. "Devis DEV-2026-0001"
  filename: string; // e.g. "DEV-2026-0001_Koffi_Mensah.pdf"
  clientName: string;
  clientPhone: string;
  defaultMessage: string;
  generatePdfBlob: () => Blob;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  filename,
  clientName,
  clientPhone,
  defaultMessage,
  generatePdfBlob,
}) => {
  const [message, setMessage] = useState<string>(defaultMessage);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSending(true);
    setShareStatus('Préparation du PDF et partage...');
    try {
      const blob = generatePdfBlob();
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Check if native Android file sharing is available
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: documentTitle,
          text: message,
          files: [file],
        });
        setShareStatus('Document partagé avec succès !');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        // Fallback: Download PDF and open WhatsApp Web/App with message
        downloadPdfBlob(blob, filename);
        setShareStatus('PDF téléchargé. Ouverture de WhatsApp...');
        setTimeout(() => {
          openWhatsAppChat(clientPhone, message);
          setIsSending(false);
        }, 600);
      }
    } catch (err) {
      console.warn('Share error or cancelled', err);
      setShareStatus(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleDirectWhatsApp = () => {
    openWhatsAppChat(clientPhone, message);
  };

  const handleDownload = () => {
    const blob = generatePdfBlob();
    downloadPdfBlob(blob, filename);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with WhatsApp brand styling */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Envoyer par WhatsApp</h3>
              <p className="text-emerald-100 text-xs">{documentTitle} • {clientName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* File info badge */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
            <div className="flex items-center gap-2.5 truncate">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">{filename}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">PDF officiel généré automatiquement</span>
              </div>
            </div>
            <button
              onClick={handleDownload}
              title="Télécharger le fichier PDF"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          {/* Recipient info */}
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
            <span>Destinataire : <strong className="text-slate-700 dark:text-slate-300">{clientName}</strong></span>
            <span>N° WhatsApp : <strong className="text-emerald-600 dark:text-emerald-400">{clientPhone || 'Non renseigné'}</strong></span>
          </div>

          {/* Editable message textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Message accompagnant le PDF (modifiable) :
              </label>
              <button
                onClick={handleCopyMessage}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-sans resize-none"
            />
          </div>

          {shareStatus && (
            <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center font-medium">
              {shareStatus}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
          {/* Main WhatsApp Button */}
          <button
            onClick={handleShareWhatsApp}
            disabled={isSending}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm sm:text-base cursor-pointer"
          >
            <Send className="w-5 h-5" />
            {isSending ? 'Préparation...' : 'ENVOYER PAR WHATSAPP (PDF + MESSAGE)'}
          </button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={handleDirectWhatsApp}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-1.5 p-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir conversation WhatsApp
            </button>
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
