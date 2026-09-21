import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ShoppingBag,
  Users,
  Building2,
  CheckCircle,
  Truck,
  Eye,
  EyeOff,
  Percent,
  Wallet,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateRapportStatistiquesPDF } from '../utils/pdfGenerator';

type PeriodeFilter = 'all' | 'today' | 'month' | 'quarter' | 'year';

export const StatistiquesView: React.FC = () => {
  const { clients, commandes, devis, paiements, factures, fournisseurs, rentabilites, parametres, toggleModePrive, showToast } =
    useApp();

  const isModePrive = parametres.modePrive;
  const [periode, setPeriode] = useState<PeriodeFilter>('all');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');

  // Filter dates
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

  // Filtered orders based on period and client
  const filteredCommandes = useMemo(() => {
    return commandes.filter((c) => {
      if (c.isArchived) return false;
      if (selectedClientFilter !== 'all' && c.clientId !== selectedClientFilter) return false;

      const cDate = new Date(c.date).getTime();
      if (periode === 'today') return cDate >= startOfDay;
      if (periode === 'month') return cDate >= startOfMonth;
      if (periode === 'quarter') return cDate >= startOfQuarter;
      if (periode === 'year') return cDate >= startOfYear;
      return true;
    });
  }, [commandes, periode, selectedClientFilter, startOfDay, startOfMonth, startOfQuarter, startOfYear]);

  // Key KPI metrics on filtered orders
  const totalFacture = filteredCommandes.reduce((sum, c) => sum + c.montantTotal, 0);
  const totalSoldeDu = filteredCommandes.reduce((sum, c) => sum + c.solde, 0);

  // Filtered payments
  const filteredPaiements = useMemo(() => {
    const cmdIds = new Set(filteredCommandes.map((c) => c.id));
    return paiements.filter((p) => {
      if (selectedClientFilter !== 'all' || periode !== 'all') {
        return p.commandeId ? cmdIds.has(p.commandeId) : true;
      }
      return true;
    });
  }, [paiements, filteredCommandes, selectedClientFilter, periode]);

  const totalEncaisse = filteredPaiements.reduce((sum, p) => sum + p.montant, 0);

  // Profitability calculations
  let totalCoutReel = 0;
  let totalBenefice = 0;
  let rentabiliteCount = 0;

  filteredCommandes.forEach((c) => {
    const r = rentabilites[c.id];
    if (r) {
      totalCoutReel += r.coutReel;
      totalBenefice += r.benefice;
      rentabiliteCount++;
    }
  });

  const margeMoyenne = totalFacture > 0 ? ((totalBenefice / totalFacture) * 100).toFixed(1) : '0.0';

  // Orders by Status
  const statusCounts = {
    total: filteredCommandes.length,
    enCours: filteredCommandes.filter((c) => c.statut !== 'Livré' && c.statut !== 'Annulé').length,
    enTransit: filteredCommandes.filter((c) => c.statut === 'En transit' || c.statut === 'Expédié de Chine').length,
    auTogo: filteredCommandes.filter((c) => c.statut === 'Arrivé au Togo' || c.statut === 'Disponible').length,
    livres: filteredCommandes.filter((c) => c.statut === 'Livré').length,
  };

  // Top clients by revenue
  const clientRevenueMap: Record<string, { nom: string; total: number; count: number }> = {};
  filteredCommandes.forEach((c) => {
    const client = clients.find((cli) => cli.id === c.clientId);
    const nom = client ? client.nom : 'Client inconnu';
    if (!clientRevenueMap[c.clientId]) {
      clientRevenueMap[c.clientId] = { nom, total: 0, count: 0 };
    }
    clientRevenueMap[c.clientId].total += c.montantTotal;
    clientRevenueMap[c.clientId].count += 1;
  });

  const topClients = Object.values(clientRevenueMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Export PDF Handler
  const handleExportPDF = () => {
    const periodeLabelMap: Record<PeriodeFilter, string> = {
      all: 'Historique complet',
      today: "Aujourd'hui",
      month: 'Ce mois-ci',
      quarter: 'Ce trimestre',
      year: 'Cette année',
    };

    const { blob, filename } = generateRapportStatistiquesPDF(
      {
        periode: periodeLabelMap[periode],
        totalFacture,
        totalEncaisse,
        totalSoldeDu,
        totalBenefice,
        margeMoyenne,
        commandesCount: statusCounts.total,
        enTransitCount: statusCounts.enTransit,
        auTogoCount: statusCounts.auTogo,
        livresCount: statusCounts.livres,
        topClients,
        isModePrive,
      },
      parametres
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Rapport PDF des statistiques exporté avec succès');
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = ['Type', 'Valeur', 'Devise', 'Commentaire'];
    const rows = [
      ['CA Facturé', totalFacture.toString(), parametres.devise, `${filteredCommandes.length} commandes`],
      ['Total Encaissé', totalEncaisse.toString(), parametres.devise, `${filteredPaiements.length} paiements`],
      ['Créances Restantes', totalSoldeDu.toString(), parametres.devise, 'Solde à recouvrer'],
      [
        'Bénéfice Net',
        isModePrive ? 'Masqué (Mode Privé)' : totalBenefice.toString(),
        parametres.devise,
        `Marge : ${margeMoyenne}%`,
      ],
      ['Commandes en cours', statusCounts.enCours.toString(), 'Nb', ''],
      ['En transit Chine-Togo', statusCounts.enTransit.toString(), 'Nb', ''],
      ['Disponibles Lomé', statusCounts.auTogo.toString(), 'Nb', ''],
      ['Livrées', statusCounts.livres.toString(), 'Nb', ''],
    ];

    topClients.forEach((tc, idx) => {
      rows.push([`Top Client #${idx + 1} - ${tc.nom}`, tc.total.toString(), parametres.devise, `${tc.count} commandes`]);
    });

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Statistiques_Nantor_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Statistiques exportées au format CSV (Excel/Sheets)');
  };

  // Monthly trends calculation (Last 6 months)
  const monthlyData = useMemo(() => {
    const months: { label: string; ca: number; encaisse: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleDateString('fr-FR', { month: 'short' });
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const mCmds = commandes.filter((c) => {
        if (c.isArchived) return false;
        const time = new Date(c.date).getTime();
        return time >= d.getTime() && time < nextD.getTime();
      });

      const ca = mCmds.reduce((sum, c) => sum + c.montantTotal, 0);

      const mPayments = paiements.filter((p) => {
        const time = new Date(p.date).getTime();
        return time >= d.getTime() && time < nextD.getTime();
      });

      const enc = mPayments.reduce((sum, p) => sum + p.montant, 0);

      months.push({ label: mName.toUpperCase(), ca, encaisse: enc });
    }
    return months;
  }, [commandes, paiements]);

  const maxMonthVal = Math.max(...monthlyData.map((m) => Math.max(m.ca, m.encaisse)), 1);

  return (
    <div className="space-y-4">
      {/* Header with Mode Privé toggle and Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rapports & Statistiques</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-cyan-300">
              V3 Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            KPIs d'activité, flux d'encaissement, rentabilité confidentielle et exports certifiés.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleModePrive}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              isModePrive
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Masque les marges et bénéfices pour protéger vos données devant un client"
          >
            {isModePrive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isModePrive ? 'Mode Privé Actif' : 'Mode Privé'}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-cyan-600 dark:hover:bg-cyan-700 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar: Periode & Client */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0B192C] p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        {/* Periode filter buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 mr-1 text-[11px]">
            <Calendar className="w-3.5 h-3.5" /> Période :
          </span>
          {[
            { id: 'all', label: 'Tout' },
            { id: 'today', label: "Aujourd'hui" },
            { id: 'month', label: 'Ce mois' },
            { id: 'quarter', label: 'Ce trimestre' },
            { id: 'year', label: 'Cette année' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriode(item.id as PeriodeFilter)}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                periode === item.id
                  ? 'bg-blue-600 text-white dark:bg-cyan-600'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Client filter dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 text-[11px]">
            <Filter className="w-3.5 h-3.5" /> Client :
          </span>
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="all">Tous les clients</option>
            {clients.map((cli) => (
              <option key={cli.id} value={cli.id}>
                {cli.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Chiffre d'Affaires */}
        <div className="bg-white dark:bg-[#0B192C] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              CA Facturé
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
            {formatCurrency(totalFacture, parametres.devise)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{filteredCommandes.length} commande(s) filtrée(s)</p>
        </div>

        {/* Encaissé */}
        <div className="bg-white dark:bg-[#0B192C] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Encaissé
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalEncaisse, parametres.devise)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{filteredPaiements.length} paiements reçus</p>
        </div>

        {/* Solde restant dû */}
        <div className="bg-white dark:bg-[#0B192C] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Créances Clients
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400">
            {formatCurrency(totalSoldeDu, parametres.devise)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Solde à recouvrer</p>
        </div>

        {/* Bénéfice Net (Mode Privé Aware) */}
        <div className="bg-white dark:bg-[#0B192C] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Bénéfice Net
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-purple-600 dark:text-purple-400">
            {isModePrive ? '••••••' : formatCurrency(totalBenefice, parametres.devise)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Marge moy : {isModePrive ? '•• %' : `${margeMoyenne} %`}
          </p>
        </div>
      </div>

      {/* Monthly Trends Chart (Pure CSS Bar Chart) */}
      <div className="bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Évolution Commerciale Mensuelle (6 derniers mois)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparaison entre Chiffre d'Affaires facturé et Encaissés réels en FCFA
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 dark:bg-cyan-500"></span> CA Facturé
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> Encaissé
            </span>
          </div>
        </div>

        {/* Bar chart container */}
        <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
          {monthlyData.map((m, idx) => {
            const heightCA = Math.max(Math.round((m.ca / maxMonthVal) * 100), 4);
            const heightEnc = Math.max(Math.round((m.encaisse / maxMonthVal) * 100), 4);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-32">
                  {/* CA Bar */}
                  <div
                    style={{ height: `${heightCA}%` }}
                    className="w-full max-w-[20px] bg-blue-600 dark:bg-cyan-500 rounded-t-md transition-all duration-300 relative group/bar hover:opacity-85"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap z-10 font-mono">
                      {formatCurrency(m.ca, parametres.devise)}
                    </div>
                  </div>
                  {/* Encaissé Bar */}
                  <div
                    style={{ height: `${heightEnc}%` }}
                    className="w-full max-w-[20px] bg-emerald-500 rounded-t-md transition-all duration-300 relative group/bar hover:opacity-85"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover/bar:block bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap z-10 font-mono">
                      {formatCurrency(m.encaisse, parametres.devise)}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logistics and Orders Pipeline Breakdown */}
      <div className="bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-500" />
          Pipeline Logistique & Commandes
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-1">En cours totales</span>
            <strong className="text-base font-mono text-slate-900 dark:text-white">{statusCounts.enCours}</strong>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300">
            <span className="block mb-1">En transit Chine-Togo</span>
            <strong className="text-base font-mono">{statusCounts.enTransit}</strong>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300">
            <span className="block mb-1">À Lomé / Prêt retrait</span>
            <strong className="text-base font-mono">{statusCounts.auTogo}</strong>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            <span className="block mb-1">Livrées avec succès</span>
            <strong className="text-base font-mono">{statusCounts.livres}</strong>
          </div>
        </div>
      </div>

      {/* Two columns: Top Clients & Suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Clients */}
        <div className="bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Top Clients par Volume d'Achat
          </h3>

          <div className="space-y-2 text-xs">
            {topClients.map((tc, idx) => (
              <div
                key={tc.nom}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{tc.nom}</span>
                    <span className="text-[10px] text-slate-400">{tc.count} commande(s)</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(tc.total, parametres.devise)}
                </span>
              </div>
            ))}
            {topClients.length === 0 && (
              <p className="text-center py-4 text-slate-400 text-xs">Aucune commande enregistrée pour le moment.</p>
            )}
          </div>
        </div>

        {/* Top Suppliers Directory Snapshot */}
        <div className="bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            Fournisseurs Actifs en Chine
          </h3>

          <div className="space-y-2 text-xs">
            {fournisseurs.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{f.nom}</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400">{f.categorieProduits || 'Général'}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    ★ {f.noteFiabilite || 5}/5
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{f.villeChine || 'Chine'}</span>
                </div>
              </div>
            ))}
            {fournisseurs.length === 0 && (
              <p className="text-center py-4 text-slate-400 text-xs">Aucun fournisseur enregistré.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
