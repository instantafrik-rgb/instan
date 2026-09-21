import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  ChevronRight,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import { Client, Devis, Commande } from '../types';
import { useApp } from '../context/AppContext';
import { ClientDetailModal } from './ClientDetailModal';
import { ClientFormModal } from './ClientFormModal';
import { AddClientChoiceModal } from './AddClientChoiceModal';
import { SelectPhoneModal } from './SelectPhoneModal';
import { DuplicateClientModal } from './DuplicateClientModal';
import {
  isContactPickerSupported,
  pickPhoneContact,
  findDuplicateClient,
  parseVCardText,
} from '../utils/contactPicker';

interface ClientsViewProps {
  onNewDevis: (client?: Client) => void;
  onSelectDevis: (devis: Devis) => void;
  onSelectCommande: (commande: Commande) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onNewDevis,
  onSelectDevis,
  onSelectCommande,
}) => {
  const { clients, addClient, updateClient, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Modal choice: Manual or Phone contacts
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  // Contact prefill state
  const [contactPrefill, setContactPrefill] = useState<{
    nom: string;
    prenom?: string;
    telephone: string;
    whatsapp?: string;
  } | null>(null);

  // Multi-phone selection state
  const [multiPhoneData, setMultiPhoneData] = useState<{
    contactName: string;
    prenom?: string;
    phones: string[];
    selectedPhone: string;
  } | null>(null);

  // Duplicate client detection state
  const [duplicateMatch, setDuplicateMatch] = useState<{
    phone: string;
    client: Client;
  } | null>(null);

  // Filtered clients list
  const filteredClients = clients.filter((c) => {
    const q = searchTerm.toLowerCase();
    const prenomMatch = c.prenom ? c.prenom.toLowerCase().includes(q) : false;
    return (
      c.nom.toLowerCase().includes(q) ||
      prenomMatch ||
      c.telephone.toLowerCase().includes(q) ||
      (c.whatsapp && c.whatsapp.toLowerCase().includes(q)) ||
      (c.ville && c.ville.toLowerCase().includes(q)) ||
      (c.quartier && c.quartier.toLowerCase().includes(q))
    );
  });

  // Option 1: Manual client creation
  const handleSelectManual = () => {
    setEditingClient(null);
    setContactPrefill(null);
    setIsFormOpen(true);
  };

  // Option 2: Import from phone contacts
  const handleSelectImportPhone = async () => {
    const supported = isContactPickerSupported();

    if (!supported) {
      // If not supported natively (e.g., Windows PC without Web Contacts API),
      // we still let them open the manual form or import via vCard
      showToast(
        "Accès direct au répertoire disponible sur smartphone Android. Ouverture du formulaire client.",
        'info'
      );
      setEditingClient(null);
      setContactPrefill(null);
      setIsFormOpen(true);
      return;
    }

    try {
      const res = await pickPhoneContact();

      if (res.cancelled) {
        // User cancelled picker dialog
        return;
      }

      if (!res.success || !res.contact) {
        if (res.error) {
          showToast(res.error, 'error');
        }
        return;
      }

      const contact = res.contact;

      // Check if contact has no phone
      if (contact.phones.length === 0 || !contact.selectedPhone) {
        showToast(
          "Ce contact ne possède aucun numéro de téléphone.",
          'info'
        );
        setEditingClient(null);
        setContactPrefill({
          nom: contact.nom,
          prenom: contact.prenom,
          telephone: '',
          whatsapp: '',
        });
        setIsFormOpen(true);
        return;
      }

      // If contact has multiple phone numbers, let user choose which one
      if (contact.phones.length > 1) {
        setMultiPhoneData({
          contactName: contact.nom,
          prenom: contact.prenom,
          phones: contact.phones,
          selectedPhone: contact.phones[0],
        });
        return;
      }

      // Single phone number: check duplicate
      processImportedContact(contact.nom, contact.prenom, contact.selectedPhone);
    } catch (err: any) {
      showToast("Erreur lors de l'accès aux contacts : " + err?.message, 'error');
    }
  };

  // Process selected contact and check duplicates
  const processImportedContact = (nom: string, prenom: string | undefined, phone: string) => {
    const duplicate = findDuplicateClient(phone, clients);
    if (duplicate) {
      setDuplicateMatch({
        phone,
        client: duplicate,
      });
      return;
    }

    // Open form with prefilled values
    setEditingClient(null);
    setContactPrefill({
      nom,
      prenom,
      telephone: phone,
      whatsapp: phone,
    });
    setIsFormOpen(true);
    showToast(`✓ Contact ${nom} ${prenom || ''} sélectionné`, 'success');
  };

  // vCard file import for desktop/PC
  const handleVCardImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const cards = parseVCardText(content);
        if (cards.length > 0) {
          const first = cards[0];
          if (first.phones.length > 1) {
            setMultiPhoneData({
              contactName: first.nom,
              prenom: first.prenom,
              phones: first.phones,
              selectedPhone: first.phones[0],
            });
          } else {
            processImportedContact(first.nom, first.prenom, first.selectedPhone || '');
          }
        } else {
          showToast("Aucun contact trouvé dans le fichier vCard", 'info');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setContactPrefill(null);
    setIsFormOpen(true);
  };

  const handleSave = (data: Omit<Client, 'id' | 'dateCreation'>) => {
    if (editingClient) {
      updateClient({
        ...editingClient,
        ...data,
      });
      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient({
          ...editingClient,
          ...data,
        });
      }
    } else {
      addClient(data);
    }
  };

  const cleanPhoneForWa = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Répertoire Clients ({clients.length})</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contacts, historique des devis, commandes et synchronisation Cloud V4
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Main "+ Ajouter un client" button opening the 2 options */}
          <button
            onClick={() => setIsChoiceModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ajouter un client</span>
          </button>

          {/* Quick Mobile Shortcut: 📱 Importer */}
          <button
            onClick={handleSelectImportPhone}
            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
            title="Importer directement depuis le carnet d'adresses du téléphone"
          >
            <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">📱 Contacts</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, prénom, téléphone, ville ou quartier..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#112238] border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#112238] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {searchTerm ? 'Aucun client ne correspond à votre recherche' : 'Aucun client enregistré'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Ajoutez vos premiers clients par saisie manuelle ou importez-les directement depuis vos contacts de téléphone.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsChoiceModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ajouter un client
            </button>
            <button
              onClick={handleSelectImportPhone}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              📱 Importer depuis mes contacts
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className="bg-white dark:bg-[#112238] rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center shrink-0">
                      {client.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {client.nom}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{client.ville || 'Lomé'}{client.quartier ? `, ${client.quartier}` : ''}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 mt-1" />
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span className="font-mono text-[11px]">{client.telephone}</span>
                  {client.notes && (
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px] italic">
                      {client.notes}
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Action buttons */}
              <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <a
                  href={`tel:${client.telephone}`}
                  className="flex-1 py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Phone className="w-3 h-3 text-emerald-500" />
                  Appel
                </a>
                <a
                  href={`https://wa.me/${cleanPhoneForWa(client.whatsapp || client.telephone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-500" />
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Choice Modal: Option 1 (Manual) vs Option 2 (Import Phone) */}
      <AddClientChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectManual={handleSelectManual}
        onSelectImportPhone={handleSelectImportPhone}
        onSelectVCardImport={handleVCardImport}
      />

      {/* Multi-phone Selection Modal */}
      {multiPhoneData && (
        <SelectPhoneModal
          isOpen={!!multiPhoneData}
          contactName={`${multiPhoneData.contactName} ${multiPhoneData.prenom || ''}`.trim()}
          phones={multiPhoneData.phones}
          selectedPhone={multiPhoneData.selectedPhone}
          onSelect={(ph) =>
            setMultiPhoneData((prev) => (prev ? { ...prev, selectedPhone: ph } : null))
          }
          onConfirm={() => {
            processImportedContact(
              multiPhoneData.contactName,
              multiPhoneData.prenom,
              multiPhoneData.selectedPhone
            );
            setMultiPhoneData(null);
          }}
          onClose={() => setMultiPhoneData(null)}
        />
      )}

      {/* Duplicate Client Detection Modal */}
      {duplicateMatch && (
        <DuplicateClientModal
          isOpen={!!duplicateMatch}
          phone={duplicateMatch.phone}
          existingClient={duplicateMatch.client}
          onViewClient={(client) => {
            setDuplicateMatch(null);
            setSelectedClient(client);
          }}
          onClose={() => setDuplicateMatch(null)}
        />
      )}

      {/* Client Detail Modal */}
      <ClientDetailModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onEdit={(c) => {
          setSelectedClient(null);
          handleEdit(c);
        }}
        onNewDevis={(c) => {
          setSelectedClient(null);
          onNewDevis(c);
        }}
        onSelectDevis={onSelectDevis}
        onSelectCommande={onSelectCommande}
      />

      {/* Client Add/Edit Modal */}
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setContactPrefill(null);
        }}
        onSave={handleSave}
        initialData={editingClient}
        initialContactPrefill={contactPrefill}
        onViewExistingClient={(c) => setSelectedClient(c)}
      />
    </div>
  );
};
