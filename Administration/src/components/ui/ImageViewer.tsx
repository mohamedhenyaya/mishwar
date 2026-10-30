import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscape } from './Modal';

// Image affichée en grand par-dessus la page (sans quitter l'onglet) ; Échap ou clic à côté pour fermer
export function ImageViewer({ src, title, actions, onClose }: {
  src: string | null; title: ReactNode; actions?: ReactNode; onClose: () => void;
}) {
  useEscape(!!src, onClose);
  if (!src) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-900/90 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center gap-3 px-4 py-3 text-white sm:px-6" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
        {actions}
        <button type="button" onClick={onClose} aria-label="Fermer"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-0">
        <img src={src} alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-pop" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>,
    document.body,
  );
}
