
import React, { useState } from 'react';
import { api } from '../services/api';
import { Branding, User } from '../types';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle2, Building, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  branding: Branding;
  onLoginSuccess: (data: { user: User, token: string }) => void;
}

const Login: React.FC<LoginProps> = ({ branding, onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.auth.login(email, password);
      onLoginSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Prepara dados
      const companyData = {
          name: companyName,
          // Outros campos são inferidos pelo backend
      };

      const adminData = {
          name: `${firstName} ${lastName}`,
          email: regEmail,
          password: regPassword,
          role: 'admin'
      };

      // 2. Chama API
      // A nova função register já lida com tudo e retorna o token se sucesso
      const response = await api.auth.register(companyData, adminData);

      // 3. Login Automático
      if (response.user && response.token) {
          onLoginSuccess({ user: response.user, token: response.token });
      } else {
          // Fallback caso a API não retorne token (improvável com o novo controller)
          const loginData = await api.auth.login(regEmail, regPassword);
          onLoginSuccess(loginData);
      }

    } catch (err: any) {
      console.error("Erro Registro:", err);
      // Extrai mensagem limpa do erro
      const msg = err.message || 'Erro desconhecido';
      setError(msg.includes('Failed to fetch') ? 'Erro de conexão com o servidor. Tente novamente.' : msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white overflow-hidden">
      {/* Left Side - Branding & Visuals */}
      <div className="hidden lg:flex w-1/2 bg-[#09090b] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600 blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600 blur-[100px]"></div>
        </div>

        <div className="relative z-10 pt-20">
           <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
             Plataforma SaaS<br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
               Enterprise Ready
             </span>
           </h2>
           <ul className="space-y-4 mt-8">
              {['Multi-tenant Isolado', 'Gestão de Planos & Billing', 'API RESTful Segura'].map((item, i) => (
                <li key={i} className="flex items-center text-gray-300 text-lg">
                   <CheckCircle2 className="text-purple-400 mr-3" size={24} />
                   {item}
                </li>
              ))}
           </ul>
        </div>
        <div className="relative z-10 text-xs text-gray-500">
           © {new Date().getFullYear()} {branding.appName}. SaaS Powered by Fastify & Prisma.
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative overflow-y-auto">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100 my-auto animate-fadeIn">
           
           <div className="flex flex-col items-center mb-6">
              {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.appName} className="h-16 w-auto object-contain mb-4" />
              ) : (
                  <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-2" style={{ backgroundColor: branding.primaryColor }}>
                      {branding.appName.charAt(0)}
                  </div>
              )}
              <span className="text-xl font-bold text-gray-800 tracking-tight">{branding.appName}</span>
           </div>

           <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                 {view === 'login' ? 'Acesso ao Painel' : 'Crie sua Empresa'}
              </h1>
              <p className="text-sm text-gray-500">
                {view === 'login' ? 'Entre com suas credenciais de acesso.' : 'Comece seu teste grátis agora.'}
              </p>
           </div>

           {error && (
             <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-start animate-fadeIn">
                <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
             </div>
           )}

           {view === 'login' ? (
             <form onSubmit={handleLogin} className="space-y-5">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Mail size={18} /></div>
                      <input 
                        type="email" required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white"
                        placeholder="admin@admin.com"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Lock size={18} /></div>
                      <input 
                        type={showPassword ? "text" : "password"} required
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all bg-white"
                        placeholder="••••••••"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                   </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#09090b] hover:bg-black text-white font-bold py-2.5 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg disabled:opacity-70" style={{ backgroundColor: branding.primaryColor === '#9333ea' ? '#09090b' : branding.primaryColor }}>
                   {loading ? <Loader2 size={20} className="animate-spin" /> : <>Entrar <ArrowRight size={18} className="ml-2" /></>}
                </button>
             </form>
           ) : (
             <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-sm font-medium text-gray-700">Nome</label><input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" placeholder="João" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                   <div><label className="block text-sm font-medium text-gray-700">Sobrenome</label><input type="text" required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" placeholder="Silva" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-gray-700">Nome da Empresa</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Building size={18} /></div>
                      <input type="text" required className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white" placeholder="Minha Empresa Ltda" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700">Email (Admin)</label>
                   <input type="email" required className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" placeholder="admin@empresa.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700">Senha</label>
                   <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none" 
                        placeholder="Senha forte" 
                        value={regPassword} 
                        onChange={e => setRegPassword(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                   </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg mt-2 disabled:opacity-70" style={{ backgroundColor: branding.primaryColor }}>
                   {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Criar Conta e Empresa'}
                </button>
             </form>
           )}

           <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
              {view === 'login' ? (
                 <p className="text-sm text-gray-600">
                    Novo por aqui? <button onClick={() => setView('register')} className="text-purple-600 font-bold hover:underline" style={{ color: branding.primaryColor }}>Criar conta</button>
                 </p>
              ) : (
                 <p className="text-sm text-gray-600">
                    Já tem conta? <button onClick={() => setView('login')} className="text-purple-600 font-bold hover:underline" style={{ color: branding.primaryColor }}>Fazer Login</button>
                 </p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
