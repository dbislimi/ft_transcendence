/// <reference types="vite/client" />

// Déclaration pour les imports JSON
declare module '*.json' {
  const value: any;
  export default value;
}
