export interface ProofItem {
  url: string;
  id?: string;
  name: string;
  note?: string;
  uploadedAt?: string;
}

export const MAX_PAYMENT_PROOFS = 3;

/**
 * Parses invoice proof fields into a normalized array of ProofItem objects.
 * Supports both legacy single proof strings and JSON arrays of up to 3 proofs.
 */
export function parseInvoiceProofs(
  invoice: {
    proofOfPayment?: any;
    proof_of_payment?: any;
    proofOfPaymentId?: string;
    proof_of_payment_id?: string;
    proofOfPaymentName?: string;
    proof_of_payment_name?: string;
    proofNote?: string;
    proof_note?: string;
  } | null | undefined
): ProofItem[] {
  if (!invoice) return [];
  const raw = invoice.proofOfPayment ?? invoice.proof_of_payment;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter((p) => p && typeof p.url === 'string' && p.url.trim().length > 0).slice(0, MAX_PAYMENT_PROOFS);
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((p) => p && typeof p.url === 'string' && p.url.trim().length > 0)
            .slice(0, MAX_PAYMENT_PROOFS);
        }
      } catch {
        // Fallback to treating as single string if JSON parse fails
      }
    }
    return [
      {
        url: trimmed,
        id: invoice.proofOfPaymentId || invoice.proof_of_payment_id || '',
        name: invoice.proofOfPaymentName || invoice.proof_of_payment_name || 'Proof Document',
        note: invoice.proofNote || invoice.proof_note || ''
      }
    ];
  }

  return [];
}

/**
 * Serializes ProofItem[] back into Supabase `invoices` columns (`proof_of_payment`, `proof_of_payment_id`, `proof_of_payment_name`)
 * and camelCase UI fields.
 */
export function serializeInvoiceProofs(proofs: ProofItem[]) {
  const valid = proofs
    .filter((p) => p && typeof p.url === 'string' && p.url.trim().length > 0)
    .slice(0, MAX_PAYMENT_PROOFS);

  if (valid.length === 0) {
    return {
      db: {
        proof_of_payment: '',
        proof_of_payment_id: '',
        proof_of_payment_name: ''
      },
      ui: {
        proofOfPayment: '',
        proofOfPaymentId: '',
        proofOfPaymentName: ''
      }
    };
  }

  if (valid.length === 1) {
    const first = valid[0];
    return {
      db: {
        proof_of_payment: first.url,
        proof_of_payment_id: first.id || '',
        proof_of_payment_name: first.name || 'Proof Document'
      },
      ui: {
        proofOfPayment: first.url,
        proofOfPaymentId: first.id || '',
        proofOfPaymentName: first.name || 'Proof Document'
      }
    };
  }

  // Multiple proofs (2 or 3): serialize as JSON string in proof_of_payment
  const jsonStr = JSON.stringify(valid);
  const joinedIds = valid.map((p) => p.id || '').join(',');
  const joinedNames = valid.map((p) => p.name || 'Proof Document').join(' | ');

  return {
    db: {
      proof_of_payment: jsonStr,
      proof_of_payment_id: joinedIds,
      proof_of_payment_name: joinedNames
    },
    ui: {
      proofOfPayment: jsonStr,
      proofOfPaymentId: joinedIds,
      proofOfPaymentName: joinedNames
    }
  };
}
