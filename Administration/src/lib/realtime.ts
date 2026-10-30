import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { SERVER_URL } from './config';
import { getTokens } from './api';

// Temps réel du back-office : le serveur prévient dès qu'un dossier capitaine change
// (inscription, pièce envoyée, décision d'un autre admin) → compteurs et listes rechargés
export function useAdminRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      // Jeton relu à chaque (re)connexion : il est renouvelé régulièrement
      auth: (cb) => cb({ token: getTokens()?.accessToken }),
    });

    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['overview'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['vehicle'] });
    };
    socket.on('admin:pending-changed', refresh);
    // Après une coupure, des changements ont pu être manqués
    socket.io.on('reconnect', refresh);

    return () => { socket.disconnect(); };
  }, [qc]);
}
