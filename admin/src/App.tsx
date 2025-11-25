import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Users, Database, LogOut, Search, Plus, Trash, Save, Coins, Scroll, Shield, Sword, Box, Menu, X, CheckCircle, XCircle, Info } from 'lucide-react';

const API = '/api';
const ADMIN_API = '/admin/v1';

// --- Types ---
interface AdminUser {
    id: number;
    username: string;
    gold: number;
    tokens: number;
}

interface MetaData {
    generals: any[];
    equipments: any[];
}

interface UserDetail {
    user: AdminUser;
    generals: any[];
    equipments: any[];
}

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
            `}</style>
            <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`
                        toast-enter pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white min-w-[300px] max-w-md backdrop-blur-md border-l-4
                        ${t.type === 'success' ? 'bg-slate-800/95 border-green-500' : 
                          t.type === 'error' ? 'bg-slate-800/95 border-red-500' : 
                          'bg-slate-800/95 border-blue-500'}
                    `}>
                        <div className="shrink-0">
                            {t.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
                            {t.type === 'error' && <XCircle size={20} className="text-red-500" />}
                            {t.type === 'info' && <Info size={20} className="text-blue-500" />}
                        </div>
                        <span className="text-sm font-medium tracking-wide text-slate-100">{t.text}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const useToast = () => useContext(ToastContext);

export default function AdminApp() {
    return (
        <ToastProvider>
            <AdminMain />
        </ToastProvider>
    );
}

function AdminMain() {
    const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
    const [view, setView] = useState<'login' | 'users' | 'system'>('login');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const toast = useToast();
    
    // Login
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');

    // Data State
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
    const [meta, setMeta] = useState<MetaData>({ generals: [], equipments: [] });

    // Inputs
    const [searchTerm, setSearchTerm] = useState('');
    const [currencyForm, setCurrencyForm] = useState({ gold: 0, tokens: 0 });
    const [addGeneralId, setAddGeneralId] = useState<number>(0);
    const [addEquipId, setAddEquipId] = useState<number>(0);

    // Initial Load
    useEffect(() => {
        if (token) {
            setView('users');
            fetchUsers();
            fetchMeta();
        }
    }, [token]);

    // Fetchers
    const fetchUsers = async () => {
        try {
            const res = await fetch(`${ADMIN_API}/users`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setUsers(await res.json());
            else if (res.status === 401 || res.status === 403) logout();
        } catch(e) { logout(); }
    };

    const fetchMeta = async () => {
        const res = await fetch(`${ADMIN_API}/meta`, { headers: { 'Authorization': `Bearer ${token}` } });
        if(res.ok) {
            const data = await res.json();
            setMeta(data);
            if(data.generals.length) setAddGeneralId(data.generals[0].id);
            if(data.equipments.length) setAddEquipId(data.equipments[0].id);
        }
    };

    const fetchUserDetail = async (id: number) => {
        const res = await fetch(`${ADMIN_API}/users/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if(res.ok) {
            const data = await res.json();
            setUserDetail(data);
            setCurrencyForm({ gold: data.user.gold, tokens: data.user.tokens });
            setSelectedUserId(id);
        }
    };

    // Actions
    const login = async () => {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.role === 'admin') {
            setToken(data.token);
            localStorage.setItem('adminToken', data.token);
            setView('users');
            toast.show('登录成功', 'success');
        } else {
            toast.show('账号或密码错误', 'error');
        }
    };

    const logout = () => {
        setToken('');
        localStorage.removeItem('adminToken');
        setView('login');
        setSelectedUserId(null);
        toast.show('已退出登录', 'info');
    };

    const updateCurrency = async () => {
        if(!selectedUserId) return;
        await fetch(`${ADMIN_API}/users/${selectedUserId}/currency`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(currencyForm)
        });
        toast.show('资产已保存', 'success');
        fetchUserDetail(selectedUserId);
    };

    const manageGeneral = async (action: 'add'|'remove', generalId?: number, uid?: number) => {
        if(!selectedUserId) return;
        await fetch(`${ADMIN_API}/users/${selectedUserId}/general`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ generalId, action, uid })
        });
        toast.show(action === 'add' ? '武将已添加' : '武将已移除', 'success');
        fetchUserDetail(selectedUserId);
    };

    const manageEquip = async (action: 'add'|'remove', equipmentId?: number, uid?: number) => {
        if(!selectedUserId) return;
        await fetch(`${ADMIN_API}/users/${selectedUserId}/equipment`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ equipmentId, action, uid })
        });
        toast.show(action === 'add' ? '装备已添加' : '装备已移除', 'success');
        fetchUserDetail(selectedUserId);
    };

    // Views
    if (view === 'login') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
                    <h1 className="text-2xl font-bold mb-6 text-center text-slate-800">GM 管理后台</h1>
                    <input className="block w-full border p-3 mb-3 rounded" placeholder="账号" value={username} onChange={e=>setUsername(e.target.value)} />
                    <input className="block w-full border p-3 mb-6 rounded" type="password" placeholder="密码" value={password} onChange={e=>setPassword(e.target.value)} />
                    <button onClick={login} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold transition">登录系统</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
            {/* Mobile Header */}
            <div className="md:hidden bg-slate-800 text-white p-4 flex justify-between items-center shadow-md">
                <span className="font-bold text-lg">三国 GM</span>
                <button onClick={()=>setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X/> : <Menu/>}</button>
            </div>

            {/* Sidebar / Mobile Menu */}
            <aside className={`${isMenuOpen ? 'block' : 'hidden'} md:block md:w-64 bg-slate-800 text-white shrink-0 transition-all`}>
                <div className="p-6 text-xl font-bold hidden md:block border-b border-slate-700">三国 GM 平台</div>
                <nav className="p-4 space-y-2">
                    <button onClick={()=>{setView('users'); setIsMenuOpen(false); setSelectedUserId(null);}} className={`w-full flex items-center gap-3 p-3 rounded ${view==='users'?'bg-blue-600':'hover:bg-slate-700'}`}>
                        <Users size={20}/> 玩家管理
                    </button>
                    <button onClick={()=>{setView('system'); setIsMenuOpen(false);}} className={`w-full flex items-center gap-3 p-3 rounded ${view==='system'?'bg-blue-600':'hover:bg-slate-700'}`}>
                        <Database size={20}/> 系统配置
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-3 p-3 rounded hover:bg-red-900/50 text-red-300 mt-8">
                        <LogOut size={20}/> 退出登录
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {view === 'users' && !selectedUserId && (
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Users/> 玩家列表</h2>
                        <div className="bg-white p-4 rounded shadow mb-4 flex gap-2">
                            <Search className="text-slate-400"/>
                            <input 
                                className="flex-1 outline-none" 
                                placeholder="搜索用户名..." 
                                value={searchTerm}
                                onChange={e=>setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.filter(u=>u.username.includes(searchTerm)).map(u => (
                                <div key={u.id} onClick={()=>fetchUserDetail(u.id)} className="bg-white p-4 rounded shadow border border-slate-200 hover:border-blue-500 cursor-pointer transition flex justify-between items-center group">
                                    <div>
                                        <div className="font-bold text-lg">{u.username}</div>
                                        <div className="text-sm text-slate-500">ID: {u.id}</div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <div className="text-yellow-600">💰 {u.gold}</div>
                                        <div className="text-green-600">📜 {u.tokens}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'users' && selectedUserId && userDetail && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                        <button onClick={()=>setSelectedUserId(null)} className="text-sm text-slate-500 hover:text-blue-600 mb-2">← 返回列表</button>
                        
                        {/* Currency Editor */}
                        <div className="bg-white p-6 rounded shadow-lg border-t-4 border-blue-600">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="bg-slate-100 px-2 py-1 rounded text-sm text-slate-500">#{userDetail.user.id}</span>
                                {userDetail.user.username}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">金币</label>
                                    <div className="flex items-center border rounded p-2 bg-slate-50">
                                        <Coins size={16} className="text-yellow-500 mr-2"/>
                                        <input type="number" className="bg-transparent w-full outline-none" value={currencyForm.gold} onChange={e=>setCurrencyForm({...currencyForm, gold: +e.target.value})}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">招募令</label>
                                    <div className="flex items-center border rounded p-2 bg-slate-50">
                                        <Scroll size={16} className="text-green-500 mr-2"/>
                                        <input type="number" className="bg-transparent w-full outline-none" value={currencyForm.tokens} onChange={e=>setCurrencyForm({...currencyForm, tokens: +e.target.value})}/>
                                    </div>
                                </div>
                                <button onClick={updateCurrency} className="bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                                    <Save size={18}/> 保存资产
                                </button>
                            </div>
                        </div>

                        {/* Inventory Management */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Generals */}
                            <div className="bg-white p-4 rounded shadow">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h4 className="font-bold flex items-center gap-2"><Shield size={18}/> 持有武将</h4>
                                    <div className="flex gap-2">
                                        <select className="border text-xs rounded w-32" onChange={e=>setAddGeneralId(+e.target.value)}>
                                            {meta.generals.map(g=><option key={g.id} value={g.id}>{g.name} ({g.stars}★)</option>)}
                                        </select>
                                        <button onClick={()=>manageGeneral('add', addGeneralId)} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><Plus size={16}/></button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {userDetail.generals.map(g => (
                                        <div key={g.uid} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <img src={g.avatar} className="w-8 h-8 rounded-full"/>
                                                <div className="text-sm">
                                                    <div className="font-bold">{g.name} <span className="text-yellow-600 text-xs">{'★'.repeat(g.stars)}</span></div>
                                                    <div className="text-xs text-slate-400">Lv.{g.level}</div>
                                                </div>
                                            </div>
                                            <button onClick={()=>manageGeneral('remove', undefined, g.uid)} className="text-red-400 hover:text-red-600"><Trash size={16}/></button>
                                        </div>
                                    ))}
                                    {userDetail.generals.length === 0 && <div className="text-center text-slate-400 text-sm py-4">无数据</div>}
                                </div>
                            </div>

                            {/* Equipment */}
                            <div className="bg-white p-4 rounded shadow">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h4 className="font-bold flex items-center gap-2"><Sword size={18}/> 持有装备</h4>
                                    <div className="flex gap-2">
                                        <select className="border text-xs rounded w-32" onChange={e=>setAddEquipId(+e.target.value)}>
                                            {meta.equipments.map(e=><option key={e.id} value={e.id}>{e.name} ({e.stars}★)</option>)}
                                        </select>
                                        <button onClick={()=>manageEquip('add', addEquipId)} className="bg-green-600 text-white p-1 rounded hover:bg-green-700"><Plus size={16}/></button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {userDetail.equipments.map(e => (
                                        <div key={e.uid} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-500">
                                                    <Box size={16}/>
                                                </div>
                                                <div className="text-sm">
                                                    <div className="font-bold">{e.name} <span className="text-yellow-600 text-xs">{'★'.repeat(e.stars)}</span></div>
                                                    <div className="text-xs text-slate-400">{e.type}</div>
                                                </div>
                                            </div>
                                            <button onClick={()=>manageEquip('remove', undefined, e.uid)} className="text-red-400 hover:text-red-600"><Trash size={16}/></button>
                                        </div>
                                    ))}
                                    {userDetail.equipments.length === 0 && <div className="text-center text-slate-400 text-sm py-4">无数据</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'system' && (
                    <div className="text-center p-12 bg-white rounded shadow border border-slate-200">
                        <Database size={48} className="mx-auto text-slate-300 mb-4"/>
                        <h2 className="text-xl font-bold text-slate-700">系统数据配置</h2>
                        <p className="text-slate-500 mt-2">（此模块保持原有功能，暂未重构）</p>
                    </div>
                )}
            </main>
        </div>
    );
}
