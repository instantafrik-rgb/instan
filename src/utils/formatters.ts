export function formatCurrency(amount: number, currency: string = 'FCFA'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0 ${currency}`;
  }
  return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
}

/**
 * Formatage strict des montants pour les documents PDF officiels (Section 27 & 28)
 * Utilise impérativement un espace standard ' ' comme séparateur de milliers et JAMAIS de slash '/' ou de point '.'.
 * Exemples :
 * 5000 -> "5 000 FCFA"
 * 170000 -> "170 000 FCFA"
 * 10000000 -> "10 000 000 FCFA"
 */
export function formatPdfCurrency(amount: number, currency: string = 'FCFA'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currency ? `0 ${currency}`.trim() : '0';
  }
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return currency ? `${formatted} ${currency}`.trim() : formatted;
}

export function formatDate(isoOrDateString: string): string {
  if (!isoOrDateString) return '';
  try {
    const d = new Date(isoOrDateString);
    if (isNaN(d.getTime())) return isoOrDateString;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoOrDateString;
  }
}

export function formatDateTime(isoOrDateString: string): string {
  if (!isoOrDateString) return '';
  try {
    const d = new Date(isoOrDateString);
    if (isNaN(d.getTime())) return isoOrDateString;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoOrDateString;
  }
}

export function generateNextNumber(prefix: string, existingNumbers: string[]): string {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${prefix}-${currentYear}-`;
  
  const sequenceNumbers = existingNumbers
    .filter((num) => num && num.startsWith(yearPrefix))
    .map((num) => {
      const parts = num.split('-');
      const seqStr = parts[parts.length - 1];
      const parsed = parseInt(seqStr, 10);
      return isNaN(parsed) ? 0 : parsed;
    });

  const nextSeq = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) + 1 : 1;
  const padded = nextSeq.toString().padStart(4, '0');
  return `${yearPrefix}${padded}`;
}
