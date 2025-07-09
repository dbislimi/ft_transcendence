import { useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';

export default function Reglages() {
  const [enable2fa, setEnable2fa] = useState(false);
  const [message, setMessage] = useState('');

  const update2fa = async () => {
    try {
      const response = await fetch('http://localhost:3000/reglages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // important pour envoyer les cookies
        body: JSON.stringify({ enable2fa: !enable2fa }),
      });

      const data = await response.json();

      if (response.ok) {
        setEnable2fa(data.twoFAEnabled);
        setMessage('Mise à jour réussie');
      } else {
        setMessage(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      setMessage('Erreur de connexion au serveur');
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Réglages</h1>

      <label>
        <input
          type="checkbox"
          checked={enable2fa}
          onChange={update2fa}
        />
        Activer la double authentification (2FA)
      </label>

      <p>{message}</p>
    </div>
  );
}