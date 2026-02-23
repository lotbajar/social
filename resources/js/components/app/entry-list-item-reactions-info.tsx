import { Entry, Reaction, Reactions, User, Users } from '@/types';
import { router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import UserAvatar from './user-avatar';

interface Props {
    entry: Entry;
}

interface ReactionsInfo {
    type: 'post' | 'comment';
    id: number;
    reactions: Reactions;
    users: Users;
    selected_emoji: string;
    next_cursor: string;
}

type FetchMode = 'initial' | 'emoji' | 'append';

/**
 * Muestra información adicional sobre las reacciones de una entrada.
 */
export default function EntryListItemReactionsInfo({ entry }: Props) {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Emojis asociados a la entrada. Cada uno viene acompañado con
    // el total de reacciones hechas.
    const [emojiList, setEmojiList] = useState<Reaction[]>([]);

    // Usuarios que han reaccionado con "selectedEmoji".
    const [users, setUsers] = useState<User[]>([]);

    // Emoji del que se desea listar los usuarios que han reaccionado con él.
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

    // Cursor de paginación.
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Estados que controlan los iconos de cargando para la carga inicial,
    // los emojis y el botón cargar más.
    const [initialLoading, setInitialLoading] = useState(false);
    const [emojiLoading, setEmojiLoading] = useState(false);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    // Obtiene los emojis asociados a la entrada y los usuarios que han
    // reaccionado con el emoji seleccionado.
    const fetchReactions = ({ emoji, cursor, mode }: { emoji?: string; cursor?: string | null; mode: FetchMode }) => {
        if (mode === 'initial') setInitialLoading(true);
        if (mode === 'emoji') setEmojiLoading(true);
        if (mode === 'append') setLoadMoreLoading(true);

        router.get(
            route('reaction.index'),
            {
                type: entry.type,
                id: entry.id,
                emoji: emoji,
                cursor: nextCursor,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: (page) => {
                    const data = page.props.reactions_info as ReactionsInfo;

                    // Emojis solo se iniciaizan en la primera carga.
                    if (mode === 'initial') {
                        setEmojiList(data.reactions.data);
                    }

                    // Si se solicitó una página de usuarios, agrega
                    // los elementos. De lo contrario, inicializa el estado.
                    if (mode === 'append') {
                        setUsers((prev) => [...prev, ...data.users.data]);
                    } else {
                        setUsers(data.users.data);
                    }

                    setSelectedEmoji(data.selected_emoji);
                    setNextCursor(data.next_cursor);
                },
                onFinish: () => {
                    if (mode === 'initial') setInitialLoading(false);
                    if (mode === 'emoji') setEmojiLoading(false);
                    if (mode === 'append') setLoadMoreLoading(false);
                },
            },
        );
    };

    // Cambia el emoji seleccionado.
    const changeEmoji = (emoji: string) => {
        if (emoji === selectedEmoji) {
            return;
        }

        fetchReactions({ emoji, mode: 'emoji' });
    };

    // Carga más usuarios.
    const loadMore = () => {
        fetchReactions({
            emoji: selectedEmoji!,
            cursor: nextCursor,
            mode: 'append',
        });
    };

    useEffect(() => {
        // Carga inicial.
        fetchReactions({ mode: 'initial' });
    }, []);

    return (
        <div className="my-3 flex max-h-[70vh] min-h-64 flex-col">
            {initialLoading ? (
                <>
                    {/* Icono cargando para la carga inicial */}
                    <div className="flex flex-1 items-center justify-center">
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-label={t('loading')} />
                    </div>
                </>
            ) : (
                <div className="flex h-full gap-4">
                    {/* Columna izquierda de emojis */}
                    <div className="min-w-[120px] space-y-2 border-r pr-3">
                        {emojiList.map((reaction) => (
                            <button
                                key={reaction.emoji}
                                onClick={() => changeEmoji(reaction.emoji)}
                                className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-sm ${
                                    reaction.emoji === selectedEmoji ? 'bg-muted font-semibold' : 'hover:bg-muted'
                                }`}
                            >
                                <span>{reaction.emoji}</span>
                                <span className="text-muted-foreground">{reaction.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Columna derecha */}
                    <div className="flex flex-1 flex-col gap-3">
                        {emojiLoading ? (
                            <>
                                {/* Icono cargando para la lista de usuarios */}
                                <div className="flex flex-1 items-center justify-center">
                                    <LoaderCircle className="h-4 w-4 animate-spin" aria-label={t('loading')} />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Usuarios */}
                                <div className="flex flex-1 flex-col overflow-y-auto">
                                    {users.map((user) => (
                                        <div key={user.id} className="flex items-center gap-3">
                                            <UserAvatar className="h-10 w-10" user={user} />
                                            <span>{user.username}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Botón cargar más usuarios */}
                                {nextCursor && (
                                    <Button variant="outline" onClick={loadMore} className="text-sm" disabled={loadMoreLoading}>
                                        {loadMoreLoading ? (
                                            <>
                                                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden={true} /> {t('loading')}
                                            </>
                                        ) : (
                                            t('load_more')
                                        )}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
