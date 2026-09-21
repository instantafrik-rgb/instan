import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Mail,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Package,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { Client, Devis, Commande, Paiement, Facture } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ClientDetailModalProps {
  client: Client | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onNewDevis: (client: Client) => void;
  onSelectDevis: (devis: Devis) => void;
  onSelectCommande: (commande: Commande) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onEdit,
  onNewDevis,
  onSelectDevis,
  onSelectCommande,
}) => {
  const { devis, commandes, paiements, factures, deleteClient, parametres } = useApp();
  const [activeTab, setActiveTab] = useState<'commandes' | 'devis' | 'paiements' | 'factures'>('commandes');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!client) return null;

  // Filter client history
  const clientDevis = devis.filter((d) => d.clientId === client.id);
  const clientCommandes = commandes.filter((c) => c.clientId === client.id);
  const clientPaiements = paiements.filter((p) => p.clientId === client.id);
  const clientFactures = factures.filter((f) => f.clientId === client.id);

  // Financial calculations for this client
  const totalCommande = clientCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0);
  const totalPaye = clientCommandes.reduce((acc, c) => acc + (c.montantPaye || 0), 0);
  const resteAPayer = Math.max(0, totalCommande - totalPaye);

  const handleDelete = () => {
    deleteClient(client.id);
    onClose();
  };

  const cleanPhoneForWa = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121214] rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header - Modern Monochrome */}
        <div className="bg-neutral-950 p-5 text-white relative border-b border-neutral-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-black font-bold text-base flex items-center justify-center shadow-xs border border-neutral-200">
              {client.nom.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{client.nom}</h3>
              <p className="text-xs text-neutral-400">
                Client depuis le {formatDate(client.dateCreation)}
              </p>
            </div>
          </div>

          {/* Quick Communication Links */}
          <div className="flex gap-2 mt-4">
            <a
              href={`tel:${client.telephone}`}
              className="flex-1 py-1.5 px-3 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Appeler
            </a>
            <a
              href={`https://wa.me/${cleanPhoneForWa(client.whatsapp || client.telephone)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <button
              onClick={() => onEdit(client)}
              className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-white"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Warning */}
        {confirmDelete && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-900 dark:text-rose-200">
                Confirmer la suppression du client ?
              </p>
              <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                Les commandes et devis historiques liés seront conservés conformément aux règles.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Financial Totals Card (Requirement 7) */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Total commandé
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {formatCurrency(totalCommande, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Total payé
              </span>
              <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatCurrency(totalPaye, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                Reste à payer
              </span>
              <p className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 truncate">
                {formatCurrency(resteAPayer, parametres.devise)}
              </p>
            </div>
          </div>

          {/* Client Details Section */}
          <div className="bg-white dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-2">
              Coordonnées
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px]">Téléphone</span>
                <span className="font-semibold">{client.telephone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">WhatsApp</span>
                <span className="font-semibold">{client.whatsapp || client.telephone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ville</span>
                <span className="font-semibold">{client.ville || 'Lomé'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Quartier</span>
                <span className="font-semibold">{client.quartier || 'Non précisé'}</span>
              </div>
            </div>

            {client.adresse && (
              <div className="pt-1">
                <span className="text-slate-400 block text-[10px]">Adresse</span>
                <span className="text-slate-700 dark:text-slate-300">{client.adresse}</span>
              </div>
            )}
            {client.email && (
              <div>
                <span className="text-slate-400 block text-[10px]">Email</span>
                <span className="text-slate-700 dark:text-slate-300">{client.email}</span>
              </div>
            )}
            {client.notes && (
              <div className="pt-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Notes</span>
                <p className="text-slate-600 dark:text-slate-300 italic">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Action: + Nouveau devis */}
          <button
            onClick={() => onNewDevis(client)}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            + Nouveau devis pour ce client
          </button>

          {/* Historique Tabs (Requirement 7) */}
          <div>
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('commandes')}
                className={`flex-1 py-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
                  activeTab === 'commandes'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Commandes ({clientCommandes.length})
              </button>
              <button
                onClick={() => setActiveTab('devis')}
                className={`flex-1 py-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
                  activeTab === 'devis'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Devis ({clientDevis.length})
              </button>
              <button
                onClick={() => setActiveTab('paiements')}
                className={`flex-1 py-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
                  activeTab === 'paiements'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Paiements ({clientPaiements.length})
              </button>
              <button
                onClick={() => setActiveTab('factures')}
                className={`flex-1 py-2 flex items-center justify-center gap-1 border-b-2 transition-colors ${
                  activeTab === 'factures'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Factures ({clientFactures.length})
              </button>
            </div>

            <div className="pt-3 space-y-2">
              {activeTab === 'commandes' && (
                clientCommandes.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">Aucune commande</p>
                ) : (
                  clientCommandes.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCommande(c)}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{c.numero}</span>
                        <div className="text-[11px] text-slate-500">{formatDate(c.date)} • {c.articles.length} article(s)</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(c.montantTotal, parametres.devise)}</div>
                        <span className="text-[10px] text-slate-500">Solde: {formatCurrency(c.solde, parametres.devise)}</span>
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === 'devis' && (
                clientDevis.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">Aucun devis</p>
                ) : (
                  clientDevis.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => onSelectDevis(d)}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{d.numero}</span>
                        <div className="text-[11px] text-slate-500">{formatDate(d.date)} • {d.articles.length} article(s)</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(d.total, parametres.devise)}</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">{d.statut}</span>
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === 'paiements' && (
                clientPaiements.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">Aucun paiement</p>
                ) : (
                  clientPaiements.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{p.numero}</span>
                        <div className="text-[11px] text-slate-500">{formatDate(p.date)} • {p.modePaiement}</div>
                      </div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(p.montant, parametres.devise)}
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === 'factures' && (
                clientFactures.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">Aucune facture</p>
                ) : (
                  clientFactures.map((f) => (
                    <div
                      key={f.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{f.numero}</span>
                        <div className="text-[11px] text-slate-500">{formatDate(f.date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(f.total, parametres.devise)}</div>
                        <span className="text-[10px] text-emerald-600 font-semibold">{f.statut}</span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
