import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isSubmitting?: boolean;
  serverError?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isSubmitting = false, serverError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Informe e-mail e senha para continuar.');
      return;
    }

    setError('');
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (err) {
      if (!(err instanceof Error)) return;
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-semibold">
            LK
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Linka Fleet</h1>
          <p className="text-sm text-gray-500">Acesse sua conta para monitorar sua frota em tempo real.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Digite seu e-mail"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>
          </div>

          {(error || serverError) && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              {error || serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full inline-flex justify-center items-center rounded-xl px-4 py-3 font-semibold shadow-lg shadow-blue-200 transition-colors ${
              isSubmitting ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Sistema protegido. Apenas usuários autorizados podem acessar.
        </p>
      </div>
    </div>
  );
};
