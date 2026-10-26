// Moyens de recharge du compte capitaine.
// ⚠️ Remplacer les numéros ci-dessous par les vrais numéros de compte (8 chiffres)
//    et le numéro WhatsApp qui reçoit les captures d'écran.

export type PaymentMethodId = 'bankily' | 'sedad' | 'masrvi' | 'autres';

export interface PaymentMethod {
  id:            PaymentMethodId;
  name:          string;
  accountNumber: string | null; // null : pas de compte (contact WhatsApp uniquement)
}

// Numéro WhatsApp au format international, sans « + » ni espaces (222 = Mauritanie)
export const RECHARGE_WHATSAPP = '22220122724';

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bankily', name: 'Bankily', accountNumber: '201222724' },
  { id: 'sedad',   name: 'Sedad',   accountNumber: '20122724' },
  { id: 'masrvi',  name: 'Masrvi',  accountNumber: '20122724' },
  { id: 'autres',  name: 'Autres',  accountNumber: '20122724' },
];

// 12345678 → « 1234 5678 », +22212345678 → « +222 12 34 56 78 »
export const formatAccountNumber = (n: string) => n.replace(/(\d{4})(?=\d)/g, '$1 ');
export const formatWhatsapp = (n: string) =>
  `+${n.slice(0, 3)} ${n.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
