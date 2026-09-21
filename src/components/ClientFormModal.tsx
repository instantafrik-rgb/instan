import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, MapPin, Mail, FileText, Check, Smartphone, AlertTriangle, Upload } from 'lucide-react';
import { Client } from '../types';
import { useApp } from '../context/AppContext';
import {
  isContactPickerSupported,
  pickPhoneContact,
  findDuplicateClient,
  parseContactName,
  parseVCardText,
} from '../utils/contactPicker';
import { SelectPhoneModal } from './SelectPhoneModal';
import { DuplicateClientModal } from './DuplicateClientModal';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'dateCreation'>) => void;
  initialData?: Client | null;
  initialContactPrefill?: {
    nom: string;
    prenom?: string;
    telephone: string;
    whatsapp?: string;
  } | null;
  onViewExistingClient?: (client: Client) => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialContactPrefill,
  onViewExistingClient,
}) => {
  const { clients, showToast } = useApp();

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [ville, setVille] = useState('Lomé');
  const [quartier, setQuartier] = useState('');
  const [adresse, setAdresse] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

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

  // Fallback vCard file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      // If editing existing client
      if (initialData.prenom) {
        setNom(initialData.nom);
        setPrenom(initialData.prenom);
      } else {
        const parsed = parseContactName(initialData.nom);
        setNom(parsed.nom);
        setPrenom(parsed.prenom);
      }
      setTelephone(initialData.telephone);
      setWhatsapp(initialData.whatsapp || initialData.telephone);
      setVille(initialData.ville || 'Lomé');
      setQuartier(initialData.quartier || '');
      setAdresse(initialData.adresse || '');
      setEmail(initialData.email || '');
      setNotes(initialData.notes || '');
    } else if (initialContactPrefill) {
      // Prefilled from contact picker
      setNom(initialContactPrefill.nom);
      setPrenom(initialContactPrefill.prenom || '');
      setTelephone(initialContactPrefill.telephone);
      setWhatsapp(initialContactPrefill.whatsapp || initialContactPrefill.telephone);
      setVille('Lomé');
      setQuartier('');
      setAdresse('');
      setEmail('');
      setNotes('');
    } else {
      // Fresh new client
      setNom('');
      setPrenom('');
      setTelephone('');
      setWhatsapp('');
      setVille('Lomé');
      setQuartier('');
      setAdresse('');
      setEmail('');
      setNotes('');
    }
    setError('');
    setDuplicateMatch(null);
  }, [initialData, initialContactPrefill, isOpen]);

  if (!isOpen) return null;

  // Handle importing directly from the phone within the modal
  const handleImportFromPhone = async () => {
    setError('');
    const supported = isContactPickerSupported();

    if (!supported) {
      // Prompt user or offer vCard import on Windows/desktop
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        setError("L'import direct des contacts est disponible sur votre smartphone Android (Google Chrome / PWA). Sur PC, vous pouvez importer un fichier .vcf.");
      }
      return;
    }

    try {
      const res = await pickPhoneContact();

      if (res.cancelled) {
        // User cancelled picker - do nothing, keep existing data intact
        return;
      }

      if (!res.success || !res.contact) {
        if (res.error) {
          setError(res.error);
        }
        return;
      }

      const contact = res.contact;

      // Check if contact has no phone
      if (contact.phones.length === 0 || !contact.selectedPhone) {
        setNom(contact.nom);
        setPrenom(contact.prenom || '');
        setError("Ce contact ne possède aucun numéro de téléphone.");
        showToast("Ce contact ne possède aucun numéro de téléphone.", 'info');
        return;
      }

      // If contact has multiple phone numbers, prompt user to select one
      if (contact.phones.length > 1) {
        setMultiPhoneData({
          contactName: contact.nom,
          prenom: contact.prenom,
          phones: contact.phones,
          selectedPhone: contact.phones[0],
        });
        return;
      }

      // Single phone number
      applyImportedContact(contact.nom, contact.prenom || '', contact.selectedPhone);
    } catch (err: any) {
      setError("Impossible d'accéder aux contacts : " + (err.message || 'Erreur'));
    }
  };

  const applyImportedContact = (importedNom: string, importedPrenom: string, importedPhone: string) => {
    // Check for duplicate phone
    const duplicate = findDuplicateClient(importedPhone, clients, initialData?.id);
    if (duplicate) {
      setDuplicateMatch({
        phone: importedPhone,
        client: duplicate,
      });
      // Do not overwrite completely, keep values so user can inspect or change
      setNom(importedNom);
      setPrenom(importedPrenom);
      setTelephone(importedPhone);
      setWhatsapp(importedPhone);
      return;
    }

    setNom(importedNom);
    setPrenom(importedPrenom);
    setTelephone(importedPhone);
    if (!whatsapp || whatsapp === telephone) {
      setWhatsapp(importedPhone);
    }
    showToast(`✓ Contact ${importedNom} ${importedPrenom} importé`, 'success');
  };

  // vCard file import fallback (for Windows / PC testing)
  const handleVcfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
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
            applyImportedContact(first.nom, first.prenom || '', first.selectedPhone || '');
          }
        } else {
          setError("Aucun contact valide trouvé dans ce fichier .vcf");
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nom.trim()) {
      setError('Le nom du client est obligatoire');
      return;
    }
    if (!telephone.trim()) {
      setError('Le numéro de téléphone est obligatoire');
      return;
    }

    // Check duplicate phone before saving
    const duplicate = findDuplicateClient(telephone.trim(), clients, initialData?.id);
    if (duplicate) {
      setDuplicateMatch({
        phone: telephone.trim(),
        client: duplicate,
      });
      return;
    }

    // Build formatted full name: e.g. "KOFFI Jean"
    const trimmedNom = nom.trim();
    const trimmedPrenom = prenom.trim();
    const formattedNom = trimmedPrenom ? `${trimmedNom} ${trimmedPrenom}` : trimmedNom;

    onSave({
      nom: formattedNom,
      prenom: trimmedPrenom || undefined,
      telephone: telephone.trim(),
      whatsapp: (whatsapp || telephone).trim(),
      ville: ville.trim() || 'Lomé',
      quartier: quartier.trim(),
      adresse: adresse.trim(),
      email: email.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-white dark:bg-[#112238] rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">
                {initialData ? 'Modifier le client' : 'Nouveau client'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contact Import Quick Bar */}
          {!initialData && (
            <div className="px-5 pt-3 pb-1">
              <button
                type="button"
                onClick={handleImportFromPhone}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>📱 IMPORTER DEPUIS MES CONTACTS</span>
              </button>

              {/* Hidden file input for vCard on PC */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,text/vcard"
                className="hidden"
                onChange={handleVcfUpload}
              />
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            {error && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Nom and Prénom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de famille *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="ex: KOFFI"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prénom (si disponible)
                </label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="ex: Jean"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Téléphone and WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Téléphone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+228 90 00 00 00"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+228 90 00 00 00"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Ville and Quartier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  placeholder="Lomé"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quartier
                </label>
                <input
                  type="text"
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  placeholder="Tokoin, Adidogomé..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adresse physique (facultatif)
              </label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Rue, repère, numéro de porte..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email (facultatif)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@domaine.com"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes (facultatif)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Activité, préférences, type de produits commandés..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {initialData ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Multi-phone modal */}
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
            applyImportedContact(
              multiPhoneData.contactName,
              multiPhoneData.prenom || '',
              multiPhoneData.selectedPhone
            );
            setMultiPhoneData(null);
          }}
          onClose={() => setMultiPhoneData(null)}
        />
      )}

      {/* Duplicate Client modal */}
      {duplicateMatch && (
        <DuplicateClientModal
          isOpen={!!duplicateMatch}
          phone={duplicateMatch.phone}
          existingClient={duplicateMatch.client}
          onViewClient={(client) => {
            setDuplicateMatch(null);
            onClose();
            if (onViewExistingClient) {
              onViewExistingClient(client);
            }
          }}
          onClose={() => setDuplicateMatch(null)}
        />
      )}
    </>
  );
};
