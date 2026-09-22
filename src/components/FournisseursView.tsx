import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Phone,
  Mail,
  Star,
  Edit2,
  Trash2,
  Archive,
  Filter,
  CheckCircle,
  Clock,
  ShoppingBag,
  MapPin,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Fournisseur } from '../types';
import { formatDate } from '../utils/formatters';
import { openWhatsAppChat } from '../utils/pdfGenerator';

export const FournisseursView: React.FC = () => {
  const { fournisseurs, addFournisseur, updateFournisseur, archiveFournisseur, deleteFournisseur, sourcingList } =
    useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);

  // Form fields
  const [nom, setNom] = useState('');
  const [boutiqueAlibaba, setBoutiqueAlibaba] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [categorieProduits, setCategorieProduits] = useState('');
  const [villeChine, setVilleChine] = useState('');
  const [noteFiabilite, setNoteFiabilite] = useState<number>(5);
  const [delaiMoyenExpeditionJours, setDelaiMoyenExpeditionJours] = useState<number>(7);
  const [statut, setStatut] = useState<Fournisseur['statut']>('Actif');
  const [notes, setNotes] = useState('');

  const filteredFournisseurs = useMemo(() => {
    return fournisseurs.filter((f) => {
      if (f.isArchived) return false;
      const matchSearch =
        f.nom.toLowerCase().includes(search.toLowerCase()) ||
        (f.boutiqueAlibaba && f.boutiqueAlibaba.toLowerCase().includes(search.toLowerCase())) ||
        (f.categorieProduits && f.categorieProduits.toLowerCase().includes(search.toLowerCase())) ||
        (f.telephone && f.telephone.includes(search));
      const matchStatus = statusFilter === 'TOUS' || f.statut === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [fournisseurs, search, statusFilter]);

  const handleOpenAdd = () => {
    setEditingFournisseur(null);
    setNom('');
    setBoutiqueAlibaba('');
    setContactNom('');
    setTelephone('');
    setWhatsapp('');
    setEmail('');
    setCategorieProduits('');
    setVilleChine('Guangzhou');
    setNoteFiabilite(5);
    setDelaiMoyenExpeditionJours(7);
    setStatut('Actif');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Fournisseur) => {
    setEditingFournisseur(f);
    setNom(f.nom);
    setBoutiqueAlibaba(f.boutiqueAlibaba || '');
    setContactNom(f.contactNom || '');
    setTelephone(f.telephone || '');
    setWhatsapp(f.whatsapp || '');
    setEmail(f.email || '');
    setCategorieProduits(f.categorieProduits || '');
    setVilleChine(f.villeChine || '');
    setNoteFiabilite(f.noteFiabilite || 5);
    setDelaiMoyenExpeditionJours(f.delaiMoyenExpeditionJours || 7);
    setStatut(f.statut);
    setNotes(f.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    if (editingFournisseur) {
      updateFournisseur({
        ...editingFournisseur,
        nom,
        boutiqueAlibaba,
        contactNom,
        telephone,
        whatsapp,
        email,
        categorieProduits,
        villeChine,
        noteFiabilite,
        delaiMoyenExpeditionJours,
        statut,
        notes,
      });
    } else {
      addFournisseur({
        nom,
        boutiqueAlibaba,
        contactNom,
        telephone,
        whatsapp,
        email,
        categorieProduits,
        villeChine,
        noteFiabilite,
        delaiMoyenExpeditionJours,
        statut,
        notes,
        isArchived: false,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0B192C] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fournisseurs & Alibaba</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {filteredFournisseurs.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestion du répertoire des fabricants chinois, usines et boutiques Alibaba.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Ajouter un fournisseur
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, boutique Alibaba, catégorie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-[#0B192C] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {['TOUS', 'Actif', 'Favori', 'En négociation', 'Inactif'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0B192C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Fournisseurs List */}
      {filteredFournisseurs.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#0B192C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">Aucun fournisseur trouvé</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Cliquez sur « Ajouter un fournisseur » pour enregistrer votre premier contact d'usine ou boutique.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFournisseurs.map((f) => {
            const sourcingsCount = sourcingList.filter((s) => s.fournisseurId === f.id).length;

            return (
              <div
                key={f.id}
                className="bg-white dark:bg-[#0B192C] p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{f.nom}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            f.statut === 'Favori'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : f.statut === 'Actif'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : f.statut === 'En négociation'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {f.statut}
                        </span>
                      </div>
                      {f.categorieProduits && (
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                          {f.categorieProduits}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40 text-xs font-bold shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{f.noteFiabilite || 5}/5</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3">
                    {f.contactNom && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Contact :</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{f.contactNom}</span>
                      </div>
                    )}

                    {f.villeChine && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{f.villeChine}, Chine</span>
                      </div>
                    )}

                    {f.delaiMoyenExpeditionJours && (
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Délai moyen expédition : ~{f.delaiMoyenExpeditionJours} jours</span>
                      </div>
                    )}

                    {sourcingsCount > 0 && (
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{sourcingsCount} sourcing(s) associé(s)</span>
                      </div>
                    )}

                    {f.notes && (
                      <p className="text-[11px] italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg mt-1 line-clamp-2">
                        « {f.notes} »
                      </p>
                    )}
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {f.whatsapp && (
                      <button
                        onClick={() => openWhatsAppChat(f.whatsapp, `Hello ${f.contactNom || f.nom}, this is Nantor Sourcing App.`)}
                        title="Discuter sur WhatsApp"
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}

                    {f.boutiqueAlibaba && (
                      <a
                        href={f.boutiqueAlibaba.startsWith('http') ? f.boutiqueAlibaba : `https://${f.boutiqueAlibaba}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ouvrir la boutique Alibaba"
                        className="py-1.5 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-600 dark:text-amber-400 active:scale-95 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Alibaba</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95 transition-all cursor-pointer"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => archiveFournisseur(f.id)}
                      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-600 active:scale-95 transition-all cursor-pointer"
                      title="Archiver"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFournisseur(f.id)}
                      className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
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

      {/* Add / Edit Fournisseur Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  {editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur Chine'}
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
                  Nom du fournisseur / Usine *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Shenzhen Electronics Ltd"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lien boutique Alibaba / 1688 / Taobao
                </label>
                <input
                  type="text"
                  placeholder="https://shenzhen.en.alibaba.com"
                  value={boutiqueAlibaba}
                  onChange={(e) => setBoutiqueAlibaba(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nom du contact
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: David Chen"
                    value={contactNom}
                    onChange={(e) => setContactNom(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Ville / Région Chine
                  </label>
                  <input
                    type="text"
                    placeholder="Guangzhou, Yiwu, Shenzhen..."
                    value={villeChine}
                    onChange={(e) => setVilleChine(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    WhatsApp (avec indicatif)
                  </label>
                  <input
                    type="text"
                    placeholder="+86 138 0000 0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Téléphone / WeChat
                  </label>
                  <input
                    type="text"
                    placeholder="WeChat ID ou tél"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Catégorie de produits
                  </label>
                  <input
                    type="text"
                    placeholder="Téléphonie, Chaussures..."
                    value={categorieProduits}
                    onChange={(e) => setCategorieProduits(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Statut relationnel
                  </label>
                  <select
                    value={statut}
                    onChange={(e) => setStatut(e.target.value as Fournisseur['statut'])}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Favori">Favori</option>
                    <option value="En négociation">En négociation</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Note de fiabilité (1 à 5)
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNoteFiabilite(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= noteFiabilite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Délai d'expédition (jours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={delaiMoyenExpeditionJours}
                    onChange={(e) => setDelaiMoyenExpeditionJours(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Notes & Remarques (MOQ, conditions de paiement, etc.)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: MOQ 20 pièces, accepte Alipay, emballage soigné..."
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
