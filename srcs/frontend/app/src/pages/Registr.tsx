import { useState } from 'react';

export default function Registration() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [responseMsg, setResponseMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  const res = await fetch('http://localhost:3001/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });

    const data = await res.json();
    if (data.success) {
      setResponseMsg(`Inscription réussie (id = ${data.id})`);
    } else {
      setResponseMsg('Erreur: ' + data.error);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nom"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <button type="submit">S'inscrire</button>
      {responseMsg && <p>{responseMsg}</p>}
    </form>
  );
}
