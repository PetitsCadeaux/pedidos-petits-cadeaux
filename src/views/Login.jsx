import { useState } from 'react';
import { CFG } from '../config.js';
import { supabase } from '../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr('No pudimos iniciar sesión. Revisá el correo y la contraseña.');
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <form className="card login" onSubmit={submit}>
        <p className="eyebrow">{CFG.empresa} · Uso interno</p>
        <h1>Panel de Producción</h1>
        <label htmlFor="email">Correo</label>
        <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="pass">Contraseña</label>
        <input id="pass" type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} />
        {err ? <p className="err" role="alert">{err}</p> : null}
        <button className="btn solid" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
