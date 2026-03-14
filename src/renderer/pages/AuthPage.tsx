import { useState } from 'react';
import { LogIn, Mail, ShieldCheck, User } from 'lucide-react';
import { GlassCard, GlowButton } from '@renderer/components/Glass';
import { useLauncherStore } from '@renderer/store/useLauncherStore';

export function AuthPage() {
  const { authFlow, error, setError, registerLocal, loginLocal, beginMicrosoftLogin, completeMicrosoftLogin } = useLauncherStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function submit() {
    try {
      setError(null);
      if (mode === 'register') {
        await registerLocal({ email, username, password });
      } else {
        await loginLocal(email, password);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось выполнить вход');
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060f] text-white">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(34,197,94,0.2), transparent 30%), radial-gradient(circle at 85% 15%, rgba(6,182,212,0.15), transparent 30%), linear-gradient(180deg, #05060f, #090b13)' }} />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="grid w-full max-w-6xl grid-cols-[1.05fr_0.95fr] gap-6">
          <GlassCard className="p-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-4 py-2 text-xs text-green-300">
                <ShieldCheck className="h-4 w-4" />
                Mid-Mine Auth
              </div>
              <h1 className="mt-6 text-5xl font-bold leading-tight">Вход в лаунчер и Minecraft-профиль</h1>
              <p className="mt-4 text-base text-zinc-400">
                Локальный аккаунт использует email, пароль и ник. Microsoft-аккаунт даёт лицензионный вход и сразу получает статус Premium.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  ['Локальный вход', 'Email + пароль'],
                  ['Minecraft ник', 'Используется в лаунчере и в offline режиме'],
                  ['Premium', 'Выдаётся автоматически для Microsoft'],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-2 text-xs text-zinc-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <div className="flex gap-2 rounded-2xl border border-white/8 bg-white/4 p-1">
              <button className={`flex-1 rounded-xl px-4 py-2 text-sm ${mode === 'login' ? 'bg-green-500/20 text-white' : 'text-zinc-400'}`} onClick={() => setMode('login')}>
                Вход
              </button>
              <button className={`flex-1 rounded-xl px-4 py-2 text-sm ${mode === 'register' ? 'bg-green-500/20 text-white' : 'text-zinc-400'}`} onClick={() => setMode('register')}>
                Регистрация
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent outline-none" placeholder="mail@midmine.ru" />
                </div>
              </label>
              {mode === 'register' ? (
                <label className="block">
                  <span className="mb-2 block text-sm text-zinc-400">Ник</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                    <User className="h-4 w-4 text-zinc-500" />
                    <input value={username} onChange={(event) => setUsername(event.target.value)} className="w-full bg-transparent outline-none" placeholder="MidMinePlayer" />
                  </div>
                </label>
              ) : null}
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-400">Пароль</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                  <LogIn className="h-4 w-4 text-zinc-500" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-transparent outline-none" placeholder="******" />
                </div>
              </label>
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

            <div className="mt-6 flex gap-3">
              <GlowButton className="flex-1" onClick={() => void submit()}>
                {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
              </GlowButton>
              <button className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" onClick={() => void beginMicrosoftLogin()}>
                Microsoft
              </button>
            </div>

            {authFlow ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/4 p-5">
                <p className="text-sm font-semibold text-white">Microsoft Device Code</p>
                <p className="mt-2 whitespace-pre-line text-xs text-zinc-400">{authFlow.message}</p>
                <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-center text-2xl tracking-[0.35em] text-green-300">
                  {authFlow.userCode}
                </div>
                <div className="mt-4 flex gap-3">
                  <a className="rounded-xl border border-white/10 bg-white/6 px-4 py-2 text-sm text-white" href={authFlow.verificationUri} target="_blank" rel="noreferrer">
                    Открыть Microsoft
                  </a>
                  <GlowButton className="px-4 py-2" onClick={() => void completeMicrosoftLogin(authFlow.flowId)}>
                    Проверить вход
                  </GlowButton>
                </div>
              </div>
            ) : null}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
