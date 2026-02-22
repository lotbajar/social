import type { Auth, Entry } from '@/types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { router, usePage } from '@inertiajs/react';
import { SmilePlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';

interface EntryListItemReactionsProps {
    // Entrada (publicación o comentario) sobre la que se pueden aplicar reacciones.
    entry: Entry;
}

/**
 * Gestiona y muestra las reacciones de una entrada.
 */
export default function EntryListItemReactions({ entry }: EntryListItemReactionsProps) {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura el usuario autenticado proporcionado por Inertia.
    const { auth } = usePage<{ auth: Auth }>().props;

    // Lista local de reacciones asociadas a la entrada.
    const [reactions, setReactions] = useState(entry.reactions || []);

    // Controla la visibilidad del selector de emojis.
    const [showPicker, setShowPicker] = useState(false);

    // Referencia al contenedor del selector para detectar clics externos.
    const pickerRef = useRef<HTMLDivElement>(null);

    // Alterna una reacción del usuario autenticado.
    const toggleReaction = (emoji: string) => {
        router.put(
            route('reaction.toggle'),
            { type: entry.type, id: entry.id, emoji },
            {
                preserveScroll: true,

                // Actualiza el estado local tras una reacción exitosa.
                onSuccess: () => {
                    setReactions((prev) => {
                        // Reacción previa del usuario, si existe.
                        const previousReaction = prev.find((r) => r.reactedByUser);

                        // Determina si está repitiendo la misma reacción.
                        const isSame = previousReaction?.emoji === emoji;

                        // Si se repite la misma reacción, se elimina.
                        // Disminuye el conteo del emoji o lo elimina si llega a cero.
                        if (previousReaction && isSame) {
                            return prev
                                .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, reactedByUser: false } : r))
                                .filter((r) => r.count > 0);
                        }

                        // Como es una reacción nueva, elimina cualquier
                        // reacción previa del usuario.
                        let updated = prev
                            .map((r) => {
                                if (previousReaction && r.emoji === previousReaction.emoji) {
                                    return { ...r, count: r.count - 1, reactedByUser: false };
                                }
                                return r;
                            })
                            .filter((r) => r.count > 0);

                        // Determina si ya alguien ha reaccionado con el mismo emoji.
                        const existing = updated.find((r) => r.emoji === emoji);

                        // Incrementa el conteo si la reacción ya existe.
                        if (existing) {
                            return updated.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, reactedByUser: true } : r));
                        }

                        // Agrega una nueva reacción si no existe.
                        return [...updated, { emoji, count: 1, reactedByUser: true }];
                    });
                },

                onError: (errors) => {
                    toast.error(errors.message ?? t('unexpected_error'));

                    if (import.meta.env.DEV) {
                        console.error(errors);
                    }
                },
            },
        );
    };

    // Gestiona la selección de un emoji desde el selector.
    const handleSelect = (emoji: { native: string }) => {
        toggleReaction(emoji.native);
        setShowPicker(false);
    };

    // Cierra el selector cuando se hace clic fuera de él.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker]);

    return (
        <div className="relative flex gap-2">
            {/* Reacciones hechas en la entrada */}
            {reactions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {reactions.map(({ emoji, count, reactedByUser }) => (
                        <Button
                            key={emoji}
                            onClick={() => (auth.user ? toggleReaction(emoji) : false)}
                            className={reactedByUser ? 'bg-accent text-accent-foreground' : ''}
                            aria-label={reactedByUser ? t('remove_reaction') : t('react_with_emoji', { emoji })}
                            title={reactedByUser ? t('remove_reaction') : t('react_with_emoji', { emoji })}
                            variant="outline"
                        >
                            <span className="mr-1">{count}</span>
                            <span>{emoji}</span>
                        </Button>
                    ))}
                </div>
            )}

            {/* Botón para abrir el selector de emojis */}
            {auth.user && (
                <Button onClick={() => setShowPicker(!showPicker)} variant="outline" title={t('react')}>
                    <SmilePlus />
                </Button>
            )}

            {/* Selector de emojis */}
            {showPicker && (
                <div className="absolute z-50 mt-2" ref={pickerRef}>
                    <Picker data={data} onEmojiSelect={handleSelect} />
                </div>
            )}
        </div>
    );
}
