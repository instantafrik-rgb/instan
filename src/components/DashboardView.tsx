import React, { useState, useMemo } from 'react';
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
  Truck,
  MessageCircle,
  Receipt,
  Compass,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TabType, Commande, Devis, Facture, Sourcing } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: TabType, filter?: string) => void;
  onNewDevis: () => void;
  onSelectCommande: (commande: Commande) => void;
  onSelectDevis?: (devis: Devis) => void;
  onSelectFacture?: (facture: Facture) => void;
}

type ActionFilterType = 'all' | 'devis' | 'paiements' | 'suivi' | 'sourcing' | 'factures';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onNewDevis,
  onSelectCommande,
  onSelectDevis,
  onSelectFacture,
}) => {
  const {
    clients,
    devis,
    commandes,
    paiements,
    factures,
    sourcingList,
    rentabilites,
    parametres,
    notifications,
    unreadNotificationsCount,
  } = useApp();

  const [showRentabilite, setShowRentabilite] = useState<boolean>(false);
  const [selectedActionFilter, setSelectedActionFilter] = useState<ActionFilterType>('all');

  // Active items (not archived)
  const activeCommandes = useMemo(() => commandes.filter((c) => !c.isArchived), [commandes]);
  const activeDevis = useMemo(() => devis.filter((d) => !d.isArchived), [devis]);
  const activeFactures = useMemo(() => factures.filter((f) => !f.isArchived), [factures]);
  const activeSourcing = useMemo(() => sourcingList.filter((s) => !s.isArchived), [sourcingList]);

  // =========================================================================
  // 1. CHIFFRE D'AFFAIRES ENCAISSÉ & 2. RESTE À ENCAISSER
  // =========================================================================
  const totalPaiementsRecus = useMemo(
    () => paiements.reduce((acc, p) => acc + (p.montant || 0), 0),
    [paiements]
  );

  const totalResteARecevoir = useMemo(
    () => activeCommandes.reduce((acc, c) => acc + (c.solde || 0), 0),
    [activeCommandes]
  );

  const totalChiffreAffaires = useMemo(
    () => activeCommandes.reduce((acc, c) => acc + (c.montantTotal || 0), 0),
    [activeCommandes]
  );

  const tauxEncaissement = useMemo(() => {
    const totalVolume = totalPaiementsRecus + totalResteARecevoir;
    if (totalVolume <= 0) return 100;
    return Math.min(100, Math.round((totalPaiementsRecus / totalVolume) * 100));
  }, [totalPaiementsRecus, totalResteARecevoir]);

  // =========================================================================
  // 3. COMMANDES EN COURS & 4. COMMANDES EN TRANSIT
  // =========================================================================
  const commandesEnCours = useMemo(
    () => activeCommandes.filter((c) => c.statut !== 'Livré' && c.statut !== 'Annulé'),
    [activeCommandes]
  );

  const commandesEnTransit = useMemo(
    () =>
      activeCommandes.filter(
        (c) =>
          c.statut !== 'Livré' &&
          c.statut !== 'Annulé' &&
          (c.statut === 'Expédié de Chine' ||
            c.statut === 'En transit' ||
            c.logistique?.statutLogistique === 'EN TRANSIT' ||
            c.logistique?.statutLogistique === 'EXPÉDIÉ DE CHINE')
      ),
    [activeCommandes]
  );

  // =========================================================================
  // 5. DEVIS EN ATTENTE & 6. SOURCINGS EN ATTENTE & 7. FACTURES IMPAYÉES
  // =========================================================================
  const devisEnAttente = useMemo(
    () =>
      activeDevis.filter(
        (d) => d.statut === 'Envoyé' || d.statut === 'Brouillon' || d.statut === 'Accepté'
      ),
    [activeDevis]
  );
  const totalMontantDevisAttente = useMemo(
    () => devisEnAttente.reduce((acc, d) => acc + (d.total || 0), 0),
    [devisEnAttente]
  );

  const sourcingsEnAttente = useMemo(
    () =>
      activeSourcing.filter(
        (s) =>
          s.statut === 'À chercher' ||
          s.statut === 'En contact fournisseur' ||
          s.statut === 'Recherche' ||
          !s.fournisseurId
      ),
    [activeSourcing]
  );

  const isFactureNonReglee = (f: Facture) => {
    if (f.statut === 'Annulée') return false;
    const solde = f.solde ?? Math.max(0, f.total - (f.montantPaye || 0));
    if (solde > 0) return true;
    const st = String(f.statut).toLowerCase();
    return st === 'non payé' || st === 'partiellement payé' || st === 'partiellement payée' || st === 'émise' || st === 'envoyée';
  };

  const facturesImpayees = useMemo(
    () => activeFactures.filter((f) => isFactureNonReglee(f)),
    [activeFactures]
  );
  const totalFacturesImpayees = useMemo(
    () => facturesImpayees.reduce((acc, f) => acc + (f.solde ?? Math.max(0, f.total - (f.montantPaye || 0))), 0),
    [facturesImpayees]
  );

  // Rentabilité aggregates
  const rentabiliteList = Object.values(rentabilites);
  const totalBenefice = rentabiliteList.reduce((acc, r) => acc + (r.benefice || 0), 0);
  const totalCoutReel = rentabiliteList.reduce((acc, r) => acc + (r.coutReel || 0), 0);
  const margeMoyenne =
    totalChiffreAffaires > 0 ? (totalBenefice / totalChiffreAffaires) * 100 : 0;

  // Recent 5 commandes
  const recentCommandes = useMemo(
    () =>
      [...activeCommandes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [activeCommandes]
  );

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.nom : 'Client inconnu';
  };

  const getClient = (clientId?: string) => {
    if (!clientId) return undefined;
    return clients.find((c) => c.id === clientId);
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

  // Helper WhatsApp relance
  const handleRelanceWhatsApp = (e: React.MouseEvent, clientTel?: string, message?: string) => {
    e.stopPropagation();
    if (!clientTel) return;
    const cleanPhone = clientTel.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 8 ? `228${cleanPhone}` : cleanPhone;
    const encoded = message ? encodeURIComponent(message) : '';
    window.open(
      `https://wa.me/${phoneWithCountry}${encoded ? `?text=${encoded}` : ''}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // =========================================================================
  // 8. SECTION "À TRAITER" : ACTIONS NÉCESSITANT UNE INTERVENTION
  // =========================================================================
  const nowTime = Date.now();
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;

  // 8.a - Devis sans réponse (statut 'Envoyé' créé il y a >= 2 jours)
  const devisSansReponse = useMemo(() => {
    return activeDevis
      .filter((d) => {
        if (d.statut !== 'Envoyé') return false;
        const dCreated = new Date(d.date).getTime();
        const ageDays = (nowTime - dCreated) / ONE_DAY_MS;
        return ageDays >= 2;
      })
      .map((dev) => {
        const client = getClient(dev.clientId);
        const ageDays = Math.floor((nowTime - new Date(dev.date).getTime()) / ONE_DAY_MS);
        return { dev, client, ageDays };
      })
      .sort((a, b) => b.ageDays - a.ageDays);
  }, [activeDevis, clients, nowTime]);

  // 8.b - Paiements en retard (commandes non soldées créées il y a >= 3 jours)
  const alertesPaiement = useMemo(() => {
    return activeCommandes
      .filter((cmd) => {
        if (cmd.solde <= 0 || cmd.statut === 'Payé' || cmd.statut === 'Livré' || cmd.statut === 'Annulé')
          return false;
        const cmdCreated = new Date(cmd.date).getTime();
        const ageDays = (nowTime - cmdCreated) / ONE_DAY_MS;
        return ageDays >= 3;
      })
      .map((cmd) => {
        const client = getClient(cmd.clientId);
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
  }, [activeCommandes, clients, nowTime]);

  // 8.c - Commandes sans suivi logistique (actives, non annulées, non livrées, sans tracking)
  const commandesSansSuivi = useMemo(() => {
    return activeCommandes
      .filter((cmd) => {
        if (cmd.statut === 'Livré' || cmd.statut === 'Annulé') return false;
        const hasTrackingHeader = Boolean(cmd.numeroSuivi && cmd.numeroSuivi.trim() !== '');
        const hasTrackingLog = Boolean(
          cmd.logistique?.numeroSuivi && cmd.logistique.numeroSuivi.trim() !== ''
        );
        return !hasTrackingHeader && !hasTrackingLog;
      })
      .map((cmd) => {
        const client = getClient(cmd.clientId);
        const cmdCreated = new Date(cmd.date).getTime();
        const ageDays = Math.floor((nowTime - cmdCreated) / ONE_DAY_MS);
        return { cmd, client, ageDays };
      })
      .sort((a, b) => b.ageDays - a.ageDays);
  }, [activeCommandes, clients, nowTime]);

  // 8.d - Sourcing sans fournisseur (statut 'À chercher' ou sans fournisseur renseigné)
  const sourcingSansFournisseur = useMemo(() => {
    return activeSourcing
      .filter((s) => {
        if (s.statut === 'Abandonné' || s.statut === 'Transformé en devis' || s.statut === 'Refusé')
          return false;
        const hasFournisseur = Boolean(
          s.fournisseurId || (s.fournisseurNom && s.fournisseurNom.trim() !== '') || s.lienAlibaba
        );
        return !hasFournisseur || s.statut === 'À chercher';
      })
      .map((src) => {
        const client = getClient(src.clientId);
        const srcCreated = new Date(src.dateCreation).getTime();
        const ageDays = Math.floor((nowTime - srcCreated) / ONE_DAY_MS);
        return { src, client, ageDays };
      })
      .sort((a, b) => b.ageDays - a.ageDays);
  }, [activeSourcing, clients, nowTime]);

  // 8.e - Factures non réglées
  const facturesNonReglees = useMemo(() => {
    return activeFactures
      .filter((f) => isFactureNonReglee(f))
      .map((fac) => {
        const client = getClient(fac.clientId);
        const soldeDu = fac.solde ?? Math.max(0, fac.total - fac.montantPaye);
        const ageDays = Math.floor((nowTime - new Date(fac.date).getTime()) / ONE_DAY_MS);
        return { fac, client, soldeDu, ageDays };
      })
      .sort((a, b) => b.soldeDu - a.soldeDu);
  }, [activeFactures, clients, nowTime]);

  // Délais Logistiques (arrivages Chine-Togo sous 3 jours ou retardés)
  const alertesLogistique = useMemo(() => {
    return activeCommandes
      .filter((cmd) => {
        if (cmd.statut === 'Livré' || cmd.statut === 'Annulé') return false;
        if (!cmd.logistique?.dateArriveePrevue) return false;
        const prevueTime = new Date(cmd.logistique.dateArriveePrevue).getTime();
        const diffJours = Math.round((prevueTime - nowTime) / ONE_DAY_MS);
        return diffJours <= 3;
      })
      .map((cmd) => {
        const client = getClient(cmd.clientId);
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
  }, [activeCommandes, clients, nowTime]);

  // Total actions à traiter
  const totalActionsATraiter =
    devisSansReponse.length +
    alertesPaiement.length +
    commandesSansSuivi.length +
    sourcingSansFournisseur.length +
    facturesNonReglees.length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* Quick Action Header Banner */}
      <div className="bg-neutral-950 text-white rounded-2xl p-4 sm:p-6 shadow-xs border border-neutral-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-neutral-200 text-xs font-semibold mb-2 border border-white/15">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Sourcing Chine & Alibaba Pro • V4
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Tableau de bord commercial
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Vue synthétique : situation financière, flux logistique et priorités du jour
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => onNavigate('notifications')}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
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
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/15 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Statistiques</span>
            </button>

            <button
              onClick={onNewDevis}
              className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-neutral-100 text-black font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Nouveau devis</span>
            </button>
          </div>
        </div>
      </div>

      {/* V3/V4 Intelligent Notifications Spotlight Banner */}
      {unreadNotificationsCount > 0 && (
        <div
          onClick={() => onNavigate('notifications')}
          className="bg-gradient-to-r from-blue-900/30 via-cyan-950/20 to-blue-950/30 border border-cyan-500/30 dark:border-cyan-500/20 p-3 sm:p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-500/50 transition-all shadow-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                  {unreadNotificationsCount} alerte{unreadNotificationsCount > 1 ? 's' : ''} importante{unreadNotificationsCount > 1 ? 's' : ''} en attente
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300">
                  Direct
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate mt-0.5">
                {notifications.find((n) => !n.read)?.titre ||
                  'Paiements, dédouanements ou arrivages de conteneurs Chine-Togo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
            <span className="hidden sm:inline">Consulter</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PRIORITÉ 1 & 2 : BLOC FINANCIER MAJEUR (CA ENCAISSÉ + RESTE À ENCAISSER) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* 1. CHIFFRE D'AFFAIRES ENCAISSÉ */}
        <div
          onClick={() => onNavigate('paiements')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-700 cursor-pointer transition-all relative overflow-hidden group"
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                1. Chiffre d'affaires encaissé
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">
            {formatCurrency(totalPaiementsRecus, parametres.devise)}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400">
              {paiements.length} versement{paiements.length > 1 ? 's' : ''} validé{paiements.length > 1 ? 's' : ''}
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Voir paiements <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${tauxEncaissement}%` }}
            />
          </div>
        </div>

        {/* 2. RESTE À ENCAISSER */}
        <div
          onClick={() => onNavigate('commandes', 'En attente de paiement')}
          className={`rounded-2xl p-4 sm:p-5 border shadow-xs cursor-pointer transition-all relative overflow-hidden group ${
            totalResteARecevoir > 0
              ? 'bg-white dark:bg-[#121214] border-amber-300 dark:border-amber-800/60 hover:border-amber-500'
              : 'bg-white dark:bg-[#121214] border-neutral-200/90 dark:border-neutral-800/90 hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  totalResteARecevoir > 0 ? 'bg-amber-500 animate-pulse' : 'bg-neutral-400'
                }`}
              ></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                2. Reste à encaisser
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">
            {formatCurrency(totalResteARecevoir, parametres.devise)}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400">
              {activeCommandes.filter((c) => c.solde > 0).length} commande{activeCommandes.filter((c) => c.solde > 0).length > 1 ? 's' : ''} avec solde dû
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Recouvrer <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${100 - tauxEncaissement}%` }}
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PRIORITÉS 3, 4, 5, 6, 7 : GRILLE OPÉRATIONNELLE DU QUOTIDIEN */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* 3. COMMANDES EN COURS */}
        <div
          onClick={() => onNavigate('commandes')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-3.5 sm:p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                3. Commandes
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
              {commandesEnCours.length}
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
            <span>En cours d'exécution</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 4. COMMANDES EN TRANSIT */}
        <div
          onClick={() => onNavigate('commandes', 'Expédié de Chine')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-3.5 sm:p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                4. En transit
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {commandesEnTransit.length}
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
            <span>Chine → Togo</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 5. DEVIS EN ATTENTE */}
        <div
          onClick={() => onNavigate('devis', 'Envoyé')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-3.5 sm:p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-purple-500 dark:hover:border-purple-500 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                5. Devis
              </span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {devisEnAttente.length}
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
            <span>En attente client</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 6. SOURCINGS EN ATTENTE */}
        <div
          onClick={() => onNavigate('sourcing', 'À chercher')}
          className="bg-white dark:bg-[#121214] rounded-2xl p-3.5 sm:p-4 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs hover:border-cyan-500 dark:hover:border-cyan-500 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                6. Sourcings
              </span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Compass className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {sourcingsEnAttente.length}
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
            <span>À traiter / chiffrer</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* 7. FACTURES IMPAYÉES */}
        <div
          onClick={() => onNavigate('factures', 'Non payé')}
          className={`rounded-2xl p-3.5 sm:p-4 border shadow-xs cursor-pointer transition-all col-span-2 sm:col-span-1 group flex flex-col justify-between ${
            facturesImpayees.length > 0
              ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50 hover:border-rose-500'
              : 'bg-white dark:bg-[#121214] border-neutral-200/90 dark:border-neutral-800/90 hover:border-neutral-400'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                7. Factures
              </span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Receipt className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
              {facturesImpayees.length}
            </div>
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between mt-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/60">
            <span>Impayées / partielles</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PRIORITÉ 8 : SECTION "À TRAITER" (ACTIONS URGENTES NÉCESSITANT INTERVENTION) */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                totalActionsATraiter > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  8. À traiter • Actions prioritaires
                </h3>
                {totalActionsATraiter > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {totalActionsATraiter} action{totalActionsATraiter > 1 ? 's' : ''} urgente{totalActionsATraiter > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Toutes les actions sont à jour
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Relances devis, recouvrement soldes, saisie des trackings et attribution fournisseurs
              </p>
            </div>
          </div>

          {/* Quick Sub-filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
            {[
              { id: 'all', label: 'Toutes', count: totalActionsATraiter },
              { id: 'devis', label: 'Devis sans réponse', count: devisSansReponse.length },
              { id: 'paiements', label: 'Paiements en retard', count: alertesPaiement.length },
              { id: 'suivi', label: 'Sans suivi logistique', count: commandesSansSuivi.length },
              { id: 'sourcing', label: 'Sourcing sans fourn.', count: sourcingSansFournisseur.length },
              { id: 'factures', label: 'Factures impayées', count: facturesNonReglees.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedActionFilter(tab.id as ActionFilterType)}
                className={`px-2.5 py-1.5 rounded-xl font-semibold whitespace-nowrap text-[11px] flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedActionFilter === tab.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-2xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      selectedActionFilter === tab.id
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state when zero actions */}
        {totalActionsATraiter === 0 && (
          <div className="p-6 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
            <p className="font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
              Excellente gestion commerciale !
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Aucun devis sans réponse, aucun paiement en souffrance ni retard logistique identifié.
            </p>
          </div>
        )}

        {/* Actions List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Action Item Group 1 : Devis sans réponse */}
          {(selectedActionFilter === 'all' || selectedActionFilter === 'devis') &&
            devisSansReponse.slice(0, selectedActionFilter === 'devis' ? 10 : 3).map(({ dev, client, ageDays }) => (
              <div
                key={dev.id}
                onClick={() => {
                  if (onSelectDevis) onSelectDevis(dev);
                  else onNavigate('devis', 'Envoyé');
                }}
                className="p-3 bg-purple-500/5 hover:bg-purple-500/10 dark:bg-purple-950/20 dark:hover:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                      {dev.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {client?.nom || 'Client'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300">
                      Sans réponse depuis {ageDays} j
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <span>Devis : {formatCurrency(dev.total, parametres.devise)}</span>
                    <span>•</span>
                    <span>Envoyé le {formatDate(dev.date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {client?.whatsapp || client?.telephone ? (
                    <button
                      onClick={(e) =>
                        handleRelanceWhatsApp(
                          e,
                          client.whatsapp || client.telephone,
                          `Bonjour ${client.nom}, suite à l'envoi de votre devis ${dev.numero} pour un montant de ${dev.total.toLocaleString(
                            'fr-FR'
                          )} ${parametres.devise} sur Nantor Sourcing, avez-vous des questions ou souhaitez-vous que nous validions la commande pour lancer l'achat en Chine ?`
                        )
                      }
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Relancer sur WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Relancer</span>
                    </button>
                  ) : null}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}

          {/* Action Item Group 2 : Paiements en retard */}
          {(selectedActionFilter === 'all' || selectedActionFilter === 'paiements') &&
            alertesPaiement.slice(0, selectedActionFilter === 'paiements' ? 10 : 3).map(({ cmd, client, retardJours, solde }) => (
              <div
                key={cmd.id}
                onClick={() => onSelectCommande(cmd)}
                className="p-3 bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                      {cmd.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {client?.nom || 'Client'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Solde en attente (+{retardJours} j)
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      Dû : {formatCurrency(solde, parametres.devise)}
                    </span>
                    <span>•</span>
                    <span>Créée le {formatDate(cmd.date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {client?.whatsapp || client?.telephone ? (
                    <button
                      onClick={(e) =>
                        handleRelanceWhatsApp(
                          e,
                          client.whatsapp || client.telephone,
                          `Bonjour ${client.nom}, concernant votre commande ${cmd.numero} sur Nantor Sourcing, un solde de ${solde.toLocaleString(
                            'fr-FR'
                          )} ${parametres.devise} reste en attente de règlement. Merci de nous faire signe pour convenir du versement.`
                        )
                      }
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Relancer le client sur WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Relancer</span>
                    </button>
                  ) : null}
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}

          {/* Action Item Group 3 : Commandes sans suivi logistique */}
          {(selectedActionFilter === 'all' || selectedActionFilter === 'suivi') &&
            commandesSansSuivi.slice(0, selectedActionFilter === 'suivi' ? 10 : 3).map(({ cmd, client, ageDays }) => (
              <div
                key={cmd.id}
                onClick={() => onSelectCommande(cmd)}
                className="p-3 bg-blue-500/5 hover:bg-blue-500/10 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">
                      {cmd.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {client?.nom || 'Client'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-400">
                      Suivi manquant
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <span>Statut : {cmd.statut}</span>
                    <span>•</span>
                    <span>En cours depuis {ageDays} j</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-xs font-semibold hover:opacity-90">
                    Ajouter suivi
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}

          {/* Action Item Group 4 : Sourcing sans fournisseur */}
          {(selectedActionFilter === 'all' || selectedActionFilter === 'sourcing') &&
            sourcingSansFournisseur.slice(0, selectedActionFilter === 'sourcing' ? 10 : 3).map(({ src, client, ageDays }) => (
              <div
                key={src.id}
                onClick={() => onNavigate('sourcing', 'À chercher')}
                className="p-3 bg-cyan-500/5 hover:bg-cyan-500/10 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-900/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400">
                      {src.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {src.produitRecherche}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
                      À sourcer ({ageDays} j)
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <span>Demandé par {client?.nom || 'Client'}</span>
                    <span>•</span>
                    <span>Quantité : {src.quantiteSouhaitee || 1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold">
                    Trouver fournisseur
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}

          {/* Action Item Group 5 : Factures non réglées */}
          {(selectedActionFilter === 'all' || selectedActionFilter === 'factures') &&
            facturesNonReglees.slice(0, selectedActionFilter === 'factures' ? 10 : 3).map(({ fac, client, soldeDu, ageDays }) => (
              <div
                key={fac.id}
                onClick={() => {
                  if (onSelectFacture) onSelectFacture(fac);
                  else onNavigate('factures', 'Non payé');
                }}
                className="p-3 bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-400">
                      {fac.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {client?.nom || 'Client'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      {fac.statut}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      Reste à régler : {formatCurrency(soldeDu, parametres.devise)}
                    </span>
                    <span>•</span>
                    <span>Émise il y a {ageDays} j</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold">
                    Encaisser
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIGILANCE DÉLAIS LOGISTIQUES (CHINE-TOGO) */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Délais Logistiques & Arrivages Togo ({alertesLogistique.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('commandes', 'Expédié de Chine')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Toutes les expéditions <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {alertesLogistique.length === 0 ? (
          <div className="p-3.5 bg-neutral-50 dark:bg-[#18181b]/50 rounded-xl border border-neutral-100 dark:border-neutral-800/80 text-center text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Tous les acheminements logistiques Chine-Togo respectent le calendrier prévu.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                    <span className="truncate">
                      {statutLog} ({typeTransport}
                      {transporteur ? ` - ${transporteur}` : ''})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-1 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-bold">
                    Suivi
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* COMMANDES RÉCENTES (5 DERNIÈRES) */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl p-4 sm:p-5 border border-neutral-200/90 dark:border-neutral-800/90 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-900 dark:text-white" />
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Commandes Récentes (5 dernières)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('commandes')}
            className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white flex items-center gap-0.5 underline-offset-4 hover:underline cursor-pointer"
          >
            Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentCommandes.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 dark:text-neutral-400 text-xs">
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
                <div className="space-y-0.5 min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                      {cmd.numero}
                    </span>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {getClientName(cmd.clientId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>{formatDate(cmd.date)}</span>
                    <span>•</span>
                    <span>Total : {formatCurrency(cmd.montantTotal, parametres.devise)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-right shrink-0">
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

      {/* ===================================================================== */}
      {/* RENTABILITÉ GLOBALE (DISCRÈTE / CONFIDENTIELLE) */}
      {/* ===================================================================== */}
      <div className="bg-neutral-900 dark:bg-[#121214] text-white rounded-2xl p-4 sm:p-5 border border-neutral-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-neutral-300" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Rentabilité Commerciale & Marge (Confidentiel)
            </h3>
          </div>
          <button
            onClick={() => setShowRentabilite(!showRentabilite)}
            className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer"
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
                Volume commandé (CA)
              </span>
              <p className="text-sm font-bold text-white">
                {formatCurrency(totalChiffreAffaires, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Coût réel d'achat & fret
              </span>
              <p className="text-sm font-bold text-neutral-300">
                {formatCurrency(totalCoutReel, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Bénéfice net estimé
              </span>
              <p className="text-sm font-bold text-emerald-400">
                {formatCurrency(totalBenefice, parametres.devise)}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase">
                Marge moyenne
              </span>
              <p className="text-sm font-bold text-emerald-400">
                {margeMoyenne.toFixed(2)} %
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">
            Données de rentabilité et marges masquées pour préserver la confidentialité en présence de tiers.
          </p>
        )}
      </div>
    </div>
  );
};
