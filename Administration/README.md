# Mishwar — Administration

Back-office web (React + Vite + Tailwind) pour piloter la plateforme : clients, capitaines, administrateurs, courses, portefeuilles, véhicules, support, avis, coupons, notifications, tarifs et journal d'audit.

## Démarrage

```bash
cd Administration
npm install
cp .env.example .env.local   # VITE_API_URL=http://localhost:3000 (ou l'URL Railway)
npm run dev                  # http://localhost:5173
```

Le serveur `ServerApp` doit tourner. Production : `npm run build` puis servir `dist/` (site statique, avec redirection de toutes les routes vers `index.html`).

## Premier administrateur

Tant qu'aucun admin n'existe, créez-le une seule fois (ADMIN_BOOTSTRAP_SECRET défini dans `ServerApp/.env`) :

```bash
curl -X POST http://localhost:3000/api/v1/auth/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"secret":"<ADMIN_BOOTSTRAP_SECRET>","phone":"+222XXXXXXXX","name":"Admin","password":"<mot de passe>"}'
```

Les administrateurs suivants se créent depuis la page **Administrateurs**.

## Règles appliquées côté serveur

- **Suppression** = anonymisation (nom, téléphone, photo effacés, compte désactivé) : l'historique des courses et transactions reste cohérent et le numéro est libéré. Refusée pendant une course en cours.
- **Blocage** : ferme toutes les sessions ; un admin bloqué perd l'accès immédiatement. Impossible de se bloquer/supprimer soi-même ou de retirer le dernier admin actif. Un capitaine en course ne peut pas être bloqué : annulez d'abord la course.
- **Soldes** : chaque ajustement exige un motif et est tracé (transactions + journal d'audit). Une demande de recharge ne peut pas être approuvée deux fois, même par deux admins simultanément.
- **Annulation d'une course** par un admin : client et capitaine sont notifiés en temps réel, le capitaine redevient disponible.
