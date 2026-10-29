import {
  BadgePercent, Bell, Car, CarFront, LayoutDashboard, LifeBuoy, Map, ScrollText, Settings, ShieldCheck, Star,
  Users, Wallet, Route,
} from 'lucide-react';
import type { Overview } from '@/lib/types';

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Users;
  badge?: (o: Overview) => number;
}

export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Pilotage',
    items: [
      { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
      { to: '/carte', label: 'Carte en direct', icon: Map },
      { to: '/courses', label: 'Courses', icon: Route },
    ],
  },
  {
    section: 'Comptes',
    items: [
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/capitaines', label: 'Capitaines', icon: CarFront },
      { to: '/vehicules', label: 'Véhicules', icon: Car, badge: (o) => o.pending.vehicles },
      { to: '/administrateurs', label: 'Administrateurs', icon: ShieldCheck },
    ],
  },
  {
    section: 'Finance & relation',
    items: [
      { to: '/portefeuille', label: 'Portefeuilles', icon: Wallet, badge: (o) => o.pending.walletRequests },
      { to: '/support', label: 'Support', icon: LifeBuoy, badge: (o) => o.pending.tickets },
      { to: '/avis', label: 'Avis', icon: Star },
      { to: '/coupons', label: 'Coupons', icon: BadgePercent },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    section: 'Système',
    items: [
      { to: '/parametres', label: 'Tarifs & commission', icon: Settings },
      { to: '/journal', label: 'Journal d\'audit', icon: ScrollText },
    ],
  },
];
