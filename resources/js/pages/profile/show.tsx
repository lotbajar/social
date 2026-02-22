import EntryForm from '@/components/app/entry-form';
import EntryList from '@/components/app/entry-list';
import ListLoadMore from '@/components/app/list-load-more';
import ProfileHeader from '@/components/app/profile-header';
import { Tooltip } from '@/components/app/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EntryListUpdateContext } from '@/contexts/entry-list-update-context';
import { usePaginatedData } from '@/hooks/app/use-paginated-data';
import AppLayout from '@/layouts/kit/app-layout';
import { AppContentLayout } from '@/layouts/kit/app/app-content-layout';
import type { Auth, BreadcrumbItem, Post, Posts, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Vista que muestra el perfil público de un usuario,
 * junto con su listado de publicaciones.
 */
export default function ProfileShow() {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura el usuario autenticado, el usuario del perfil
    // y la lista de publicaciones proporcionados por Inertia.
    const { auth, user, posts } = usePage<{ auth: Auth; user: User; posts: Posts }>().props;

    // Determina el filtro de las publicaciones según el parámetro de la ruta.
    const filter = route().params.posts === 'others' ? 'others' : 'own';

    // Determina si el usuario autenticado tiene permiso para publicar.
    const canPost = auth.user && auth.user.permissions.includes('post');

    // Determina si el usuario autenticado está visitando su propio perfil y
    // tiene permiso para publicar.
    const isOwner = auth.user && auth.user.id === user.id && canPost;

    // ID del usuario del perfil en el que se publica si no es el propietario.
    const profileUserId = !isOwner && canPost ? user.id : null;

    // Usa el hook de paginación para gestionar las publicaciones del perfil.
    const {
        items: entries, // Lista actual de publicaciones visibles.
        nextCursor, // Cursor para solicitar la siguiente página de publicaciones.
        processing, // Indica si se está cargando más contenido.
        loadMore, // Función para cargar más publicaciones.
        applyItemChange, // Función para sincronizar cambios en el listado.
    } = usePaginatedData<Post>({
        initialItems: posts.data, // Publicaciones iniciales cargadas desde el servidor.
        initialCursor: posts.meta.next_cursor, // Cursor inicial de paginación.
        propKey: 'posts', // Propiedad de la respuesta de Inertia que contiene los datos.
        insertAtStart: true, // Indica que los nuevos elementos deben agregarse al inicio de la lista.
    });

    // Maneja el cambio de estado del filtro y recarga la vista
    // pasando el nuevo estado por la URL.
    const handleFilterChange = (value: string) => {
        router.get(route('profile.show', user.username), { posts: value }, { preserveScroll: true });
    };

    // Migas de pan de la vista actual.
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('user_profile', { username: user.username }),
            href: route('profile.show', user.username),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Título del documento */}
            <Head title={t('user_profile', { username: user.username })} />

            <AppContentLayout>
                {/* Encabezado del perfil del usuario */}
                <ProfileHeader user={user} />

                {/* Contexto para sincronizar cambios en el listado de publicaciones */}
                <EntryListUpdateContext.Provider value={applyItemChange}>
                    {/* Formulario para crear publicaciones */}
                    {(isOwner || canPost) && <EntryForm profileUserId={profileUserId} />}

                    {/* Filtro de publicaciones del perfil */}
                    {auth.user && (
                        <Tabs value={filter} onValueChange={handleFilterChange}>
                            <TabsList>
                                <TabsTrigger value="own">{t('own_posts', { username: user.username })}</TabsTrigger>
                                <TabsTrigger value="others">
                                    {t('others_posts')}
                                    <Tooltip content={t('private_posts')}>
                                        <span className="text-muted-foreground">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                    </Tooltip>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}

                    {/* Listado de publicaciones del perfil */}
                    <EntryList entries={entries} />
                </EntryListUpdateContext.Provider>

                {/* Botón para cargar más publicaciones */}
                <ListLoadMore type="post" cursor={nextCursor} isProcessing={processing} onClick={loadMore} />
            </AppContentLayout>
        </AppLayout>
    );
}
