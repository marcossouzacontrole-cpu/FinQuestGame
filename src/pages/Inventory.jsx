import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Shield, Zap, FlaskConical, Sword, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Inventory() {
    const { data: currentUser } = useQuery({
        queryKey: ['base44User'],
        queryFn: () => base44.auth.me(),
    });

    const { data: inventory, refetch, isLoading } = useQuery({
        queryKey: ['userInventory', currentUser?.email],
        queryFn: async () => {
            const inv = await base44.entities.UserInventory.filter({ user_email: currentUser.email });
            const itemIds = inv.map(i => i.item_id);

            if (itemIds.length === 0) return [];

            const items = await base44.entities.Item.filter({ id: { _in: itemIds } });

            return inv.map(invItem => ({
                ...invItem,
                details: items.find(it => it.id === invItem.item_id)
            }));
        },
        enabled: !!currentUser,
    });

    const equipMutation = useMutation({
        mutationFn: async ({ id, isEquipped }) => {
            return await base44.entities.UserInventory.update(id, { is_equipped: !isEquipped });
        },
        onSuccess: () => {
            toast.success('Inventory updated!');
            refetch();
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-cyan-400" />
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Inventário de Herói</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {inventory?.length > 0 ? (
                        inventory.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`relative p-6 rounded-2xl border-2 transition-all overflow-hidden bg-slate-900/80 ${item.is_equipped ? 'border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.3)]' : 'border-slate-800'
                                    }`}
                            >
                                {item.is_equipped && (
                                    <div className="absolute top-0 right-0 bg-cyan-500 text-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl">
                                        EQUIPADO
                                    </div>
                                )}

                                <div className="flex items-start gap-4 mb-4">
                                    <div className="text-5xl">{item.details?.icon || '📦'}</div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{item.details?.name}</h3>
                                        <p className="text-slate-400 text-xs">{item.details?.category}</p>
                                    </div>
                                </div>

                                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                    {item.details?.description}
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-purple-400" />
                                        <span className="text-purple-400 text-xs font-bold uppercase">
                                            {item.details?.effect_type?.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => equipMutation.mutate({ id: item.id, isEquipped: item.is_equipped })}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${item.is_equipped
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                                                : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
                                            }`}
                                    >
                                        {item.is_equipped ? 'REMOVER' : (item.details?.category === 'consumable' ? 'USAR' : 'EQUIPAR')}
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-3xl">
                            <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-500 font-bold">Seu inventário está vazio.</p>
                            <Link to="/shop" className="text-cyan-400 hover:underline mt-2 inline-block">Visitar a Loja 🛒</Link>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
