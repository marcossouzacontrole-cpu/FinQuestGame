import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Chrome, Shield, Zap, Loader2, UserPlus, LogIn, Github as Microsoft } from 'lucide-react';
import NeonCard from '../components/NeonCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const IS_PROD = window.location.hostname.includes('vercel.app');
const DEFAULT_PROD_URL = 'https://finquest-api-prod-marcos-123.deno.dev';
const SERVER_URL = import.meta.env.VITE_BASE44_BACKEND_URL || (IS_PROD ? DEFAULT_PROD_URL : 'http://localhost:5174');
console.log('🔗 Backend Target:', SERVER_URL);

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', name: '' });

    const handleOAuth = (provider) => {
        window.location.href = `${SERVER_URL}/api/auth/${provider}/login`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const res = await fetch(`${SERVER_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro na autenticação');

            localStorage.setItem('base44_local_token', data.token);
            toast.success(isLogin ? 'Bem-vindo de volta, Herói!' : 'Conta criada com sucesso!');

            if (isLogin) {
                navigate('/');
            } else {
                navigate('/onboarding');
            }
            window.location.reload(); // Refresh to update AuthContext
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A1A] cyber-grid flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8 relative">
                {/* Decorative Elements */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

                <div className="text-center space-y-2 relative">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-block p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 mb-4"
                    >
                        <Shield className="w-12 h-12 text-cyan-400" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
                        FinQuest <span className="text-cyan-400">Portal</span>
                    </h1>
                    <p className="text-slate-400 font-medium">Acesse sua base de comando financeira</p>
                </div>

                <NeonCard glowColor={isLogin ? "cyan" : "purple"} className="p-8 backdrop-blur-xl bg-slate-900/40">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Nome de Herói</label>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="Ex: Sir Coin"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-slate-950/50 border-slate-800 text-white pl-10 h-12 focus:border-purple-500 transition-all"
                                    />
                                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">E-mail</label>
                            <div className="relative">
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="bg-slate-950/50 border-slate-800 text-white pl-10 h-12 focus:border-cyan-500 transition-all"
                                />
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Criptografia (Senha)</label>
                            <div className="relative">
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="bg-slate-950/50 border-slate-800 text-white pl-10 h-12 focus:border-cyan-500 transition-all"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className={`w-full h-12 font-bold uppercase tracking-widest transition-all ${isLogin ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]'
                                }`}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5 mr-2" /> : <Zap className="w-5 h-5 mr-2" />)}
                            {isLogin ? 'Entrar na Arena' : 'Iniciar Jornada'}
                        </Button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0D1117] px-2 text-slate-500 font-bold">Ou via Multi-Cloud</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => handleOAuth('google')}
                            className="border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 text-slate-300"
                        >
                            <Chrome className="w-4 h-4 mr-2" /> Google
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleOAuth('microsoft')}
                            className="border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 text-slate-300"
                        >
                            <Microsoft className="w-4 h-4 mr-2" /> Microsoft
                        </Button>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-slate-400 hover:text-cyan-400 transition-colors font-medium"
                        >
                            {isLogin ? 'Novo por aqui? Crie seu avatar' : 'Já tem um avatar? Entre aqui'}
                        </button>
                    </div>
                </NeonCard>

                <p className="text-center text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black">
                    FinQuest v4.0 • Sistema de Identidade Biométrico Ativo
                </p>
            </div>
        </div>
    );
}
