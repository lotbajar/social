import { Reaction, User } from '@/types';
import { Link, router } from '@inertiajs/react';
import UserAvatar from './user-avatar';

interface ReactionListProps {
    reactions: Reaction[]; // Lista completa de reacciones.
    users: User[]; // Lista de usuarios que reaccionaron con "selectedEmoji".
    selectedEmoji: string; // Emoji seleccionado.
    isLoading: boolean; // Indica si la carga de más usuarios está en proceso.
}

export default function ReactionList({ reactions, users, selectedEmoji, isLoading }: ReactionListProps) {
    return (
        <div className="grid grid-cols-[120px_1fr] gap-4">
            {/* Columna de emojis */}
            <div className="space-y-2 border-r pr-3">
                {reactions.map((reaction) => (
                    <button
                        key={reaction.emoji}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-sm ${
                            reaction.emoji === selectedEmoji ? 'bg-muted font-semibold' : 'hover:bg-muted'
                        }`}
                        onClick={() =>
                            router.visit(window.location.pathname, {
                                data: { emoji: reaction.emoji },
                            })
                        }
                    >
                        <span>{reaction.emoji}</span>
                        <span className="text-muted-foreground">{reaction.count}</span>
                    </button>
                ))}
            </div>

            {/* Columna de usuarios */}
            <div className="space-y-3">
                {users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                        {/* Avatar del usuario */}
                        <UserAvatar className="h-10 w-10" user={user} />

                        {/* Nombre del usuario */}
                        <Link href={route('profile.show', user.username)}>{user.username}</Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
