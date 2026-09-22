import React, { useState, useMemo } from 'react';
import {
  Compass,
  Plus,
  Search,
  ExternalLink,
  ArrowRight,
  Edit2,
  Trash2,
  Archive,
  Building2,
  User,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  X,
  Upload,
  Link2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sourcing, Client, Devis } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface SourcingViewProps {
  onSelectDevis?: (devis: Devis) => void;
  onNavigateToDevis?: () => void;
  initialFilter?: string | null;
}

export const SourcingView: React.FC<SourcingViewProps> = ({ onSelectDevis, onNavigateToDevis, initialFilter }) => {
  const {
    sourcingList,
    clients,
    fournisseurs,
    parametres,
    addSourcing,
    updateSourcing,
    archiveSourcing,
    deleteSourcing,
    convertSourcingToDevis,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || 'TOUS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSourcing, setEditingSourcing] = useState<Sourcing | null>(null);

  React.useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // Form states
  const [produitRecherche, setProduitRecherche] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [quantiteSouhaitee, setQuantiteSouhaitee] = useState<number>(10);
  const [fournisseurId, setFournisseurId] = useState('');
  const [fournisseurNom, setFournisseurNom] = useState('');
  const [lienAlibaba, setLienAlibaba] = useState('');
  const [prixFournisseur, setPrixFournisseur] = useState<number>(0);
  const [statut, setStatut] = useState<Sourcing['statut']>('À chercher');
  const [photo, setPhoto] = useState<string>('');
  const [notes, setNotes] = useState('');

  const filteredSourcing = useMemo(() => {
    return sourcingList.filter((s) => {
      if (s.isArchived) return false;
      const client = clients.find((c) => c.id === s.clientId);
      const matchSearch =
        s.numero.toLowerCase().includes(search.toLowerCase()) ||
        s.produitRecherche.toLowerCase().includes(search.toLowerCase()) ||
        (client && client.nom.toLowerCase().includes(search.toLowerCase())) ||
        (s.fournisseurNom && s.fournisseurNom.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'TOUS' || s.statut === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sourcingList, clients, search, statusFilter]);

  const handleOpenAdd = () => {
    setEditingSourcing(null);
    setProduitRecherche('');
    setClientId(clients[0]?.id || '');
    setDescription('');
    setQuantiteSouhaitee(10);
    setFournisseurId('');
    setFournisseurNom('');
    setLienAlibaba('');
    setPrixFournisseur(0);
    setStatut('À chercher');
    setPhoto('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Sourcing) => {
    setEditingSourcing(s);
    setProduitRecherche(s.produitRecherche);
    setClientId(s.clientId);
    setDescription(s.description || '');
    setQuantiteSouhaitee(s.quantiteSouhaitee || 1);
    setFournisseurId(s.fournisseurId || '');
    setFournisseurNom(s.fournisseurNom || '');
    setLienAlibaba(s.lienAlibaba || '');
    setPrixFournisseur(s.prixFournisseur || 0);
    setStatut(s.statut);
    setPhoto(s.photo || '');
    setNotes(s.notes || '');
    setIsModalOpen(true);
  };

  const handleFournisseurChange = (id: string) => {
    setFournisseurId(id);
    const f = fournisseurs.find((item) => item.id === id);
    if (f) {
      setFournisseurNom(f.nom);
      if (f.boutiqueAlibaba && !lienAlibaba) {
        setLienAlibaba(f.boutiqueAlibaba);
      }
    } else {
      setFournisseurNom('');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (loadEvt.target?.result) {
          setPhoto(loadEvt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!produitRecherche.trim() || !clientId) return;

    if (editingSourcing) {
      updateSourcing({
        ...editingSourcing,
        produitRecherche,
        clientId,
        description,
        quantiteSouhaitee,
        fournisseurId: fournisseurId || undefined,
        fournisseurNom: fournisseurNom || undefined,
        lienAlibaba: lienAlibaba || undefined,
        prixFournisseur,
        statut,
        photo: photo || undefined,
        notes: notes || undefined,
      });
    } else {
      addSourcing({
        produitRecherche,
        clientId,
        description,
        quantiteSouhaitee,
        fournisseurId: fournisseurId || undefined,
        fournisseurNom: fournisseurNom || undefined,
        lienAlibaba: lienAlibaba || undefined,
        prixFournisseur,
        statut,
        photo: photo || undefined,
        notes: notes || undefined,
        isArchived: false,
      });
    }
    setIsModalOpen(false);
  };

  const handleTransformToDevis = (sourcingId: string) => {
    const newDevis = convertSourcingToDevis(sourcingId);
    if (newDevis) {
      if (onSelectDevis) onSelectDevis(newDevis);
      if (onNavigateToDevis) onNavigateToDevis();
    }
  };

  const getStatusBadge = (st: Sourcing['statut']) => {
    switch (st) {
      case 'Transformé en devis':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
      case 'Prix validé':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'Échantillon demandé':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'En contact fournisseur':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'Abandonné':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      case 'À chercher':
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Demandes de Sourcing</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {filteredSourcing.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recherche de produits en Chine, liens Alibaba et conversion directe en devis.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nouvelle recherche sourcing
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, produit, client, fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#0B192C] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['TOUS', 'À chercher', 'En contact fournisseur', 'Prix validé', 'Transformé en devis', 'Abandonné'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#0B192C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Sourcing Cards List */}
      {filteredSourcing.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#0B192C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Compass className="w-6 h-6" />
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">Aucune demande de sourcing trouvée</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Créez une recherche pour un client afin de négocier avec les usines en Chine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSourcing.map((s) => {
            const client = clients.find((c) => c.id === s.clientId);

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        {s.numero}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(s.statut)}`}>
                        {s.statut}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{formatDate(s.dateCreation)}</span>
                  </div>

                  {/* Product Title and Photo */}
                  <div className="flex gap-3 my-2">
                    {s.photo ? (
                      <img
                        src={s.photo}
                        alt={s.produitRecherche}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {s.produitRecherche}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {s.description || 'Pas de description détaillée.'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium">Qté : <strong>{s.quantiteSouhaitee} pcs</strong></span>
                        {s.prixFournisseur ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                            ~{formatCurrency(s.prixFournisseur, parametres.devise)} / u
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Client and Supplier info */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80 my-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        Client : <strong className="text-slate-800 dark:text-slate-200">{client?.nom || 'Inconnu'}</strong>
                      </span>
                      {client?.telephone && <span className="font-mono text-[11px]">{client.telephone}</span>}
                    </div>

                    {s.fournisseurNom && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-amber-500" />
                          Fournisseur : <strong className="text-slate-800 dark:text-slate-200">{s.fournisseurNom}</strong>
                        </span>
                      </div>
                    )}

                    {s.lienAlibaba && (
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Link2 className="w-3 h-3 text-amber-500" />
                          Lien produit Chine
                        </span>
                        <a
                          href={s.lienAlibaba.startsWith('http') ? s.lienAlibaba : `https://${s.lienAlibaba}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-amber-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          Ouvrir Alibaba <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Transformer en devis button (Requirement 19) */}
                  {s.statut !== 'Transformé en devis' ? (
                    <button
                      onClick={() => handleTransformToDevis(s.id)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Transformer en devis
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Devis créé
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => archiveSourcing(s.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-600 transition-colors"
                      title="Archiver"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSourcing(s.id)}
                      className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Sourcing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  {editingSourcing ? `Modifier ${editingSourcing.numero}` : 'Nouvelle recherche Sourcing'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Produit recherché *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Écouteurs sans fil ANC Bluetooth 5.3"
                  value={produitRecherche}
                  onChange={(e) => setProduitRecherche(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Client demandeur *
                  </label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.telephone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Quantité souhaitée
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantiteSouhaitee}
                    onChange={(e) => setQuantiteSouhaitee(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Photo ou capture d'écran du produit
                </label>
                <div className="flex items-center gap-3">
                  {photo ? (
                    <img
                      src={photo}
                      alt="Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-300 dark:border-slate-700 bg-slate-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Importer une photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto('')}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Fournisseur Chine (optionnel)
                  </label>
                  <select
                    value={fournisseurId}
                    onChange={(e) => handleFournisseurChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">Sélectionner ou vide</option>
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Prix fournisseur estimé ({parametres.devise})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={prixFournisseur}
                    onChange={(e) => setPrixFournisseur(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Lien produit Alibaba / 1688 / Taobao
                </label>
                <input
                  type="text"
                  placeholder="https://french.alibaba.com/p-detail/..."
                  value={lienAlibaba}
                  onChange={(e) => setLienAlibaba(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Statut de la recherche
                  </label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as Sourcing['statut'])}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="À chercher">À chercher</option>
                    <option value="En contact fournisseur">En contact fournisseur</option>
                    <option value="Échantillon demandé">Échantillon demandé</option>
                    <option value="Prix validé">Prix validé</option>
                    <option value="Transformé en devis">Transformé en devis</option>
                    <option value="Abandonné">Abandonné</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Spécifications techniques
                  </label>
                  <input
                    type="text"
                    placeholder="Couleur noire, logo gravé, prise EU..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes & Conditions de négociation
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Échantillon reçu conforme, négocier 5% de remise si 50 pcs commandées..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
