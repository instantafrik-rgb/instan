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
  UserCheck,
  LogIn,
  LogOut,
  Lock,
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
    currentAuthUser,
    signInWithGoogle,
    signOutGoogle,
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

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await signOutGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (syncState) {
      case 'synced':
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <span className="text-xs">🟢</span>
              Synchronisé
            </span>
            <span className="text-[11px] text-indigo-200 font-medium">Données locales à jour</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <span className="text-xs">🟡</span>
              Modifications en attente ({syncStats.pendingOfflineQueue})
            </span>
            <span className="text-[11px] text-amber-200 font-medium">Synchronisation cloud en attente</span>
          </div>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse">
            <span className="text-xs animate-spin">🔄</span>
            Synchronisation en cours...
          </span>
        );
      case 'offline':
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              <span className="text-xs">⚪</span>
              Hors connexion
            </span>
            <span className="text-[11px] text-indigo-200 font-medium">Données locales à jour</span>
          </div>
        );
      case 'error':
      default:
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              <span className="text-xs">🔴</span>
              Erreur de synchronisation
            </span>
            <button
              onClick={handleSyncNow}
              className="text-[11px] text-rose-300 hover:text-white underline font-semibold cursor-pointer transition text-left sm:text-right"
            >
              Réessayer
            </button>
          </div>
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

      {/* CLOUD VS GOOGLE SHEETS DISTINCTION NOTICE */}
      <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
        <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold block">
            Ce système gère la synchronisation multi-appareils (Android ↔ Ordinateur)
          </span>
          <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200">
            Ce module réplique automatiquement votre base de données entre votre téléphone et votre PC. Si vous souhaitez exporter vos commandes et clients dans un tableur Google Sheets pour consultation ou comptabilité, utilisez l'onglet dédié <strong>« Google Sheets (NantorApp → Sheets) »</strong>.
          </p>
        </div>
      </div>

      {/* Security & Authentication Card */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Sécurité Cloud & Compte Utilisateur
                </h4>
                {currentAuthUser && !currentAuthUser.isAnonymous ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                    Compte Google
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
                    Session Sécurisée
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentAuthUser?.email
                  ? `Connecté en tant que : ${currentAuthUser.email}`
                  : `ID Utilisateur sécurisé : ${currentAuthUser?.uid || 'Attribution en cours...'}`}
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                Chemin Firestore isolé : /users/{currentAuthUser?.uid || 'userId'}/[collections]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentAuthUser && !currentAuthUser.isAnonymous ? (
              <button
                onClick={handleGoogleSignOut}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnexion Google
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Se connecter avec Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Last Sync Error Alert with Direct Retry */}
      {syncStats.lastError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <p className="font-bold">Erreur de synchronisation : {syncStats.lastError}</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
                Vos données locales restent 100% intactes et disponibles sur cet appareil.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncNow}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition active:scale-95"
          >
            Réessayer
          </button>
        </div>
      )}

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
          <span>Réception sécurisée depuis Cloud</span>
          <span className="text-[10px] font-normal text-slate-500">
            Fusion intelligente avec sauvegarde auto
          </span>
        </button>
      </div>

      {/* Protection & Fiabilité des données */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 text-xs space-y-2">
        <h4 className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Fiabilité & Protection contre la perte de données
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-emerald-800 dark:text-emerald-300/90">
          <div className="p-2.5 bg-white/70 dark:bg-black/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <span className="font-bold block text-emerald-950 dark:text-emerald-200">1. Stockage Local Prioritaire</span>
            Toutes vos créations, devis et commandes sont d'abord enregistrées localement sans latence.
          </div>
          <div className="p-2.5 bg-white/70 dark:bg-black/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <span className="font-bold block text-emerald-950 dark:text-emerald-200">2. Aucun vidage accidentel</span>
            En cas d'erreur de connexion ou de Cloud vide, vos données locales sont préservées intactes.
          </div>
          <div className="p-2.5 bg-white/70 dark:bg-black/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <span className="font-bold block text-emerald-950 dark:text-emerald-200">3. Sauvegarde de précaution</span>
            Un instantané automatique est créé avant toute opération de restauration ou d'importation.
          </div>
        </div>
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
