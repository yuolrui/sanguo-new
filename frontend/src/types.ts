
export interface User {
    id: number;
    username: string;
    gold: number;
    tokens: number;
    pity_counter: number;
}

export interface General {
    id: number;
    name: string;
    stars: number;
    str: number;
    int: number;
    ldr: number;
    luck: number;
    country: string;
    avatar: string;
    description: string;
    converted?: boolean;
    skill_name?: string;
    skill_desc?: string;
}

export interface Equipment {
    id: number; // db ID of equipment type
    name: string;
    type: 'weapon' | 'armor' | 'treasure';
    stat_bonus: number;
    stars: number;
}

export interface UserEquipment extends Equipment {
    id: number; // unique instance ID
    level: number;
}

export interface UserGeneral extends General {
    uid: number; // Instance ID
    level: number;
    exp: number;
    is_in_team: boolean;
    evolution: number;
    equipments: UserEquipment[];
    shard_count: number;
}

export interface Campaign {
    id: number;
    name: string;
    req_power: number;
    gold_drop: number;
    exp_drop: number;
    passed: boolean;
    stars: number;
}

export const COUNTRY_COLORS: Record<string, string> = {
    '魏': 'bg-blue-700',
    '蜀': 'bg-green-700',
    '吴': 'bg-red-700',
    '群': 'bg-gray-700'
};

export const STAR_STYLES: Record<number, { border: string, text: string, bg: string, shadow: string, ring: string }> = {
    1: { border: 'border-stone-500', text: 'text-stone-500', bg: 'bg-stone-500/10', shadow: 'shadow-none', ring: 'ring-stone-500' },
    2: { border: 'border-green-500', text: 'text-green-500', bg: 'bg-green-500/10', shadow: 'shadow-green-900/20', ring: 'ring-green-500' },
    3: { border: 'border-blue-500', text: 'text-blue-500', bg: 'bg-blue-500/10', shadow: 'shadow-blue-900/30', ring: 'ring-blue-500' },
    4: { border: 'border-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10', shadow: 'shadow-purple-900/40', ring: 'ring-purple-500' },
    5: { border: 'border-amber-400', text: 'text-amber-400', bg: 'bg-amber-500/10', shadow: 'shadow-amber-600/50', ring: 'ring-amber-400' },
};