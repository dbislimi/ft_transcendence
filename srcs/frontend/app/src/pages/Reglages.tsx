import { useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { API_BASE_URL } from "../config/api";

export default function Reglages() {
  const [enable2fa, setEnable2fa] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/reglages`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setEnable2fa(data.twoFAEnabled);
        } else {
          setMessage(data.error || 'Erreur lors du chargement des reglages');
        }
      } catch (error) {
        setMessage('Erreur de connexion au serveur');
      }
    };

    if (token) {
      fetchSettings();
    }
  }, [token]);

  const update2fa = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reglages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enable2fa: !enable2fa }),
      });

      const data = await response.json();

      if (response.ok) {
        setEnable2fa(data.twoFAEnabled);
        setMessage('Mise à jour reussie');
      } else {
        setMessage(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      setMessage('Erreur de connexion au serveur');
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Reglages</h1>

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