import { DEFAULT_COUNTRY_CODE } from '@/lib/config';
import { Select } from './Field';

// Indicatifs proposés — la Mauritanie en premier (marché principal de Mishwar)
const COUNTRY_CODES = [
  { code: '+222', label: '🇲🇷 +222' },
  { code: '+221', label: '🇸🇳 +221' },
  { code: '+212', label: '🇲🇦 +212' },
  { code: '+213', label: '🇩🇿 +213' },
  { code: '+216', label: '🇹🇳 +216' },
  { code: '+223', label: '🇲🇱 +223' },
  { code: '+33', label: '🇫🇷 +33' },
];

export function PhoneInput({ countryCode, onCountryCodeChange, value, onChange, autoFocus, id }: {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  id?: string;
}) {
  return (
    <div className="flex gap-2">
      <Select value={countryCode} onChange={(e) => onCountryCodeChange(e.target.value)} className="w-[112px] shrink-0" aria-label="Indicatif">
        {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
      </Select>
      <input
        id={id}
        className="input"
        inputMode="tel"
        autoComplete="tel"
        placeholder="22 12 34 56"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export { DEFAULT_COUNTRY_CODE };
