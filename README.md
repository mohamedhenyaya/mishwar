# Mishwar

## Lancer les applications

La première fois : `npm install` dans chaque dossier.

| Application    | Commande                                             |
| -------------- | ---------------------------------------------------- |
| ServerApp      | `docker compose up -d` puis `npm run start:dev`      |
| ClientApp      | `npx expo start -c`                                  |
| CapitainApp    | `npx expo start -c`                                  |
| Administration | `npm run dev` → http://localhost:5173                |

ServerApp ne sert qu'en mode **local**.

## Changer de serveur

Ouvrez ces 3 fichiers :

- `ClientApp/.env.local`
- `CapitainApp/.env.local`
- `Administration/.env.local`

Dans chacun, il y a une ligne avec l'adresse Railway :

```env
EXPO_PUBLIC_API_URL=https://mishwar-api.up.railway.app
```

(dans `Administration`, la ligne commence par `VITE_API_URL=`)

- **Prod (Railway)** : la ligne est active, comme ci-dessus.
- **Local** : ajoutez `#` au début de la ligne :

  ```env
  # EXPO_PUBLIC_API_URL=https://mishwar-api.up.railway.app
  ```

  et lancez ServerApp.

Ensuite, arrêtez (Ctrl+C) et relancez les applications.
