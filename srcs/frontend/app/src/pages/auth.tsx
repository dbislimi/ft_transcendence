import { useState } from 'react';
import { useNavigate } from "react-router-dom";


export default function EnterCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try{
    const userId = localStorage.getItem("for2FaUserId"); 
    if (!userId){
      setCode("utilisateur non trouver");
      return;
    }

    const response = await fetch('http://localhost:3001/check2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });

    const data = await response.json();

    if (response.ok && data.success){
      localStorage.setItem('token', data.token);
      navigate('/Dashboard');
    }
    else {
      setError(data.error || 'code incorrect');
    } 
  } catch (error){
    setError('erreur reseau, veuillez reessayer.');
  }
}

  return (
    <div style={{ padding: '20px', maxWidth: '300px', margin: 'auto' }}>
      <h2>Entrez le code reçu par mail :</h2>
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
            marginBottom: '10px',
          }}
        />
        <button type="submit" style={{ width: '100%', height: '40px' }}>
          Valider
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
