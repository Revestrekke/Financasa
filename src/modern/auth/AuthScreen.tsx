import { useState, type FormEvent } from 'react';
import { Button, Card, Input, SegmentedControl } from '../components';
import { signInWithPassword, signUpWithPassword } from '../services/supabaseClient';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  onAuthenticated?: () => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || !password) {
      setMessage('Informe e-mail e senha.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setMessage('Informe seu nome.');
      return;
    }

    setSubmitting(true);
    const response = mode === 'login'
      ? await signInWithPassword(email.trim(), password)
      : await signUpWithPassword(email.trim(), password, name.trim());
    setSubmitting(false);

    if (response.error) {
      setMessage(response.error.message);
      return;
    }

    if (mode === 'signup' && !response.data.session) {
      setMessage('Conta criada. Confira seu e-mail para confirmar o cadastro.');
      return;
    }

    onAuthenticated?.();
  }

  return (
    <main className="modern-auth-screen">
      <section className="modern-auth-copy">
        <div className="modern-app-title">
          <strong>FinanCasa</strong>
          <span>Gestão financeira familiar com áreas compartilhadas, Supabase e controle por status.</span>
        </div>
        <div className="modern-auth-points">
          <Card title="Multiusuário" subtitle="Compartilhe sua área financeira com usuários convidados." />
          <Card title="Controle real" subtitle="Receitas, despesas e faturas só contabilizam quando confirmadas." />
          <Card title="Migração gradual" subtitle="Nova estrutura React preservando as regras atuais." />
        </div>
      </section>

      <section className="modern-auth-card-wrap">
        <Card title={mode === 'login' ? 'Entrar no FinanCasa' : 'Criar sua conta'} subtitle={mode === 'login' ? 'Acesse sua área financeira privada.' : 'Crie seu acesso para começar.'}>
          <form className="modern-auth-form" onSubmit={submit}>
            <SegmentedControl
              onChange={(value) => {
                setMode(value as AuthMode);
                setMessage('');
              }}
              options={[
                { label: 'Entrar', value: 'login' },
                { label: 'Criar conta', value: 'signup' }
              ]}
              value={mode}
            />

            {mode === 'signup' && <Input label="Nome" onChange={(event) => setName(event.target.value)} placeholder="David" value={name} />}
            <Input label="E-mail" onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" type="email" value={email} />
            <Input label="Senha" onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" type="password" value={password} />

            <Button disabled={submitting} type="submit" variant="primary">
              {submitting ? 'Conectando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>

            {message && <p className="modern-auth-message">{message}</p>}
          </form>
        </Card>
      </section>
    </main>
  );
}
