
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from "../context/UserContext";
import { API_BASE_URL } from "../config/api";

export default function EnterCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const userId = localStorage.getItem('for2FaUserId');
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const response = await fetch(`${API_BASE_URL}/check2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, userId }),
      });

      const data = await response.json();

      if (response.ok) {
        user(userData, data.token);
        //localStorage.setItem('token', data.token);
        navigate('/');
      } else {
        setError(data.error || 'Code invalide');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '300px', margin: 'auto' }}>
      <h2>Entrez le code reçu par mail:</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Votre code"
          style={{
            width: '100%',
            height: '40px',
            fontSize: '16px',
            padding: '8px',
            boxSizing: 'border-box',
            borderRadius: '4px',
            border: '1px solid #ccc',
          }}
        />
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        <button
          type="submit"
          style={{
            marginTop: '10px',
            width: '100%',
            padding: '10px',
            backgroundColor: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          Vérifier le code
        </button>
      </form>
    </div>
  );
}