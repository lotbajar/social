import EntryForm from '@/components/app/entry-form';
import EntryList from '@/components/app/entry-list';
import ListLoadMore from '@/components/app/list-load-more';
import { EntryListUpdateContext } from '@/contexts/entry-list-update-context';
import { useCheckPermission } from '@/hooks/app/use-auth';
import { usePaginatedData } from '@/hooks/app/use-paginated-data';
import AppLayout from '@/layouts/kit/app-layout';
import { AppContentLayout } from '@/layouts/kit/app/app-content-layout';
import type { Auth, BreadcrumbItem, Post, Posts } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

/**
 * Vista principal que muestra el feed de publicaciones del usuario autenticado.
 */
export default function HomeIndex() {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura el usuario autenticado y la lista de publicaciones
    // proporcionados por Inertia.
    const { auth, posts } = usePage<{ auth: Auth; posts: Posts }>().props;

    // Usa el hook de paginación para gestionar el feed de publicaciones.
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

    // Migas de pan de la vista actual.
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('home'),
            href: route('home.index'),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Título del documento */}
            <Head title={t('home')} />

            <AppContentLayout>
                {/* Contexto para sincronizar cambios en el feed de publicaciones */}
                <EntryListUpdateContext.Provider value={applyItemChange}>
                    {/* Formulario para crear una nueva publicación */}
                    {useCheckPermission('post') && <EntryForm />}

                    {/* Listado de publicaciones del feed */}
                    <EntryList entries={entries} />
                </EntryListUpdateContext.Provider>

                {/* Botón para cargar más publicaciones */}
                <ListLoadMore type="post" cursor={nextCursor} isProcessing={processing} onClick={loadMore} />
            </AppContentLayout>
        </AppLayout>
    );
}
