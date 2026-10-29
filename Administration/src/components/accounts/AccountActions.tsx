import { ReactNode, useEffect, useRef, useState } from 'react';
import { Ban, CheckCircle2, KeyRound, MoreHorizontal, Pencil, Trash2, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import {
  AccountKind, AccountRef, AdjustBalanceDialog, BlockDialog, DeleteAccountDialog, ResetPasswordDialog,
} from './AccountDialogs';

type Dialog = 'block' | 'password' | 'balance' | 'delete' | null;

export function Dropdown({ trigger, children }: { trigger: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 animate-pop-in rounded-xl border border-slate-200 bg-white p-1 shadow-pop dark:border-white/10 dark:bg-[#1B1B2B]">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger }: {
  icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className={clsx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition',
        danger ? 'text-danger hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5')}>
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      {children}
    </button>
  );
}

// Menu « ⋯ » d'un compte (ligne de liste ou en-tête de fiche) avec ses dialogues
export function AccountActions({ kind, account, onEdit, onDeleted, variant = 'menu', canDelete = true, canBlock = true }: {
  kind: AccountKind;
  account: AccountRef & { deletedAt?: string | null };
  onEdit?: () => void;
  onDeleted?: () => void;
  variant?: 'menu' | 'buttons';
  canDelete?: boolean;
  canBlock?: boolean;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  if (account.deletedAt) return null;

  const items = (closeMenu: () => void) => {
    const run = (d: Dialog | 'edit') => () => { closeMenu(); d === 'edit' ? onEdit?.() : setDialog(d); };
    return (
      <>
        {onEdit && <MenuItem icon={<Pencil />} onClick={run('edit')}>Modifier</MenuItem>}
        <MenuItem icon={<Wallet />} onClick={run('balance')}>Ajuster le solde</MenuItem>
        <MenuItem icon={<KeyRound />} onClick={run('password')}>Nouveau mot de passe</MenuItem>
        {canBlock && (account.isActive
          ? <MenuItem icon={<Ban />} onClick={run('block')} danger>Bloquer</MenuItem>
          : <MenuItem icon={<CheckCircle2 />} onClick={run('block')}>Débloquer</MenuItem>)}
        {canDelete && (
          <>
            <div className="my-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
            <MenuItem icon={<Trash2 />} onClick={run('delete')} danger>Supprimer le compte</MenuItem>
          </>
        )}
      </>
    );
  };

  return (
    <>
      {variant === 'menu' ? (
        <Dropdown trigger={<Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button>}>
          {items}
        </Dropdown>
      ) : (
        <div className="flex flex-wrap gap-2">
          {onEdit && <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={onEdit}>Modifier</Button>}
          <Button variant="outline" icon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('balance')}>Solde</Button>
          {canBlock && (account.isActive
            ? <Button variant="outline" className="!text-danger" icon={<Ban className="h-4 w-4" />} onClick={() => setDialog('block')}>Bloquer</Button>
            : <Button variant="success" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDialog('block')}>Débloquer</Button>)}
          <Dropdown trigger={<Button variant="outline" size="icon" aria-label="Plus d'actions"><MoreHorizontal className="h-4 w-4" /></Button>}>
            {(closeMenu) => (
              <>
                <MenuItem icon={<KeyRound />} onClick={() => { closeMenu(); setDialog('password'); }}>Nouveau mot de passe</MenuItem>
                {canDelete && <MenuItem icon={<Trash2 />} onClick={() => { closeMenu(); setDialog('delete'); }} danger>Supprimer le compte</MenuItem>}
              </>
            )}
          </Dropdown>
        </div>
      )}

      <BlockDialog kind={kind} account={account} open={dialog === 'block'} onClose={close} />
      <ResetPasswordDialog kind={kind} account={account} open={dialog === 'password'} onClose={close} />
      <AdjustBalanceDialog kind={kind} account={account} open={dialog === 'balance'} onClose={close} />
      <DeleteAccountDialog kind={kind} account={account} open={dialog === 'delete'} onClose={close} onDeleted={onDeleted} />
    </>
  );
}
