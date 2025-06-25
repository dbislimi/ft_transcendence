import { useState } from 'react';

export default function EnterCode() {
  const [code, setCode] = useState('');

  return (
    <div style={{ padding: '20px', maxWidth: '300px', margin: 'auto' }}>
      <h2>Entrez le code recu par mail:</h2>
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
    </div>
  );
}
