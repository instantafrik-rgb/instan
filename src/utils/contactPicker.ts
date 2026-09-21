import { Capacitor, registerPlugin } from '@capacitor/core';
import { Client } from '../types';

export interface ContactInfo {
  nom: string;
  prenom?: string;
  fullName: string;
  phones: string[];
  selectedPhone: string;
  email?: string;
}

export interface PickContactResult {
  success: boolean;
  contact?: ContactInfo;
  error?: string;
  cancelled?: boolean;
}

export interface NativeContactResponse {
  success?: boolean;
  cancelled?: boolean;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  selectedPhone?: string;
  phones?: string[];
}

export interface ContactPickerPluginInterface {
  pickContact(): Promise<NativeContactResponse>;
}

// Native Android Capacitor Plugin
const NativeContactPicker = registerPlugin<ContactPickerPluginInterface>('ContactPickerPlugin');

/**
 * Checks if a Contact Picker is available (either native Android via Capacitor or Chrome Android Web Contact Picker)
 */
export const isContactPickerSupported = (): boolean => {
  if (typeof window !== 'undefined') {
    // 1. In native Android environment (Capacitor / BridgeActivity)
    if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
      return true;
    }
    // 2. In browser environment (Google Chrome Android)
    if (
      'contacts' in navigator &&
      'ContactsManager' in window &&
      typeof (navigator as any).contacts?.select === 'function'
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Normalizes phone numbers to digits only for accurate matching
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

/**
 * Compares two phone numbers, accounting for international Togo prefixes (+228, 00228, or local 8 digits)
 */
export const arePhonesEqual = (phone1: string, phone2: string): boolean => {
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // For Togo phone numbers, standard mobile length is 8 digits (e.g., 90123456 or 70123456)
  // With international prefix 228 (11 digits): 22890123456
  const last8_1 = n1.length >= 8 ? n1.slice(-8) : n1;
  const last8_2 = n2.length >= 8 ? n2.slice(-8) : n2;

  return last8_1 === last8_2 && last8_1.length >= 8;
};

/**
 * Checks whether a client already exists with this phone number
 */
export const findDuplicateClient = (
  phone: string,
  clients: Client[],
  excludeClientId?: string
): Client | undefined => {
  if (!phone || !phone.trim()) return undefined;

  return clients.find((c) => {
    if (excludeClientId && c.id === excludeClientId) return false;
    if (arePhonesEqual(c.telephone, phone)) return true;
    if (c.whatsapp && arePhonesEqual(c.whatsapp, phone)) return true;
    return false;
  });
};

/**
 * Splits a full name string into Nom (family name) and Prénom (given name)
 * In Togo / West Africa, supports both "KOFFI Jean" and "Jean KOFFI"
 */
export const parseContactName = (rawName: string): { nom: string; prenom: string } => {
  const trimmed = rawName ? rawName.trim() : '';
  if (!trimmed) {
    return { nom: 'Nouveau Client', prenom: '' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { nom: parts[0], prenom: '' };
  }

  // Detect ALL UPPERCASE word as family name (e.g. "Jean KOFFI" -> nom: KOFFI, prenom: Jean)
  const uppercaseIndex = parts.findIndex(
    (p) => p.length > 1 && p === p.toUpperCase() && !/^\d+$/.test(p)
  );
  if (uppercaseIndex !== -1) {
    const nom = parts[uppercaseIndex];
    const remaining = parts.filter((_, idx) => idx !== uppercaseIndex);
    return { nom, prenom: remaining.join(' ') };
  }

  // Default: first part is Nom, remaining parts are Prénom
  const nom = parts[0];
  const prenom = parts.slice(1).join(' ');

  return { nom, prenom };
};

/**
 * Opens the native Android Contact Picker to select a single contact
 */
export const pickPhoneContact = async (): Promise<PickContactResult> => {
  // 1. Si nous sommes sur l'application native Android (Capacitor)
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android') {
    try {
      const res = await NativeContactPicker.pickContact();

      if (res.cancelled) {
        return { success: false, cancelled: true };
      }

      const displayName = (res.displayName || '').trim();
      let familyName = (res.familyName || '').trim();
      let givenName = (res.givenName || '').trim();

      // Si le ContentProvider n'a pas fourni de nom découpé, analyser le nom d'affichage
      if (!familyName && !givenName) {
        const parsed = parseContactName(displayName);
        familyName = parsed.nom;
        givenName = parsed.prenom;
      } else if (!familyName && givenName) {
        familyName = givenName;
        givenName = '';
      }

      const phones = (res.phones || [])
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const selectedPhone = (res.selectedPhone || phones[0] || '').trim();

      return {
        success: true,
        contact: {
          nom: familyName || 'Nouveau Client',
          prenom: givenName,
          fullName: displayName || `${familyName} ${givenName}`.trim(),
          phones,
          selectedPhone,
        },
      };
    } catch (err: any) {
      const msg = err?.message || String(err || '');
      if (
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('annul')
      ) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error:
          msg ||
          "Impossible d’ouvrir vos contacts. Vérifiez les autorisations de l’application puis réessayez.",
      };
    }
  }

  // 2. Si nous sommes dans un navigateur Web (Google Chrome sur Android avec Web Contact Picker API)
  if (!isContactPickerSupported()) {
    return {
      success: false,
      error:
        "Le sélecteur natif de contacts n'est pas disponible sur cet appareil. Veuillez saisir le client manuellement.",
    };
  }

  try {
    const props = ['name', 'tel'];
    const opts = { multiple: false };

    // Requête et sélection du contact
    const contacts = await (navigator as any).contacts.select(props, opts);

    if (!contacts || contacts.length === 0) {
      return { success: false, cancelled: true };
    }

    const contact = contacts[0];
    const rawName = (contact.name && contact.name[0]) ? String(contact.name[0]).trim() : '';
    const { nom, prenom } = parseContactName(rawName);

    const rawPhones: string[] = Array.isArray(contact.tel)
      ? contact.tel
          .map((p: any) => String(p).trim())
          .filter((p: string) => p.length > 0)
      : [];

    return {
      success: true,
      contact: {
        nom: nom || 'Nouveau Client',
        prenom,
        fullName: rawName || `${nom} ${prenom}`.trim(),
        phones: rawPhones,
        selectedPhone: rawPhones[0] || '',
      },
    };
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'SecurityError') {
      return { success: false, cancelled: true };
    }
    if (err.name === 'NotAllowedError') {
      return {
        success: false,
        error: "L’accès aux contacts est nécessaire pour importer ce client.",
      };
    }
    return {
      success: false,
      error:
        err.message ||
        "Impossible d’ouvrir vos contacts. Vérifiez les autorisations de l’application puis réessayez.",
    };
  }
};

/**
 * Helper to parse a vCard (.vcf) file string for Windows/desktop compatibility
 */
export const parseVCardText = (vcardText: string): ContactInfo[] => {
  const cards: ContactInfo[] = [];
  const entries = vcardText.split(/BEGIN:VCARD/i);

  for (const entry of entries) {
    if (!entry.trim()) continue;

    let fullName = '';
    const phones: string[] = [];
    const lines = entry.split(/\r\n|\r|\n/);

    for (const line of lines) {
      if (line.toUpperCase().startsWith('FN:')) {
        fullName = line.slice(3).trim();
      } else if (line.toUpperCase().includes('TEL')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const num = line.slice(colonIdx + 1).trim();
          if (num && !phones.includes(num)) {
            phones.push(num);
          }
        }
      }
    }

    if (fullName || phones.length > 0) {
      const { nom, prenom } = parseContactName(fullName || 'Contact vCard');
      cards.push({
        nom,
        prenom,
        fullName: fullName || `${nom} ${prenom}`.trim(),
        phones,
        selectedPhone: phones[0] || '',
      });
    }
  }

  return cards;
};
