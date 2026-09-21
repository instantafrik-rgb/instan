import React, { useState } from 'react';
import {
  Cloud,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Smartphone,
  Laptop,
  Check,
  Zap,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDate } from '../utils/formatters';

export const CloudSyncView: React.FC = () => {
  const {
    syncState,
    syncStats,
    syncNow,
    uploadAllToCloud,
    downloadAllFromCloud,
    clearOfflinePendingQueue,
    parametres,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSyncNow = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await syncNow();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAll = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await uploadAllToCloud();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!window.confirm('Attention : cette action va écraser les données locales par la dernière sauvegarde Cloud. Une sauvegarde automatique préalable sera créée. Confirmer ?')) {
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await downloadAllFromCloud();
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (syncState) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Synchronisé & À jour
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Synchronisation en cours...
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Hors ligne (Modifications en attente : {syncStats.pendingOfflineQueue})
          </span>
        );
      case 'error':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Erreur de connexion Cloud
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl shadow-xl border border-indigo-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                V4 CLOUD SYNC
              </span>
              <span className="text-xs text-indigo-200">Architecture Firestore & Offline First</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Cloud className="w-5 h-5 text-indigo-400" />
              Synchronisation Cloud Windows ↔ Android
            </h3>
            <p className="text-xs text-indigo-200/90 max-w-xl">
              Toutes vos données (Clients, Devis, Commandes, Factures directes, Paiements, Sourcing) sont synchronisées de manière bidirectionnelle et sécurisée entre PC et Smartphone.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
            {getStatusBadge()}
            <p className="text-[11px] text-indigo-300 font-mono">
              Dernière synchro : {formatDate(syncStats.lastSyncTime || parametres.derniereSynchroCloudDate || new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={handleSyncNow}
          disabled={isLoading}
          className="p-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Synchroniser Maintenant</span>
          <span className="text-[10px] font-normal text-indigo-200">
            Fusion intelligente bi-directionnelle
          </span>
        </button>

        <button
          onClick={handleUploadAll}
          disabled={isLoading}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Forcer Envoi vers Cloud</span>
          <span className="text-[10px] font-normal text-slate-500">
            Publier toutes les données locales
          </span>
        </button>

        <button
          onClick={handleDownloadAll}
          disabled={isLoading}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <DownloadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Forcer Réception depuis Cloud</span>
          <span className="text-[10px] font-normal text-slate-500">
            Écraser depuis la base distante
          </span>
        </button>
      </div>

      {/* Device indicators */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Appareils connectés & Résolution des conflits
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Poste Windows / Bureau</p>
              <p className="text-[11px] text-slate-500">
                Génération devis, factures & logistique Chine-Togo
              </p>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Mobile Android / Terrain</p>
              <p className="text-[11px] text-slate-500">
                Encaissements TMoney/Flooz, photos & notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Stats Grid */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Statut des Collections Synchronisées
          </h4>
          {syncStats.pendingOfflineQueue > 0 && (
            <button
              onClick={clearOfflinePendingQueue}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purger la file hors ligne ({syncStats.pendingOfflineQueue})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Clients</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {syncStats.clients}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Devis</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {syncStats.devis}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Commandes</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {syncStats.commandes}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Factures Officielles</span>
            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
              {syncStats.factures}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Paiements</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {syncStats.paiements}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Fournisseurs</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {syncStats.fournisseurs}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">Demandes Sourcing</span>
            <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
              {syncStats.sourcing}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">File d'attente Hors Ligne</span>
            <span className="font-mono font-bold text-sm text-amber-600">
              {syncStats.pendingOfflineQueue} en attente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
