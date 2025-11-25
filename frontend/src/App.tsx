import { useState, useEffect, createContext, useContext, ReactNode, FormEvent } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Sword, Users, Scroll, ShoppingBag, Landmark, LogOut, Gift, Zap, Trash2, Shield, CheckCircle, XCircle, Info, ChevronUp, Link as LinkIcon, BookOpen, Sparkles, Star, Box, Compass, Trophy, Skull, X } from 'lucide-react';
import { User, General, UserGeneral, Campaign, COUNTRY_COLORS, STAR_STYLES, Equipment } from './types';

// --- API Service ---
const API_URL = '/api';

const api = {
    login: async (data: any) => {
        const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    register: async (data: any) => {
        const res = await fetch(`${API_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        return res.json();
    },
    getMe: async (token: string) => {
        const res = await fetch(`${API_URL}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    getMyGenerals: async (token: string) => {
        const res = await fetch(`${API_URL}/user/generals`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    getGallery: async (token: string) => {
        const res = await fetch(`${API_URL}/gallery`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    getCollection: async (token: string) => {
        const res = await fetch(`${API_URL}/user/collection`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    getUserItems: async (token: string) => {
        const res = await fetch(`${API_URL}/user/items`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    gacha: async (token: string) => {
        const res = await fetch(`${API_URL}/gacha`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    gachaTen: async (token: string) => {
        const res = await fetch(`${API_URL}/gacha/ten`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    getCampaigns: async (token: string) => {
        const res = await fetch(`${API_URL}/campaigns`, { headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    battle: async (token: string, id: number) => {
        const res = await fetch(`${API_URL}/battle/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    toggleTeam: async (token: string, generalUid: number, action: 'add'|'remove') => {
        const res = await fetch(`${API_URL}/team`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ generalUid, action }) });
        return res.json();
    },
    autoTeam: async (token: string) => {
        const res = await fetch(`${API_URL}/team/auto`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    signin: async (token: string) => {
        const res = await fetch(`${API_URL}/signin`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        return res.json();
    },
    autoEquip: async (token: string, generalUid: number) => {
        const res = await fetch(`${API_URL}/equip/auto`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ generalUid }) });
        return res.json();
    },
    unequipAll: async (token: string, generalUid: number) => {
        const res = await fetch(`${API_URL}/equip/unequip`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ generalUid }) });
        return res.json();
    },
    evolve: async (token: string, targetUid: number) => {
        const res = await fetch(`${API_URL}/general/evolve`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUid }) });
        return res.json();
    }
};

// --- Toast System ---
interface ToastMsg {
    id: number;
    text: string;
    type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<{ show: (text: string, type?: 'success'|'error'|'info') => void }>(null as any);

const ToastProvider = ({ children }: { children?: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);

    const show = (text: string, type: 'success'|'error'|'info' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, text, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .toast-enter {
                    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes paperUnfurl {
                    from { height: 0; opacity: 0; }
                    to { height: 100%; opacity: 1; }
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="fixed top-8 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`
                        toast-enter pointer-events-auto relative flex items-center gap-3 px-6 py-4 min-w-[280px] max-w-md
                        bg-[#e8e4c9] text-[#2c1810] shadow-2xl border-y-4
                        ${t.type === 'success' ? 'border-green-700' : 
                          t.type === 'error' ? 'border-red-800' : 
                          'border-blue-700'}
                    `}>
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] pointer-events-none"></div>
                        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#2c1810] rounded-l-sm"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#2c1810] rounded-r-sm"></div>

                        <div className="shrink-0 relative z-10">
                            {t.type === 'success' && <CheckCircle size={24} className="text-green-700" />}
                            {t.type === 'error' && <XCircle size={24} className="text-red-800" />}
                            {t.type === 'info' && <Info size={24} className="text-blue-700" />}
                        </div>
                        <span className="text-base font-bold tracking-wide font-serif z-10">{t.text}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const useToast = () => useContext(ToastContext);

// --- Context ---
const AuthContext = createContext<any>(null);

const AuthProvider = ({ children }: { children?: ReactNode }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        if (token) {
            api.getMe(token).then(u => setUser(u)).catch(() => logout());
        }
    }, [token]);

    const login = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshUser = () => {
        if (token) api.getMe(token).then(setUser);
    };

    return (
        <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

const useAuth = () => useContext(AuthContext);

// --- Layout Components ---
const Layout = ({ children }: { children?: ReactNode }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    if (!user) return <Navigate to="/login" />;

    const navItems = [
        { path: '/', icon: Landmark, label: '主城' },
        { path: '/campaign', icon: Sword, label: '征战' },
        { path: '/gacha', icon: Gift, label: '招募' },
        { path: '/gallery', icon: BookOpen, label: '图鉴' },
        { path: '/barracks', icon: Users, label: '军营' },
        { path: '/inventory', icon: ShoppingBag, label: '仓库' },
    ];

    return (
        <div className="min-h-screen bg-[#1a1816] text-stone-200 font-serif pb-safe relative">
            <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 z-0"></div>

            <header className="bg-[#2c1810] border-b-2 border-[#5D4037] p-4 sticky top-0 z-50 flex justify-between items-center shadow-lg relative">
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F57F17] to-transparent opacity-50"></div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-900 to-black border-2 border-gold-500 flex items-center justify-center shadow-lg">
                        <span className="font-calligraphy text-2xl text-gold-300">魏</span>
                    </div>
                    <div>
                        <div className="text-2xl font-calligraphy text-gold-300 tracking-widest drop-shadow-md">三国志</div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em] block -mt-1">霸业 Warlord</span>
                    </div>
                </div>
                <div className="flex gap-4 items-center text-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-paper-100 font-bold max-w-[100px] truncate border-b border-stone-600 pb-0.5 mb-0.5">{user.username}</span>
                        <div className="flex gap-3 text-xs font-mono">
                            <span className="text-yellow-500 flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div> {user.gold}
                            </span>
                            <span className="text-green-500 flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div> {user.tokens}
                            </span>
                        </div>
                    </div>
                    <button onClick={logout} className="p-2 hover:bg-[#3E2723] rounded-full border border-[#5D4037] transition-colors"><LogOut size={16} className="text-stone-400" /></button>
                </div>
            </header>

            <main className="pb-24 p-4 max-w-5xl mx-auto relative z-10">
                {children}
            </main>

            <nav className="fixed bottom-0 left-0 w-full bg-[#2c1810] border-t-4 border-[#3E2723] flex justify-around p-1 pb-safe-bottom text-[10px] z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#5D4037]"></div>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path} className="relative group flex flex-col items-center gap-1 p-2 min-w-[16%] transition-all">
                            <div className={`
                                absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent transition-all duration-300
                                ${isActive ? 'opacity-100 shadow-[0_0_8px_#F57F17]' : 'opacity-0'}
                            `}></div>
                            <div className={`
                                p-2 rounded-lg transition-all duration-200
                                ${isActive ? 'bg-[#3E2723] text-gold-300 -translate-y-2 shadow-lg border border-[#5D4037]' : 'text-stone-500 hover:text-stone-300'}
                            `}>
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`font-serif font-bold transition-colors ${isActive ? 'text-gold-300' : 'text-stone-600'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

// --- Reusable UI Components ---
const Panel = ({ children, className = '', title }: { children?: ReactNode, className?: string, title?: ReactNode, key?: any }) => (
    <div className={`bg-[#2c2824]/95 border-2 border-[#3E2723] rounded-sm shadow-2xl relative overflow-hidden ${className}`}>
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gold-700 z-10"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gold-700 z-10"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gold-700 z-10"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gold-700 z-10"></div>
        
        {title && (
            <div className="bg-gradient-to-r from-transparent via-[#3E2723] to-transparent p-2 mb-2 text-center border-b border-[#4E342E] relative">
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-700 to-transparent opacity-50"></div>
                {title}
            </div>
        )}
        <div className="p-3 relative z-0">
            {children}
        </div>
    </div>
);

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', title }: { children?: ReactNode, onClick?: () => void, variant?: 'primary'|'secondary'|'danger'|'disabled', disabled?: boolean, className?: string, title?: string }) => {
    const baseStyles = "relative px-4 py-2 rounded-sm font-bold font-serif border-2 shadow-md active:scale-95 transition-all duration-100 flex items-center justify-center gap-2 uppercase tracking-widest text-sm";
    const variants = {
        primary: "bg-gradient-to-b from-red-900 to-[#2c0b0e] border-[#5D4037] text-gold-100 hover:brightness-110 shadow-red-900/20",
        secondary: "bg-gradient-to-b from-[#4E342E] to-[#2C1810] border-[#5D4037] text-[#D7CCC8] hover:brightness-110",
        danger: "bg-gradient-to-b from-red-700 to-red-900 border-red-500 text-white hover:brightness-110",
        disabled: "bg-stone-800 border-stone-700 text-stone-500 cursor-not-allowed grayscale opacity-70"
    };
    const activeVariant = disabled ? variants.disabled : variants[variant];

    return (
        <button onClick={disabled ? undefined : onClick} className={`${baseStyles} ${activeVariant} ${className}`} title={title} disabled={disabled}>
            {children}
        </button>
    );
};

// --- Detailed Modal ---
const GeneralDetailModal = ({ general, onClose }: { general: General | UserGeneral, onClose: () => void }) => {
    const style = STAR_STYLES[general.stars] || STAR_STYLES[1];
    const isUserGeneral = (g: General | UserGeneral): g is UserGeneral => 'uid' in g;
    const maxStat = 120;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-[#2c1810] border-4 border-[#5D4037] shadow-2xl rounded-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="bg-[#3E2723] p-4 flex justify-between items-center border-b-2 border-[#FBC02D]">
                    <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 text-xs font-bold text-white rounded-sm ${COUNTRY_COLORS[general.country]}`}>{general.country}</div>
                        <h2 className={`text-2xl font-calligraphy ${style.text}`}>{general.name}</h2>
                        <div className="flex gap-0.5">{Array.from({length: general.stars}).map((_, i) => <Star key={i} size={12} className={style.text} fill="currentColor"/>)}</div>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]">
                    <div className="flex gap-6">
                        <div className={`w-32 h-48 shrink-0 border-4 ${style.border} shadow-lg relative bg-[#1a1816]`}>
                            <img src={general.avatar} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="flex-1 space-y-3">
                            {[
                                { label: '武力', val: general.str, color: 'bg-red-600' },
                                { label: '智力', val: general.int, color: 'bg-blue-600' },
                                { label: '统率', val: general.ldr, color: 'bg-green-600' },
                                { label: '运势', val: general.luck, color: 'bg-purple-600' }
                            ].map(s => (
                                <div key={s.label}>
                                    <div className="flex justify-between text-xs font-bold text-stone-400 mb-1">
                                        <span>{s.label}</span>
                                        <span className="text-[#E8E4C9]">{s.val}</span>
                                    </div>
                                    <div className="h-2 bg-[#1a1816] rounded-full border border-stone-700 overflow-hidden">
                                        <div className={`h-full ${s.color}`} style={{width: `${Math.min(s.val / maxStat * 100, 100)}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#1a1816]/50 p-4 border border-[#5D4037] rounded-sm relative">
                        <div className="absolute -top-3 left-3 bg-[#2c1810] px-2 text-xs text-[#FBC02D] font-bold border border-[#5D4037]">专属技能</div>
                        <div className="font-bold text-[#E8E4C9] mb-1">{general.skill_name || '无'}</div>
                        <div className="text-xs text-stone-400 leading-relaxed">{general.skill_desc || '暂无技能描述'}</div>
                    </div>

                    {isUserGeneral(general) && (
                        <div>
                            <h4 className="text-sm font-bold text-[#8D6E63] mb-2 uppercase tracking-widest border-b border-[#3E2723] pb-1">当前装备</h4>
                            <div className="flex gap-2">
                                {['weapon', 'armor', 'treasure'].map(type => {
                                    const eq = general.equipments.find(e => e.type === type);
                                    return (
                                        <div key={type} className={`w-12 h-12 border-2 ${eq ? STAR_STYLES[eq.stars].border : 'border-stone-700 dashed'} bg-[#1a1816] flex items-center justify-center`}>
                                            {eq ? (
                                                type === 'weapon' ? <Sword size={20} className={STAR_STYLES[eq.stars].text}/> :
                                                type === 'armor' ? <Shield size={20} className={STAR_STYLES[eq.stars].text}/> :
                                                <Box size={20} className={STAR_STYLES[eq.stars].text}/>
                                            ) : <span className="text-[9px] text-stone-600">{type === 'weapon' ? '兵' : type === 'armor' ? '甲' : '宝'}</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="text-xs text-stone-500 italic border-t border-[#3E2723] pt-4">
                        "{general.description}"
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Pages ---
const Login = () => {
    const [isReg, setIsReg] = useState(false);
    const [form, setForm] = useState({ username: '', password: '' });
    const { login } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (isReg) {
                await api.register(form);
                toast.show('注册成功，请登录', 'success');
                setIsReg(false);
            } else {
                const res = await api.login(form);
                if (res.error) return toast.show(res.error, 'error');
                login(res.token);
                navigate('/');
            }
        } catch (err) { 
            toast.show('请求失败，请检查网络', 'error'); 
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a1816] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] p-4">
            <div className="relative w-full max-w-md">
                <div className="h-12 bg-[#e8e4c9] rounded-t-lg shadow-lg flex items-center justify-center border-b-2 border-[#2c1810] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] opacity-50"></div>
                    <div className="w-full h-2 bg-[#2c1810] absolute top-2"></div>
                </div>
                
                <div className="bg-[#f4e4bc] text-[#2c1810] p-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] opacity-30 pointer-events-none"></div>
                    
                    <h1 className="text-4xl font-calligraphy text-center text-[#5D4037] mb-8 drop-shadow-sm">三国志 · 霸业</h1>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#5D4037]">主公尊号</label>
                            <input className="w-full bg-transparent border-b-2 border-[#8D6E63] p-2 text-[#2c1810] font-bold outline-none focus:border-[#2c1810] transition-colors placeholder-[#a1887f]" placeholder="请输入账号" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-[#5D4037]">口令</label>
                            <input className="w-full bg-transparent border-b-2 border-[#8D6E63] p-2 text-[#2c1810] font-bold outline-none focus:border-[#2c1810] transition-colors placeholder-[#a1887f]" type="password" placeholder="请输入密码" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                        </div>
                        
                        <div className="pt-4">
                            <button className="w-full bg-[#8D6E63] hover:bg-[#6D4C41] text-[#f4e4bc] font-bold py-3 rounded shadow-lg active:scale-95 transition-all border-2 border-[#4E342E] text-lg font-serif">
                                {isReg ? '注册军籍' : '升帐点兵'}
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-6 text-center border-t border-[#8D6E63]/30 pt-4 cursor-pointer text-[#5D4037] font-bold hover:text-[#3E2723]" onClick={() => setIsReg(!isReg)}>
                        {isReg ? '已有军籍？去点兵' : '初来乍到？立军籍'}
                    </div>
                </div>

                <div className="h-12 bg-[#e8e4c9] rounded-b-lg shadow-lg flex items-center justify-center border-t-2 border-[#2c1810] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')] opacity-50"></div>
                    <div className="w-full h-2 bg-[#2c1810] absolute bottom-2"></div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { refreshUser } = useAuth();
    const toast = useToast();

    const handleSignin = async () => {
        const token = localStorage.getItem('token');
        if(!token) return;
        try {
            const res = await api.signin(token);
            if(res.error) toast.show(res.error, 'info');
            else {
                toast.show(`签到成功! 金币+${res.rewards.gold}, 招募令+${res.rewards.tokens}`, 'success');
                refreshUser();
            }
        } catch(e) { toast.show('签到请求失败', 'error'); }
    };

    return (
        <div className="space-y-6">
            <Panel className="p-0 border-4 border-[#3E2723]">
                <div className="relative h-48 md:h-64 overflow-hidden">
                    <img src="https://picsum.photos/seed/city/800/400" className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-[10s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1816] via-transparent to-transparent flex items-end p-6">
                        <div className="border-l-4 border-gold-500 pl-4">
                            <h2 className="text-4xl font-calligraphy text-gold-300 drop-shadow-lg">洛阳城</h2>
                            <p className="text-sm text-stone-300 font-serif italic">"天下大势，分久必合，合久必分"</p>
                        </div>
                    </div>
                </div>
            </Panel>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: Scroll, label: '每日签到', color: 'text-amber-500', action: handleSignin },
                    { icon: Users, label: '整顿军马', color: 'text-blue-400', link: '/barracks' },
                    { icon: BookOpen, label: '武将图鉴', color: 'text-purple-400', link: '/gallery' },
                    { icon: ShoppingBag, label: '军需仓库', color: 'text-green-400', link: '/inventory' },
                ].map((item, i) => {
                    const Content = (
                        <div className="bg-[#2c2824] p-4 md:p-6 flex flex-col items-center justify-center gap-2 border-2 border-[#3E2723] hover:border-gold-700 transition-all group shadow-lg relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-10"></div>
                            <item.icon size={32} className={`${item.color} drop-shadow-md group-hover:scale-110 transition-transform duration-300`} />
                            <span className="font-bold text-sm md:text-base text-paper-200 font-serif relative z-10 group-hover:text-gold-100">{item.label}</span>
                        </div>
                    );
                    return item.link ? (
                        <Link to={item.link} key={i} className="block active:scale-95">{Content}</Link>
                    ) : (
                        <div key={i} onClick={item.action} className="cursor-pointer active:scale-95">{Content}</div>
                    );
                })}
            </div>
        </div>
    );
};

const Gacha = () => {
    const { token, refreshUser, user } = useAuth();
    const [result, setResult] = useState<General[] | null>(null);
    const [phase, setPhase] = useState<'idle' | 'charging' | 'flash' | 'reveal'>('idle');
    const toast = useToast();

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const performGacha = async (isTen: boolean) => {
        if (!token || phase !== 'idle') return;
        setPhase('charging');
        setResult(null);
        const gachaPromise = isTen ? api.gachaTen(token) : api.gacha(token);
        await wait(2000);
        setPhase('flash');
        await wait(250);
        const res = await gachaPromise;
        if (res.error) {
            setPhase('idle');
            return toast.show(res.error, 'error');
        }
        setResult(isTen ? res.generals : [res.general]);
        setPhase('reveal');
        refreshUser();
    };

    const hasLegendary = result?.some(g => g.stars === 5);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] py-4 relative overflow-hidden">
             {phase === 'flash' && <div className="fixed inset-0 z-[100] bg-white animate-flash pointer-events-none"></div>}

             <div className={`text-center mb-8 relative z-10 transition-opacity duration-500 ${phase !== 'idle' ? 'opacity-50' : 'opacity-100'}`}>
                <h2 className="text-4xl font-calligraphy text-gold-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] flex items-center justify-center gap-4">
                    <Sparkles className="text-amber-400" size={24} /> 聚贤庄 <Sparkles className="text-amber-400" size={24} />
                </h2>
                <div className="mt-4 inline-flex items-center gap-3 bg-[#2c1810] px-4 py-2 rounded-full border border-[#5D4037] shadow-inner">
                    <span className="text-[#8D6E63] text-xs font-bold">保底进度</span>
                    <div className="w-32 h-3 bg-[#1a1816] rounded-full overflow-hidden border border-[#3E2723]">
                        <div className="h-full bg-gradient-to-r from-amber-700 to-amber-500" style={{ width: `${(user?.pity_counter || 0) / 60 * 100}%` }}></div>
                    </div>
                    <span className="text-gold-500 font-mono font-bold text-xs">{user?.pity_counter}/60</span>
                </div>
             </div>

             {phase === 'reveal' && result ? (
                 <Panel className={`w-full max-w-2xl animate-fade-in-up text-center ${hasLegendary ? 'border-gold-500 shadow-gold-700/20' : ''}`}>
                    <div className="relative z-10">
                        <h3 className={`text-2xl font-calligraphy mb-6 ${hasLegendary ? 'text-gold-300 animate-pulse' : 'text-paper-200'}`}>
                            {hasLegendary ? '✨ 天命所归 ✨' : '招募完成'}
                        </h3>
                        <div className="grid grid-cols-5 gap-2 md:gap-4">
                            {result.map((g, i) => {
                                 const style = STAR_STYLES[g.stars] || STAR_STYLES[1];
                                 const isFiveStar = g.stars === 5;
                                 return (
                                    <div key={i} style={{ animationDelay: `${i * 100}ms` }} className={`animate-card-appear flex flex-col items-center p-1 bg-[#1a1816] border-2 ${style.border} relative overflow-hidden group shadow-lg`}>
                                        {isFiveStar && <div className="absolute inset-0 bg-gold-500/10 animate-pulse pointer-events-none"></div>}
                                        {g.converted && <div className="absolute top-0 right-0 bg-blue-900/90 text-blue-100 text-[8px] px-1 z-20 font-bold border-l border-b border-blue-700">碎片x10</div>}
                                        <div className="relative w-full aspect-[2/3] overflow-hidden border border-[#2c1810]">
                                            <img src={g.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className={`text-[9px] md:text-sm font-bold mt-1 ${style.text} truncate w-full text-center font-serif`}>{g.name}</div>
                                        <div className="flex gap-px mt-0.5">{Array.from({length: g.stars}).map((_, si) => <Star key={si} size={8} className={isFiveStar ? 'fill-gold-500 text-gold-500' : 'fill-stone-600 text-stone-600'} />)}</div>
                                    </div>
                                 );
                            })}
                        </div>
                        <div className="mt-8 flex justify-center">
                            <Button onClick={() => { setPhase('idle'); setResult(null); }} variant="secondary">继续招募</Button>
                        </div>
                    </div>
                </Panel>
             ) : (
                 <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center transition-all duration-500">
                    <div className="absolute inset-0 bg-gold-700/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className={`absolute inset-0 border-[1px] border-dashed border-gold-700/30 rounded-full ${phase === 'charging' ? 'animate-spin-slow duration-[3s]' : 'animate-spin-slow'}`}></div>
                    <div className={`absolute inset-8 border border-[#5D4037] rounded-full flex items-center justify-center bg-[#1a1816]/80 ${phase === 'charging' ? 'animate-spin duration-[3s]' : 'rotate-45'}`}>
                        <div className="w-48 h-48 border-2 border-gold-900/30 rotate-45"></div>
                    </div>
                    <div className={`relative z-10 w-32 h-32 bg-gradient-to-b from-[#3E2723] to-[#1a1816] rounded-full border-4 border-[#5D4037] shadow-2xl flex items-center justify-center transition-all duration-500 ${phase === 'charging' ? 'scale-110 border-gold-500 shadow-gold-500/30 animate-shake-hard' : ''}`}>
                        {phase === 'charging' ? <Compass size={48} className="text-gold-500 animate-spin" /> : <div className="text-[#5D4037] font-calligraphy text-4xl">招</div>}
                    </div>
                 </div>
             )}

             {phase === 'idle' && (
                 <div className="mt-12 grid grid-cols-2 gap-6 w-full max-w-sm px-6">
                    <Button onClick={() => performGacha(false)} variant="secondary" className="h-16 flex-col gap-0">
                        <span className="text-lg">单次招募</span>
                        <span className="text-[10px] opacity-70 font-normal">消耗 1 令</span>
                    </Button>
                    <Button onClick={() => performGacha(true)} variant="primary" className="h-16 flex-col gap-0">
                        <span className="text-lg text-gold-100">十连招募</span>
                        <span className="text-[10px] text-gold-300/80 font-normal">消耗 10 令</span>
                    </Button>
                 </div>
             )}
        </div>
    );
};

// --- Helper: Power Calc ---
const calculatePower = (g: UserGeneral) => {
    const baseAttr = g.str + g.int + g.ldr;
    const evolutionBonus = 1 + (g.evolution || 0) * 0.1;
    const basePower = baseAttr * g.level * evolutionBonus;
    const equipPower = g.equipments ? g.equipments.reduce((acc, e) => acc + e.stat_bonus, 0) : 0;
    return Math.floor(basePower + equipPower);
};

// --- Bond Logic Definitions ---
interface BondDef {
    name: string;
    desc: string;
    boost: string;
    condition: (names: string[], countries: string[]) => boolean;
    generals?: string[];
    country?: string;
}

const BONDS: BondDef[] = [
    // Wei
    { name: '曹魏奠基', desc: '曹操/夏侯惇/夏侯渊/曹仁/曹洪 (≥3人)', boost: '防御+15% 兵力+10%', generals: ['曹操', '夏侯惇', '夏侯渊', '曹仁', '曹洪'], condition: (names) => ['曹操', '夏侯惇', '夏侯渊', '曹仁', '曹洪'].filter(n => names.includes(n)).length >= 3 },
    { name: '五子良将', desc: '张辽/张郃/徐晃/于禁/乐进 (≥3人)', boost: '攻击+18% (5人+暴击)', generals: ['张辽', '张郃', '徐晃', '于禁', '乐进'], condition: (names) => ['张辽', '张郃', '徐晃', '于禁', '乐进'].filter(n => names.includes(n)).length >= 3 },
    { name: '虎卫双雄', desc: '典韦+许褚', boost: '攻击+30%', generals: ['典韦', '许褚'], condition: (names) => ['典韦', '许褚'].every(n => names.includes(n)) },
    { name: '司马之心', desc: '司马懿/师/昭/邓艾/钟会 (≥3人)', boost: '谋略+20%', generals: ['司马懿', '司马师', '司马昭', '邓艾', '钟会'], condition: (names) => ['司马懿', '司马师', '司马昭', '邓艾', '钟会'].filter(n => names.includes(n)).length >= 3 },
    // Shu
    { name: '桃园结义', desc: '刘备+关羽+张飞', boost: '攻击+25% 援护', generals: ['刘备', '关羽', '张飞'], condition: (names) => ['刘备', '关羽', '张飞'].every(n => names.includes(n)) },
    { name: '五虎上将', desc: '关羽/张飞/赵云/马超/黄忠 (≥3人)', boost: '暴伤+30% (5人破防)', generals: ['关羽', '张飞', '赵云', '马超', '黄忠'], condition: (names) => ['关羽', '张飞', '赵云', '马超', '黄忠'].filter(n => names.includes(n)).length >= 3 },
    { name: '卧龙凤雏', desc: '诸葛亮+庞统', boost: '技能伤害+25%', generals: ['诸葛亮', '庞统'], condition: (names) => ['诸葛亮', '庞统'].every(n => names.includes(n)) },
    { name: '北伐支柱', desc: '诸葛亮/姜维/魏延/王平 (≥3人)', boost: '防御+20% 策防+30%', generals: ['诸葛亮', '姜维', '魏延', '王平'], condition: (names) => ['诸葛亮', '姜维', '魏延', '王平'].filter(n => names.includes(n)).length >= 3 },
    // Wu
    { name: '江东双璧', desc: '孙策+周瑜', boost: '速度+20 攻击+15%', generals: ['孙策', '周瑜'], condition: (names) => ['孙策', '周瑜'].every(n => names.includes(n)) },
    { name: '东吴四英', desc: '周瑜/鲁肃/吕蒙/陆逊 (4人)', boost: '火系伤害+40%', generals: ['周瑜', '鲁肃', '吕蒙', '陆逊'], condition: (names) => ['周瑜', '鲁肃', '吕蒙', '陆逊'].every(n => names.includes(n)) },
    { name: '江表虎臣', desc: '程普/黄盖/甘宁/周泰... (≥4人)', boost: '兵力+15% 追击', generals: ['程普', '黄盖', '韩当', '周泰', '蒋钦', '陈武', '董袭', '甘宁', '凌统', '徐盛', '潘璋', '丁奉'], condition: (names) => ['程普', '黄盖', '韩当', '周泰', '蒋钦', '陈武', '董袭', '甘宁', '凌统', '徐盛', '潘璋', '丁奉'].filter(n => names.includes(n)).length >= 4 },
    { name: '孙氏宗亲', desc: '孙坚/孙策/孙权... (≥3人)', boost: '全属性+10%', generals: ['孙坚', '孙策', '孙权', '孙桓', '孙韶'], condition: (names) => ['孙坚', '孙策', '孙权', '孙桓', '孙韶'].filter(n => names.includes(n)).length >= 3 },
    // Qun
    { name: '乱世开端', desc: '董卓/吕布/华雄/李傕/郭汜 (≥3人)', boost: '攻击+20% 防御-10%', generals: ['董卓', '吕布', '华雄', '李傕', '郭汜'], condition: (names) => ['董卓', '吕布', '华雄', '李傕', '郭汜'].filter(n => names.includes(n)).length >= 3 },
    { name: '河北庭柱', desc: '颜良/文丑/张郃/高览 (4人)', boost: '首回合攻击+50%', generals: ['颜良', '文丑', '张郃', '高览'], condition: (names) => ['颜良', '文丑', '张郃', '高览'].every(n => names.includes(n)) },
    { name: '白马义从', desc: '公孙瓒+赵云', boost: '速度大幅提升', generals: ['公孙瓒', '赵云'], condition: (names) => ['公孙瓒', '赵云'].every(n => names.includes(n)) },
    { name: '汉室余晖', desc: '卢植/皇甫嵩/朱儁 (3人)', boost: '对群雄伤害+50%', generals: ['卢植', '皇甫嵩', '朱儁'], condition: (names) => ['卢植', '皇甫嵩', '朱儁'].every(n => names.includes(n)) },
    // Cross
    { name: '君臣相知', desc: '刘备+诸葛亮', boost: '刘备生存↑ 诸葛亮计策↑', generals: ['刘备', '诸葛亮'], condition: (names) => ['刘备', '诸葛亮'].every(n => names.includes(n)) },
    { name: '宿命之敌', desc: '关羽+庞德', boost: '互相伤害+50%', generals: ['关羽', '庞德'], condition: (names) => ['关羽', '庞德'].every(n => names.includes(n)) },
    { name: '忠义两全', desc: '关羽+张辽', boost: '防御+25% 免控', generals: ['关羽', '张辽'], condition: (names) => ['关羽', '张辽'].every(n => names.includes(n)) },
    { name: '武之极境', desc: '吕布/关羽/典韦... (≥3人)', boost: '攻击+20% 暴击+15%', generals: ['吕布', '关羽', '张飞', '赵云', '马超', '典韦', '许褚'], condition: (names) => ['吕布', '关羽', '张飞', '赵云', '马超', '典韦', '许褚'].filter(n => names.includes(n)).length >= 3 },
    // Fallback Faction Bonds
    { name: '魏国精锐', desc: '魏国 ≥ 3人', boost: '战力+10%', country: '魏', condition: (_: any, countries: string[]) => countries.filter(c => c === '魏').length >= 3 },
    { name: '蜀汉英杰', desc: '蜀国 ≥ 3人', boost: '战力+10%', country: '蜀', condition: (_: any, countries: string[]) => countries.filter(c => c === '蜀').length >= 3 },
    { name: '江东虎臣', desc: '吴国 ≥ 3人', boost: '战力+10%', country: '吴', condition: (_: any, countries: string[]) => countries.filter(c => c === '吴').length >= 3 },
    { name: '群雄割据', desc: '群雄 ≥ 3人', boost: '战力+10%', country: '群', condition: (_: any, countries: string[]) => countries.filter(c => c === '群').length >= 3 },
];

const getActiveBonds = (team: UserGeneral[]) => {
    const names = team.map(g => g.name);
    const countries = team.map(g => g.country);
    return BONDS.filter(b => b.condition(names, countries));
};

const getGeneralBonds = (g: General) => {
    return BONDS.filter(b => {
        if (b.generals && b.generals.includes(g.name)) return true;
        if (b.country && b.country === g.country) return true;
        return false;
    });
};

// --- Inventory ---
const Inventory = () => {
    const { token } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if(token) api.getUserItems(token).then(data => { if(Array.isArray(data)) setItems(data); });
    }, [token]);

    const filteredItems = filter === 'all' ? items : items.filter(i => i.type === filter);

    return (
        <div className="space-y-4">
            <div className="bg-[#2c1810] text-paper-200 p-3 border-b-2 border-gold-700 flex justify-between items-center font-calligraphy text-xl">
                <span><ShoppingBag className="inline mr-2"/>军需仓库</span>
            </div>

            <div className="flex gap-2 p-1 bg-[#1a1816] border border-[#3E2723]">
                {['all', 'weapon', 'armor', 'treasure'].map(t => (
                    <button key={t} onClick={() => setFilter(t)} className={`flex-1 py-2 text-xs font-bold font-serif transition-colors border border-transparent rounded-sm ${filter === t ? 'bg-[#3E2723] text-gold-300 border-[#5D4037]' : 'text-stone-500 hover:text-stone-300'}`}>
                        {t === 'all' ? '全部' : t === 'weapon' ? '兵刃' : t === 'armor' ? '防具' : '宝物'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredItems.map(item => {
                    const style = STAR_STYLES[item.stars] || STAR_STYLES[1];
                    return (
                        <div key={item.id} className="bg-[#2c2824] p-3 border-2 border-[#3E2723] flex gap-3 relative shadow-lg rounded-sm">
                            <div className={`w-16 h-16 shrink-0 border-2 ${style.border} bg-[#1a1816] flex items-center justify-center`}>
                                {item.type === 'weapon' && <Sword size={24} className={style.text} />}
                                {item.type === 'armor' && <Shield size={24} className={style.text} />}
                                {item.type === 'treasure' && <Box size={24} className={style.text} />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <div className={`font-bold font-serif ${style.text}`}>{item.name}</div>
                                    <div className="text-xs bg-[#1a1816] px-1 text-stone-400 border border-stone-700">{item.stars}★</div>
                                </div>
                                <div className="mt-2 flex justify-between items-end">
                                    <div className="text-xs text-stone-400">加成 <span className="text-gold-500">+{item.stat_bonus}</span></div>
                                    {item.equipped_by && <div className="text-[10px] text-blue-300 bg-blue-900/30 px-2 py-0.5 border border-blue-800">已装备: {item.equipped_by}</div>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Gallery ---
const Gallery = () => {
    const { token } = useAuth();
    const [meta, setMeta] = useState<{ generals: General[], equipments: Equipment[] }>({ generals: [], equipments: [] });
    const [collection, setCollection] = useState<{ generalIds: number[], equipmentIds: number[], assignments?: Record<number, string[]> }>({ generalIds: [], equipmentIds: [] });
    const [tab, setTab] = useState<'generals' | 'equipments'>('generals');
    const [filter, setFilter] = useState('全部');
    const [selectedGeneral, setSelectedGeneral] = useState<General | null>(null);
    
    useEffect(() => {
        if(token) {
            api.getGallery(token).then(setMeta);
            api.getCollection(token).then(setCollection);
        }
    }, [token]);

    const filteredGenerals = filter === '全部' ? meta.generals : meta.generals.filter(g => g.country === filter);
    const isOwned = (id: number, type: 'general' | 'equip') => type === 'general' ? collection.generalIds.includes(id) : collection.equipmentIds.includes(id);

    return (
        <div className="space-y-4">
            {selectedGeneral && <GeneralDetailModal general={selectedGeneral} onClose={() => setSelectedGeneral(null)} />}
            <div className="bg-[#2c1810] text-paper-200 p-3 border-b-2 border-gold-700 flex justify-between items-center font-calligraphy text-xl shadow-md">
                <span><BookOpen className="inline mr-2"/>图鉴</span>
                <span className="text-sm font-sans text-stone-400">收集: <span className="text-gold-500">{tab==='generals'?collection.generalIds.length:collection.equipmentIds.length}</span> / {tab==='generals'?meta.generals.length:meta.equipments.length}</span>
            </div>
            
            <div className="flex border-b-2 border-[#3E2723]">
                <button onClick={() => setTab('generals')} className={`flex-1 py-2 font-bold font-serif ${tab === 'generals' ? 'bg-[#3E2723] text-gold-300' : 'text-stone-500 hover:bg-[#2c1810]'}`}>名将录</button>
                <button onClick={() => setTab('equipments')} className={`flex-1 py-2 font-bold font-serif ${tab === 'equipments' ? 'bg-[#3E2723] text-gold-300' : 'text-stone-500 hover:bg-[#2c1810]'}`}>神兵谱</button>
            </div>

            {tab === 'generals' && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['全部', '魏', '蜀', '吴', '群'].map(c => (
                        <button key={c} onClick={() => setFilter(c)} className={`px-4 py-1 border ${filter === c ? 'bg-red-900 border-red-700 text-[#E8E4C9]' : 'bg-[#1a1816] border-[#3E2723] text-stone-500'} font-serif font-bold text-sm min-w-[60px] rounded-sm`}>{c}</button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tab === 'generals' && filteredGenerals.map(g => {
                    const style = STAR_STYLES[g.stars] || STAR_STYLES[1];
                    const owned = isOwned(g.id, 'general');
                    return (
                        <div key={g.id} onClick={() => setSelectedGeneral(g)} className={`bg-[#2c2824] p-2 border border-[#3E2723] flex gap-3 relative cursor-pointer hover:border-gold-700/50 transition-colors ${!owned ? 'opacity-50 grayscale' : ''}`}>
                            <div className="relative w-20 h-24 shrink-0 border-2 border-[#1a1816]">
                                <img src={g.avatar} className="w-full h-full object-cover" />
                                <div className={`absolute top-0 left-0 text-[10px] text-white px-1 font-bold ${COUNTRY_COLORS[g.country]}`}>{g.country}</div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div className="flex justify-between">
                                    <div className={`font-bold font-serif ${style.text}`}>{g.name}</div>
                                    <div className="text-stone-500 text-xs">{g.stars}★</div>
                                </div>
                                <div className="text-[10px] text-stone-400 line-clamp-2 italic">"{g.description}"</div>
                                {g.skill_name && <div className="text-[9px] text-purple-300 mt-1">技能: {g.skill_name}</div>}
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {getGeneralBonds(g).map(b => <span key={b.name} className="text-[9px] border border-stone-600 px-1 text-stone-300 bg-[#1a1816]"><LinkIcon size={8} className="mr-1"/>{b.name}</span>)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {tab === 'equipments' && meta.equipments.map(e => {
                    const style = STAR_STYLES[e.stars] || STAR_STYLES[1];
                    const owned = isOwned(e.id, 'equip');
                    const assigned = collection.assignments?.[e.id];
                    return (
                        <div key={e.id} className={`bg-[#2c2824] p-2 border border-[#3E2723] flex gap-3 relative rounded-sm ${!owned ? 'opacity-50 grayscale' : ''}`}>
                            <div className={`w-16 h-16 shrink-0 border-2 ${style.border} bg-[#1a1816] flex items-center justify-center`}>
                                {e.type === 'weapon' && <Sword size={24} className={style.text} />}
                                {e.type === 'armor' && <Shield size={24} className={style.text} />}
                                {e.type === 'treasure' && <Box size={24} className={style.text} />}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold font-serif ${style.text}`}>{e.name}</div>
                                <div className="text-xs text-gold-600 font-mono">+{e.stat_bonus}</div>
                                {assigned && <div className="text-[10px] text-stone-400 mt-1">装备于: {assigned.join(', ')}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Barracks ---
const Barracks = () => {
    const { token } = useAuth();
    const [generals, setGenerals] = useState<UserGeneral[]>([]);
    const [selectedGeneral, setSelectedGeneral] = useState<UserGeneral | null>(null);
    const toast = useToast();

    const load = () => { if(token) api.getMyGenerals(token).then(setGenerals); };
    useEffect(() => { load(); }, [token]);

    const toggle = async (uid: number, isIn: boolean) => {
        if(!token) return;
        if (!isIn) {
            const currentTeam = generals.filter(g => g.is_in_team);
            if (currentTeam.length >= 5) return toast.show('部队已满 (5人)', 'error');
            const target = generals.find(g => g.uid === uid);
            if (target && currentTeam.some(g => g.id === target.id)) return toast.show('同名武将不可重复上阵', 'error');
        }
        const res = await api.toggleTeam(token, uid, isIn ? 'remove' : 'add');
        if (res.error) toast.show(res.error, 'error');
        else load();
    };

    const autoTeam = async () => { if(token) { await api.autoTeam(token); toast.show('部队已整编', 'success'); load(); } };
    const handleEquip = async (uid: number) => { if(token) { await api.autoEquip(token, uid); toast.show('装备已穿戴', 'success'); load(); } };
    const handleUnequip = async (uid: number) => { if(token) { await api.unequipAll(token, uid); toast.show('装备已卸下', 'info'); load(); } };
    
    const handleEvolve = async (targetUid: number) => {
        if(token) {
            const res = await api.evolve(token, targetUid);
            if (res.error) toast.show(res.error, 'error');
            else { toast.show('进阶成功', 'success'); load(); }
        }
    };

    // Sort Team by Power (Descending)
    const team = generals.filter(g => g.is_in_team).sort((a, b) => calculatePower(b) - calculatePower(a));
    const activeBonds = getActiveBonds(team);
    
    // Sort Roster: Deployed First -> Stars Desc -> Power Desc
    const sortedGenerals = [...generals].sort((a, b) => {
        if (a.is_in_team !== b.is_in_team) return a.is_in_team ? -1 : 1;
        if (b.stars !== a.stars) return b.stars - a.stars;
        return calculatePower(b) - calculatePower(a);
    });
    const isTeamFull = team.length >= 5;

    return (
        <div className="space-y-6">
            {selectedGeneral && <GeneralDetailModal general={selectedGeneral} onClose={() => setSelectedGeneral(null)} />}
            
            <Panel title={<div className="flex justify-between items-center w-full"><span className="font-calligraphy text-xl text-gold-300">中军大帐</span><Button onClick={autoTeam} variant="secondary" className="text-xs px-2 py-1">一键整编</Button></div>}>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide min-h-[120px]">
                    {team.length === 0 ? <div className="text-stone-500 text-sm w-full text-center py-8 italic">暂无出战武将</div> : team.map(g => (
                        <div key={g.uid} onClick={() => setSelectedGeneral(g)} className="relative w-20 shrink-0 bg-[#1a1816] border-2 border-gold-700 shadow-lg cursor-pointer">
                            <div className="w-full h-24 overflow-hidden relative">
                                <img src={g.avatar} className="w-full h-full object-cover" />
                                <div className={`absolute top-0 left-0 px-1 text-[9px] text-white ${COUNTRY_COLORS[g.country]}`}>{g.country}</div>
                            </div>
                            <div className="bg-[#2c1810] p-1 text-center">
                                <div className="text-[10px] font-bold text-paper-100 truncate">{g.name}</div>
                                <div className="text-[9px] text-gold-500">{calculatePower(g)}</div>
                            </div>
                        </div>
                    ))}
                </div>
                {activeBonds.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#3E2723] flex flex-wrap gap-2 items-center">
                        <LinkIcon size={12} className="text-stone-500" />
                        {activeBonds.map((b, i) => (
                            <div key={i} className="flex flex-col items-start">
                                <span className="text-[10px] bg-[#3E2723] text-gold-300 px-2 py-1 border border-[#5D4037] font-bold">{b.name}</span>
                                <span className="text-[8px] text-stone-400 ml-1">{b.boost}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-4 bg-gold-700"></div>
                    <h3 className="font-calligraphy text-lg text-paper-200">麾下诸将 ({generals.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sortedGenerals.map(g => {
                        const power = calculatePower(g);
                        const style = STAR_STYLES[g.stars] || STAR_STYLES[1];
                        const shardCount = g.shard_count || 0;
                        const canEvolve = shardCount >= 10;
                        const expPercent = Math.min((g.exp / (g.level * 100)) * 100, 100);

                        return (
                            <div key={g.uid} className={`bg-[#2c2824] p-2 border-2 flex gap-3 shadow-md relative rounded-sm ${g.is_in_team ? 'border-gold-700 bg-[#3E2723]' : 'border-[#3E2723]'}`}>
                                <div onClick={() => setSelectedGeneral(g)} className="relative w-16 h-20 shrink-0 border border-[#1a1816] cursor-pointer">
                                    <img src={g.avatar} className="w-full h-full object-cover" />
                                    <div className={`absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white rounded-full ${COUNTRY_COLORS[g.country]} border border-black`}>{g.country}</div>
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div className="flex justify-between">
                                        <div>
                                            <span className={`font-bold font-serif ${style.text}`}>{g.name}</span>
                                            <span className="text-xs text-stone-400 ml-2">Lv.{g.level}</span>
                                        </div>
                                        <div className="text-gold-500 font-mono text-sm font-bold">{power}</div>
                                    </div>
                                    <div className="w-full h-1 bg-[#1a1816] mt-1 border border-stone-700">
                                        <div className="h-full bg-blue-600" style={{width: `${expPercent}%`}}></div>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <div className="text-[10px] text-stone-500">碎片: {shardCount}/10</div>
                                        <div className="flex gap-1">
                                            <Button onClick={() => canEvolve ? handleEvolve(g.uid) : toast.show(`需要10个碎片 (当前: ${shardCount})`, 'info')} disabled={!canEvolve} variant={canEvolve ? 'primary' : 'disabled'} className="px-2 py-0.5 text-[10px] h-6"><ChevronUp size={10}/>进阶</Button>
                                            <Button onClick={() => handleEquip(g.uid)} variant="secondary" className="px-2 py-0.5 text-[10px] h-6" title="自动装备"><Zap size={10}/></Button>
                                            <Button onClick={() => handleUnequip(g.uid)} variant="secondary" className="px-2 py-0.5 text-[10px] h-6" title="卸下装备"><Trash2 size={10}/></Button>
                                            <Button onClick={() => { if(!g.is_in_team && isTeamFull) return toast.show('部队已满 (5人)', 'error'); toggle(g.uid, g.is_in_team); }} variant={g.is_in_team ? 'danger' : 'secondary'} className={`px-2 py-0.5 text-[10px] h-6 ${!g.is_in_team && isTeamFull ? 'grayscale opacity-50' : ''}`}>{g.is_in_team ? '下阵' : '上阵'}</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Campaign ---
const CampaignPage = () => {
    const { token, refreshUser } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [battleResult, setBattleResult] = useState<{win: boolean, rewards?: {gold: number, exp: number}, levelUps?: {name: string, from: number, to: number}[], battleLog?: string[]} | null>(null);
    const toast = useToast();

    useEffect(() => { if(token) api.getCampaigns(token).then(setCampaigns); }, [token]);

    const fight = async (id: number) => {
        if(!token) return;
        const res = await api.battle(token, id);
        if(res.error) return toast.show(res.error, 'error');
        if(res.win) {
            const updated = await api.getCampaigns(token);
            setCampaigns(updated);
            refreshUser();
        }
        setBattleResult(res);
    };

    return (
        <div className="space-y-6">
            <div className="bg-[#2c1810] text-paper-200 p-3 border-b-2 border-gold-700 flex justify-between items-center font-calligraphy text-xl shadow-md">
                <span><Sword className="inline mr-2"/>天下征战</span>
            </div>
            <div className="space-y-4">
                {campaigns.map(c => (
                    <Panel key={c.id} className="flex justify-between items-center bg-gradient-to-r from-[#2c2824] to-[#1a1816]">
                        <div>
                            <div className="font-bold font-serif text-lg text-[#E8E4C9]">{c.name}</div>
                            <div className="text-xs text-stone-500 mt-1">推荐战力 <span className="text-[#FBC02D] font-mono">{c.req_power}</span></div>
                        </div>
                        <div className="flex gap-3">
                            {c.passed && c.stars === 3 && <Button onClick={() => fight(c.id)} variant="secondary" className="text-xs px-3">扫荡</Button>}
                            <Button onClick={() => fight(c.id)} variant="primary" className="text-xs px-4">出征</Button>
                        </div>
                    </Panel>
                ))}
            </div>

            {battleResult && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in px-4">
                    <div className={`relative w-full max-w-sm p-1 shadow-2xl transform animate-pop-in border-4 ${battleResult.win ? 'border-[#FBC02D]' : 'border-stone-600'}`}>
                        <div className="bg-[#1a1816] p-6 text-center relative overflow-hidden max-h-[80vh] overflow-y-auto">
                            {battleResult.win && <div className="absolute inset-0 bg-[#FBC02D]/10 animate-pulse pointer-events-none"></div>}
                            
                            <div className="mb-6 relative z-10 flex justify-center">
                                {battleResult.win ? <Trophy size={80} className="text-[#FBC02D] drop-shadow-lg animate-bounce" /> : <Skull size={80} className="text-stone-500" />}
                            </div>

                            <h2 className={`text-4xl font-calligraphy mb-4 ${battleResult.win ? 'text-[#FBC02D]' : 'text-stone-500'}`}>
                                {battleResult.win ? '大获全胜' : '兵败如山倒'}
                            </h2>

                            {/* Battle Logs */}
                            <div className="bg-[#2c1810]/80 p-2 rounded mb-4 text-left max-h-32 overflow-y-auto border border-[#3E2723]">
                                {battleResult.battleLog && battleResult.battleLog.length > 0 ? (
                                    battleResult.battleLog.map((log, i) => (
                                        <div key={i} className="text-[10px] text-stone-300 border-b border-stone-800 py-0.5 last:border-0">{log}</div>
                                    ))
                                ) : (
                                    <div className="text-[10px] text-stone-500 italic text-center">双方激战...</div>
                                )}
                            </div>

                            {battleResult.win ? (
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-center gap-8 py-4 border-y border-[#3E2723]">
                                        <div className="text-center">
                                            <div className="text-xs text-stone-500 uppercase">赏金</div>
                                            <div className="text-xl font-bold text-[#FBC02D]">+{battleResult.rewards?.gold}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-stone-500 uppercase">历练</div>
                                            <div className="text-xl font-bold text-blue-400">+{battleResult.rewards?.exp}</div>
                                        </div>
                                    </div>
                                    {battleResult.levelUps && battleResult.levelUps.length > 0 && (
                                        <div className="text-left bg-[#2c1810] p-2 border border-[#3E2723]">
                                            <div className="text-xs text-center text-[#FBC02D] mb-2">- 将领晋升 -</div>
                                            {battleResult.levelUps.map((u, i) => (
                                                <div key={i} className="flex justify-between text-sm px-2 py-1">
                                                    <span className="text-[#E8E4C9]">{u.name}</span>
                                                    <span className="text-green-500">Lv.{u.from} → Lv.{u.to}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-stone-400 text-sm mb-6 font-serif">胜败乃兵家常事，少侠请整顿军马再战！</p>
                            )}

                            <div className="mt-8">
                                <Button onClick={() => setBattleResult(null)} variant={battleResult.win ? 'primary' : 'secondary'} className="w-full py-3 text-lg">
                                    {battleResult.win ? '凯旋' : '撤退'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- App Router ---
export default function App() {
    return (
        <HashRouter>
            <ToastProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<Layout><Dashboard /></Layout>} />
                        <Route path="/gacha" element={<Layout><Gacha /></Layout>} />
                        <Route path="/gallery" element={<Layout><Gallery /></Layout>} />
                        <Route path="/barracks" element={<Layout><Barracks /></Layout>} />
                        <Route path="/campaign" element={<Layout><CampaignPage /></Layout>} />
                        <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
                    </Routes>
                </AuthProvider>
            </ToastProvider>
        </HashRouter>
    );
}