import React, { useState } from 'react';
import {
  Users,
  FileSpreadsheet,
  Package,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Plus,
  Eye,
  EyeOff,
  ChevronRight,
  Clock,
  ArrowUpRight,
  DollarSign,
  Bell,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Truck,
  MessageCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TabType, Commande } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: TabType) => void;
  onNewDevis: () => void;
  onSelectCommande: (commande: Commande) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onNewDevis,
  onSelectCommande,
}) => {
  const { clients, devis, commandes, paiements, rentabilites, parametres, notifications, unreadNotificationsCount } = useApp();
  const [showRentabilite, setShowRentabilite] = useState<boolean>(false);

  // Active items (not archived)
  const activeCommandes = commandes.filter((c) => !c.isArchived);
  const activeDevis = devis.filter((d) => !d.isArchived);

  // KPI Calculations
  const totalClientsCount = clients.length;
  const totalDevisCount = activeDevis.length;
  const totalCommandesCount = activeCommandes.length;

  const totalPaiementsRecus = paiements.reduce((acc, p) => acc + (p.montant || 0), 0);
  const totalResteARecevoir = activeCommandes.reduce((acc, c) => acc + (c.solde || 0), 0);
  const totalChiffreAffaires = activeCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0);

  // Rentabilité aggregates
  const rentabiliteList = Object.values(rentabilites);
  const totalBenefice = rentabiliteList.reduce((acc, r) => acc + (r.benefice || 0), 0);
  const totalCoutReel = rentabiliteList.reduce((acc, r) => acc + (r.coutReel || 0), 0);
  const margeMoyenne =
    totalChiffreAffaires > 0 ? (totalBenefice / totalChiffreAffaires) * 100 : 0;

  // Recent 5 commandes
  const recentCommandes = [...activeCommandes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.nom : 'Client inconnu';
  };

  const getStatutBadgeClass = (statut: string) => {
    switch (statut) {
      case 'Payé':
      case 'Livré':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Partiellement payé':
      case 'Expédié de Chine':
      case 'En transit':
      case 'Arrivé au Togo':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Commande Alibaba':
      case 'Produit acheté':
      case 'En préparation':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'Annulé':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'En attente de paiement':
      default:
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  };

  // Helper to open WhatsApp chat with client
  const handleRelanceWhatsApp = (e: React.MouseEvent, clientTel?: string, message?: string) => {
    e.stopPropagation();
    if (!clientTel) return;
    const cleanPhone = clientTel.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `228${cleanPhone}` : cleanPhone;
    const encoded = message ? encodeURIComponent(message) : '';
    window.open(`https://wa.me/${phoneWithCountry}${encoded ? `?text=${encoded}` : ''}`, '_blank', 'noopener,noreferrer');
  };

  // --- V3 ALERTS ENGINE: PAIEMENTS EN RETARD & DÉLAIS LOGISTIQUES ---
  const nowTime = Date.now();
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;

  // 1. Alertes Paiements en retard :
  // Commandes non soldées (solde > 0) non livrées/non annulées créées il y a plus de 3 jours, ou sans paiement depuis > 7 jours
  const alertesPaiement = activeCommandes
    .filter((cmd) => {
      if (cmd.solde <= 0 || cmd.statut === 'Payé' || cmd.statut === 'Livré' || cmd.statut === 'Annulé') return false;
      const cmdCreated = new Date(cmd.date).getTime();
      const ageDays = (nowTime - cmdCreated) / ONE_DAY_MS;
      return ageDays >= 3;
    })
    .map((cmd) => {
      const client = clients.find((c) => c.id === cmd.clientId);
      const cmdCreated = new Date(cmd.date).getTime();
      const retardJours = Math.floor((nowTime - cmdCreated) / ONE_DAY_MS);
      return {
        cmd,
        client,
        retardJours,
        solde: cmd.solde,
      };
    })
    .sort((a, b) => b.retardJours - a.retardJours);

  // 2. Alertes Délais Logistiques :
  // Commandes en transit ou en préparation dont dateArriveePrevue est dépassée ou approche (dans les 3 prochains jours)
  const alertesLogistique = activeCommandes
    .filter((cmd) => {
      if (cmd.statut === 'Livré' || cmd.statut === 'Annulé') return false;
      if (!cmd.logistique?.dateArriveePrevue) return false;
      const prevueTime = new Date(cmd.logistique.dateArriveePrevue).getTime();
      const diffJours = Math.round((prevueTime - nowTime) / ONE_DAY_MS);
      // Alerte si la date est dépassée (diffJours < 0) ou si elle arrive dans les 3 prochains jours (diffJours <= 3)
      return diffJours <= 3;
    })
    .map((cmd) => {
      const client = clients.find((c) => c.id === cmd.clientId);
      const prevueTime = new Date(cmd.logistique!.dateArriveePrevue!).getTime();
      const diffJours = Math.round((prevueTime - nowTime) / ONE_DAY_MS);
      const isRetard = diffJours < 0;
      return {
        cmd,
        client,
        diffJours,
        isRetard,
        datePrevue: cmd.logistique!.dateArriveePrevue!,
        statutLog: cmd.logistique?.statutLogistique || cmd.statut,
        transporteur: cmd.logistique?.transporteur,
        typeTransport: cmd.logistique?.typeTransport || 'Maritime',
      };
    })
    .sort((a, b) => a.diffJours - b.diffJours);

  const totalAlertesCount = alertesPaiement.length + alertesLogistique.length;

  return (
    <div className="space-y-5 pb-6">
      {/* Quick Action Banner - Minimalist High-Contrast Chic */}
      <div className="bg-neutral-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-neutral-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-neutral-200 text-xs font-semibold mb-2 border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Sourcing Chine & Alibaba Pro
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Tableau de bord commercial
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gérez vos cotations, commandes, arrivages et règlements en direct
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => onNavigate('notifications')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Bell className="w-4 h-4 text-cyan-400" />
              <span>Alertes</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('statistiques')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Statistiques</span>
            </button>

            <button
              onClick={onNewDevis}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-neutral-100 text-black font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              + Nouveau devis
            </button>
          </div>
        </div>
      </div>

      {/* V3 Intelligent Notifications Spotlight Banner */}
      {unreadNotificationsCount > 0 && (
        <div
          onClick={() => onNavigate('notifications')}
          className="bg-gradient-to-r from-blue-900/40 via-cyan-950/30 to-blue-950/40 border border-cyan-500/30 dark:border-cyan-500/20 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-500/50 transition-all shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  {unreadNotificationsCount} alerte{unreadNotificationsCount > 1 ? 's' : ''} importante{unreadNotificationsCount > 1 ? 's' : ''} en attente
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
                  Centre V3
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-1 mt-0.5">
                {notifications.find((n) => !n.read)?.titre || 'Paiements, dédouanements ou arrivages de conteneurs Chine-Togo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
            <span>Consulter</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* KPI 1: Clients */}
        <div
          onClick={() => onNavigate('clients')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              CLIENTS
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {totalClientsCount}
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Clients enregistrés
          </span>
        </div>

        {/* KPI 2: Devis */}
        <div
          onClick={() => onNavigate('devis')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              DEVIS
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {totalDevisCount}
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Devis en cours
          </span>
        </div>

        {/* KPI 3: Commandes */}
        <div
          onClick={() => onNavigate('commandes')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              COMMANDES
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {totalCommandesCount}
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Commandes actives
          </span>
        </div>

        {/* KPI 4: Paiements Reçus */}
        <div
          onClick={() => onNavigate('paiements')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              PAIEMENTS
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
            {formatCurrency(totalPaiementsRecus, parametres.devise)}
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Total encaissé
          </span>
        </div>

        {/* KPI 5: Reste à Recevoir */}
        <div
          onClick={() => onNavigate('commandes')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              RESTE À RECEVOIR
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
            {formatCurrency(totalResteARecevoir, parametres.devise)}
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Soldes clients
          </span>
        </div>

        {/* KPI 6: Bénéfice Estimé */}
        <div
          onClick={() => setShowRentabilite(!showRentabilite)}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-700 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              BÉNÉFICE
            </span>
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
            {formatCurrency(totalBenefice, parametres.devise)}
          </div>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Estimé commandes
          </span>
        </div>
      </div>

      {/* RENTABILITÉ DISCRÈTE SUR LE DASHBOARD */}
      <div className="bg-neutral-900 dark:bg-[#121214] text-white rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-neutral-300" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Rentabilité Globale (Privé)
            </h3>
          </div>
          <button
            onClick={() => setShowRentabilite(!showRentabilite)}
            className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition"
          >
            {showRentabilite ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Masquer
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> Afficher
              </>
            )}
          </button>
        </div>

        {showRentabilite ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-800">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Chiffre d'affaires
              </span>
              <p className="text-sm font-bold text-white">
                {formatCurrency(totalChiffreAffaires, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Coût réel
              </span>
              <p className="text-sm font-bold text-neutral-300">
                {formatCurrency(totalCoutReel, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Bénéfice estimé
              </span>
              <p className="text-sm font-bold text-white">
                {formatCurrency(totalBenefice, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Marge moyenne
              </span>
              <p className="text-sm font-bold text-white">
                {margeMoyenne.toFixed(2)} %
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">
            Données de rentabilité masquées pour préserver la confidentialité.
          </p>
        )}
      </div>

      {/* SECTION V3 : VIGILANCE COMMERCIALE & LOGISTIQUE (PAIEMENTS EN RETARD & DÉLAIS LOGISTIQUES) */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              totalAlertesCount > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Vigilance Commerciale & Délais Logistiques
                </h3>
                {totalAlertesCount > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                    {totalAlertesCount} alerte{totalAlertesCount > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Situation saine
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Paiements en attente de recouvrement et suivi des dates de livraison prévues Chine-Togo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onNavigate('commandes')}
              className="px-2.5 py-1 text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white rounded-lg bg-neutral-100 dark:bg-neutral-800 transition font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Gérer les commandes</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sous-section 1 : Paiements en retard */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                  Paiements en attente ({alertesPaiement.length})
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">Commandes &gt; 3 jours avec solde impayé</span>
            </div>

            {alertesPaiement.length === 0 ? (
              <div className="p-3.5 bg-neutral-50 dark:bg-[#18181b]/50 rounded-xl border border-neutral-100 dark:border-neutral-800/80 text-center text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Aucun retard de paiement identifié. Tous les acomptes sont à jour.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {alertesPaiement.slice(0, 4).map(({ cmd, client, retardJours, solde }) => (
                  <div
                    key={cmd.id}
                    onClick={() => onSelectCommande(cmd)}
                    className="p-3 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                          {cmd.numero}
                        </span>
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {client?.nom || 'Client'}
                        </span>
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          +{retardJours} j
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <span>Créée le {formatDate(cmd.date)}</span>
                        <span>•</span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          Reste à régler : {formatCurrency(solde, parametres.devise)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {client?.whatsapp || client?.telephone ? (
                        <button
                          onClick={(e) =>
                            handleRelanceWhatsApp(
                              e,
                              client.whatsapp || client.telephone,
                              `Bonjour ${client.nom}, concernant votre commande ${cmd.numero} sur Nantor Sourcing App, un solde de ${solde.toLocaleString('fr-FR')} ${parametres.devise} reste en attente de règlement. Merci de nous contacter pour convenir de la modalité.`
                            )
                          }
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-2xs"
                          title="Relancer le client sur WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span className="hidden sm:inline">Relancer</span>
                        </button>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </div>
                ))}

                {alertesPaiement.length > 4 && (
                  <button
                    onClick={() => onNavigate('commandes')}
                    className="w-full text-center text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white py-1 transition cursor-pointer"
                  >
                    + {alertesPaiement.length - 4} autre(s) commande(s) avec solde à recouvrer...
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sous-section 2 : Délais Logistiques (Approche ou Dépassé) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wide">
                  Délais Logistiques ({alertesLogistique.length})
                </span>
              </div>
              <span className="text-[10px] text-neutral-400">Date d'arrivée prévue &le; 3 jours ou dépassée</span>
            </div>

            {alertesLogistique.length === 0 ? (
              <div className="p-3.5 bg-neutral-50 dark:bg-[#18181b]/50 rounded-xl border border-neutral-100 dark:border-neutral-800/80 text-center text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
                <Truck className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Tous les acheminements logistiques respectent le calendrier prévu.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {alertesLogistique.slice(0, 4).map(({ cmd, client, diffJours, isRetard, datePrevue, statutLog, transporteur, typeTransport }) => (
                  <div
                    key={cmd.id}
                    onClick={() => onSelectCommande(cmd)}
                    className={`p-3 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isRetard
                        ? 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/40'
                        : 'bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                          {cmd.numero}
                        </span>
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {client?.nom || 'Client'}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-bold rounded-md flex items-center gap-1 ${
                            isRetard
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {isRetard ? (
                            <>
                              <AlertCircle className="w-2.5 h-2.5" />
                              Retard {Math.abs(diffJours)} j
                            </>
                          ) : diffJours === 0 ? (
                            'Arrivée aujourd’hui'
                          ) : (
                            `Dans ${diffJours} j`
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                        <span>Prévu : {formatDate(datePrevue)}</span>
                        <span>•</span>
                        <span className="truncate">{statutLog} ({typeTransport}{transporteur ? ` - ${transporteur}` : ''})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCommande(cmd);
                        }}
                        className="px-2 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-bold transition hover:opacity-90 shadow-2xs"
                      >
                        Suivi
                      </button>
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    </div>
                  </div>
                ))}

                {alertesLogistique.length > 4 && (
                  <button
                    onClick={() => onNavigate('commandes')}
                    className="w-full text-center text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white py-1 transition cursor-pointer"
                  >
                    + {alertesLogistique.length - 4} autre(s) expédition(s) à surveiller...
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-900 dark:text-white" />
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Commandes Récentes (5 dernières)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('commandes')}
            className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white flex items-center gap-0.5 underline-offset-4 hover:underline"
          >
            Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCommandes.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-xs">
            Aucune commande enregistrée pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {recentCommandes.map((cmd) => (
              <div
                key={cmd.id}
                onClick={() => onSelectCommande(cmd)}
                className="py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/40 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                      {cmd.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {getClientName(cmd.clientId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>{formatDate(cmd.date)}</span>
                    <span>•</span>
                    <span>Total : {formatCurrency(cmd.montantTotal, parametres.devise)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white">
                      Solde : {formatCurrency(cmd.solde, parametres.devise)}
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatutBadgeClass(
                        cmd.statut
                      )}`}
                    >
                      {cmd.statut}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
