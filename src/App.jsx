import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth }      from './firebase.js';
import Login         from './components/Login.jsx';
import Dashboard     from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), []);

  if (user === undefined) return (
    <div className="min-h-screen flex items-center justify-center"
         style={{ background: 'linear-gradient(135deg,#1B3A5C,#2563EB)' }}>
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? <Dashboard user={user} /> : <Login />;
}
