import { ReactNode, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Field, Textarea } from './Field';

// Confirmation générique, avec motif optionnel ou obligatoire
export function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = 'Confirmer', tone = 'danger',
  loading, reason, children, confirmDisabled,
}: {
  confirmDisabled?: boolean;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary' | 'success';
  loading?: boolean;
  reason?: { label: string; required?: boolean; placeholder?: string; suggestions?: string[] };
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  const close = () => { setText(''); onClose(); };
  const blocked = confirmDisabled || (!!reason?.required && !text.trim());

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      size="sm"
      icon={tone === 'danger' ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger dark:bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
        </div>
      ) : undefined}
      footer={
        <>
          <Button variant="outline" onClick={close}>Annuler</Button>
          <Button variant={tone} loading={loading} disabled={blocked} onClick={() => onConfirm(text.trim())}>{confirmLabel}</Button>
        </>
      }
    >
      {children}
      {reason && (
        <Field label={reason.label + (reason.required ? '' : ' (facultatif)')}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} rows={3} />
          {reason.suggestions && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reason.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setText(s)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-accent-400 hover:text-accent-600 dark:border-white/10 dark:text-slate-300">
                  {s}
                </button>
              ))}
            </div>
          )}
        </Field>
      )}
    </Modal>
  );
}
