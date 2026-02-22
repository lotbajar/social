import type { EntryAction } from '@/types';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type WithId = {
    id: number | string;
};

interface UsePaginatedProps<T extends WithId> {
    initialItems: T[]; // Lista inicial de elementos.

    // Cursor inicial utilizado para solicitar la siguiente página.
    initialCursor: string | null;

    // Nombre de la propiedad devuelta por Inertia que contiene
    // los datos paginados (por ejemplo: "posts", "comments", "users").
    propKey: string;

    // Controla si los nuevos elementos se insertan al inicio o al final.
    insertAtStart?: boolean;
}

/**
 * Hook genérico para gestionar datos paginados por cursor
 * y sincronizar cambios individuales sobre la colección.
 */
export function usePaginatedData<T extends WithId>({ initialItems, initialCursor, propKey, insertAtStart = false }: UsePaginatedProps<T>) {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Estados que contienen la lista de elementos renderizados, el cursor
    // de paginación y un indicador que especifica si se está solicitando
    // una nueva página de datos al servidor.
    const [items, setItems] = useState<T[]>(initialItems);
    const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
    const [processing, setProcessing] = useState(false);

    /**
     * Solicita la siguiente página de resultados al servidor.
     */
    const loadMore = () => {
        setProcessing(true);

        router.reload({
            // Indica a Inertia que solo recargue la propiedad paginada,
            // evitando recalcular y reenviar el resto de la página.
            only: [propKey],

            // Envía el cursor de paginación como un header HTTP personalizado
            // para evitar el uso del parámetro "cursor" en la URL.
            headers: {
                'X-Cursor': nextCursor ?? '',
            },

            // Combina los elementos previos con los nuevos,
            // evitando duplicados por ID.
            onSuccess: (page) => {
                const pageData = (page.props as any)[propKey];
                const newItems: T[] = pageData?.data ?? [];
                const next = pageData?.meta.next_cursor ?? null;

                setItems((prev) => {
                    const newIds = new Set(newItems.map((item) => item.id));
                    const filteredPrev = prev.filter((item) => !newIds.has(item.id));
                    return [...filteredPrev, ...newItems];
                });

                setNextCursor(next);
            },
            onError: (errors) => {
                toast.error(t('unexpected_error'));

                if (import.meta.env.DEV) {
                    console.error(errors);
                }
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    /**
     * Aplica un cambio puntual sobre la colección actual:
     * creación, actualización o eliminación.
     */
    const applyItemChange = (action: EntryAction, item: T) => {
        setItems((prev) => {
            // Reemplaza el elemento existente por su versión actualizada.
            if (action === 'update') {
                const index = prev.findIndex((i) => i.id === item.id);

                if (index === -1) {
                    return prev;
                }

                const updated = [...prev];
                updated[index] = item;

                return updated;
            }

            // Elimina el elemento correspondiente según su ID.
            if (action === 'delete') {
                return prev.filter((i) => i.id !== item.id);
            }

            // Inserta un nuevo elemento al inicio o al final
            // de la colección.
            return insertAtStart ? [item, ...prev] : [...prev, item];
        });
    };

    /**
     * Reemplaza manualmente la lista completa de elementos.
     */
    const updateItems = (newItems: T[]) => {
        setItems(newItems);
    };

    /**
     * Restablece los elementos y el cursor a sus valores iniciales.
     */
    const resetProps = () => {
        setItems(initialItems);
        setNextCursor(initialCursor);
    };

    /**
     * Expone los valores y funciones necesarias para su consumo externo.
     */
    return {
        items,
        nextCursor,
        processing,
        loadMore,
        resetProps,
        updateItems,
        applyItemChange,
    };
}
