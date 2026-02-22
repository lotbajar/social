import type { Post } from '@/types';
import { useEffect, useState } from 'react';

interface UsePostVisibilityParams {
    formType: 'post' | 'comment'; // Tipo de formulario.
    entry?: Post; // El registro de una publicación.
    profileUserId: number | null; // ID del usuario del perfil en el que se publica.
}

// Clave en el almacenamiento local para guardar la visibilidad seleccionada.
const storageKey = 'post:create:visibility';

export function usePostVisibility({ formType, entry, profileUserId }: UsePostVisibilityParams) {
    // Determina si el formulario corresponde a la creación de una publicación.
    const isCreatePost = formType === 'post' && !entry && profileUserId === null;

    // Estado de visibilidad: se inicializa desde la entrada (edición),
    // desde localStorage (creación) o con un valor por defecto.
    const [visibility, setVisibility] = useState<Post['visibility']>(() => {
        if (!isCreatePost) {
            return entry?.visibility ?? null;
        }

        return (localStorage.getItem(storageKey) as Post['visibility']) ?? 'public';
    });

    // Actualiza la visibilidad seleccionada.
    const changeVisibility = (visibility: Post['visibility']) => {
        setVisibility(visibility);
    };

    // Persiste la visibilidad solo durante la creación de publicaciones.
    useEffect(() => {
        if (isCreatePost && visibility) {
            localStorage.setItem(storageKey, visibility);
        }
    }, [visibility, isCreatePost]);

    return {
        visibility,
        changeVisibility,
        isCreatePost,
    };
}
