export interface PaymentAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  description?: string;
}

export const STATIC_ACCOUNTS_PRESETS: Record<'sales_rep' | 'sales_agent', PaymentAccount[]> = {
  sales_rep: [
    {
      id: '1787213714490',
      bankName: 'Moniepoint',
      accountName: 'Green Collar Integrated Services',
      accountNumber: '5404983419',
      description: 'Moniepoint (...419)'
    },
    {
      id: '1788343790271',
      bankName: 'First Monie',
      accountName: 'Green Collar Agro ltd',
      accountNumber: '8670004795',
      description: 'First Monie'
    }
  ],
  sales_agent: [
    {
      id: '1787213880786',
      bankName: 'Moniepoint',
      accountName: 'Green Collar Integrated Services',
      accountNumber: '5112197517',
      description: 'Moniepoint (...517)'
    },
    {
      id: '1788343603526',
      bankName: 'Stanbic IBTC Bank',
      accountName: 'Green Collar Integrated Service ltd',
      accountNumber: '0081836674',
      description: 'Stanbic IBTC'
    }
  ]
};

/**
 * Returns the exact static payment accounts for the given user role.
 * For Sales Rep: Moniepoint ending in 419 and First Monie.
 * For Sales Agent: Moniepoint ending in 517 and Stanbic IBTC.
 */
export function getStaticAccountsForRole(
  role?: string,
  companyAccounts?: PaymentAccount[]
): PaymentAccount[] {
  const isRep = role === 'sales_rep';
  const isAgent = role === 'sales_agent' || role === 'sales';

  if (companyAccounts && companyAccounts.length > 0) {
    if (isRep) {
      const moniepoint419 = companyAccounts.find(acc => {
        const num = String(acc.accountNumber || '').trim();
        const bank = String(acc.bankName || '').toLowerCase();
        return (bank.includes('moniepoint') || bank.includes('monie')) && num.endsWith('419');
      });
      const firstMonie = companyAccounts.find(acc => {
        const bank = String(acc.bankName || '').toLowerCase();
        return bank.includes('first monie') || bank.includes('firstmonie');
      });

      const matched: PaymentAccount[] = [];
      if (moniepoint419) matched.push(moniepoint419);
      else matched.push(STATIC_ACCOUNTS_PRESETS.sales_rep[0]);

      if (firstMonie) matched.push(firstMonie);
      else matched.push(STATIC_ACCOUNTS_PRESETS.sales_rep[1]);

      return matched;
    }

    if (isAgent) {
      const moniepoint517 = companyAccounts.find(acc => {
        const num = String(acc.accountNumber || '').trim();
        const bank = String(acc.bankName || '').toLowerCase();
        return (bank.includes('moniepoint') || bank.includes('monie')) && num.endsWith('517');
      });
      const stanbic = companyAccounts.find(acc => {
        const bank = String(acc.bankName || '').toLowerCase();
        return bank.includes('stanbic') || bank.includes('stabic');
      });

      const matched: PaymentAccount[] = [];
      if (moniepoint517) matched.push(moniepoint517);
      else matched.push(STATIC_ACCOUNTS_PRESETS.sales_agent[0]);

      if (stanbic) matched.push(stanbic);
      else matched.push(STATIC_ACCOUNTS_PRESETS.sales_agent[1]);

      return matched;
    }
  }

  // Predefined defaults if company accounts aren't loaded or configured yet
  if (isRep) return STATIC_ACCOUNTS_PRESETS.sales_rep;
  if (isAgent) return STATIC_ACCOUNTS_PRESETS.sales_agent;
  
  // For admin or other roles with companyAccounts
  return companyAccounts && companyAccounts.length > 0
    ? companyAccounts
    : [...STATIC_ACCOUNTS_PRESETS.sales_rep, ...STATIC_ACCOUNTS_PRESETS.sales_agent];
}
