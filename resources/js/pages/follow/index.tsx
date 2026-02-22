import { FollowNav } from '@/components/app/follow-nav';
import ListLoadMore from '@/components/app/list-load-more';
import UserList from '@/components/app/user-list';
import { usePaginatedData } from '@/hooks/app/use-paginated-data';
import AppLayout from '@/layouts/kit/app-layout';
import { AppContentLayout } from '@/layouts/kit/app/app-content-layout';
import type { BreadcrumbItem, User, Users } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

interface PageProps {
    user: User; // Usuario del perfil visitado.
    following: Users; // Lista de usuarios seguidos.
    followers: Users; // Lista de usuarios seguidores.
    routeName: string; // Nombre de la ruta actual.
    [key: string]: any;
}

/**
 * Vista que muestra el listado de usuarios seguidos o seguidores de un perfil.
 */
export default function FollowIndex() {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura las propiedades de la página proporcionadas por Inertia.
    const { user, following, followers, routeName } = usePage<PageProps>().props;

    // Determina si la vista corresponde a "seguidos" o "seguidores".
    const pageName = routeName === 'follow.following' ? 'following' : 'followers';

    // Usa el hook de paginación para gestionar el listado de usuarios.
    const {
        items: users, // Lista actual de usuarios visibles.
        nextCursor, // Cursor para solicitar la siguiente página de usuarios.
        processing, // Indica si se está cargando más contenido.
        loadMore, // Función para cargar más usuarios.
    } = usePaginatedData<User>({
        // Selecciona dinámicamente los datos iniciales según la vista.
        initialItems: pageName === 'following' ? following.data : followers.data,

        // Cursor inicial según el tipo de listado.
        initialCursor: pageName === 'following' ? following.meta.next_cursor : followers.meta.next_cursor,

        // Propiedad de la respuesta de Inertia que contiene los datos.
        propKey: 'users',
    });

    // Migas de pan de la vista actual.
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('user_profile', { username: user.username }),
            href: route('profile.show', { user: user.username }),
        },
        {
            title: pageName === 'following' ? t('following') : t('followers'),
            href: route(routeName, { user: user.username }),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Título del documento */}
            <Head
                title={`${pageName === 'following' ? t('user_following', { username: user.username }) : t('user_followers', { username: user.username })} ${user.username}`}
            />

            <AppContentLayout>
                {/* Navegación entre seguidores y seguidos */}
                <FollowNav pageName={pageName} username={user.username} />

                {/* Listado de usuarios */}
                <UserList users={users} />

                {/* Botón para cargar más usuarios */}
                <ListLoadMore type="user" cursor={nextCursor} isProcessing={processing} onClick={loadMore} />
            </AppContentLayout>
        </AppLayout>
    );
}
