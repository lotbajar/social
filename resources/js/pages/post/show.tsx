import EntryForm from '@/components/app/entry-form';
import EntryList from '@/components/app/entry-list';
import EntryListItem from '@/components/app/entry-list-item';
import ListLoadMore from '@/components/app/list-load-more';
import { EntryListUpdateContext } from '@/contexts/entry-list-update-context';
import { useCheckPermission } from '@/hooks/app/use-auth';
import { usePaginatedData } from '@/hooks/app/use-paginated-data';
import AppLayout from '@/layouts/kit/app-layout';
import { AppContentLayout } from '@/layouts/kit/app/app-content-layout';
import type { Auth, BreadcrumbItem, Comment, Comments, Post } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Vista que muestra una publicación individual junto con su hilo de comentarios.
 */
export default function PostShow() {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura el usuario autenticado, la publicación
    // y los comentarios proporcionados por Inertia.
    const { routeName, auth, post, comments } = usePage<{ auth: Auth; post: Post; comments: Comments }>().props;

    // Referencia a la sección de comentarios.
    const commentsRef = useRef<HTMLElement>(null);

    // Usa el hook de paginación para gestionar el hilo de comentarios.
    const {
        items: entries, // Lista actual de comentarios visibles.
        nextCursor, // Cursor para solicitar la siguiente página de comentarios.
        processing, // Indica si se está cargando más contenido.
        loadMore, // Función para cargar más comentarios.
        applyItemChange, // Función para sincronizar cambios en el hilo.
    } = usePaginatedData<Comment>({
        initialItems: comments.data, // Comentarios iniciales cargados desde el servidor.
        initialCursor: comments.meta.next_cursor, // Cursor inicial de paginación.
        propKey: 'comments', // Propiedad de la respuesta de Inertia que contiene los datos.
    });

    // Determina si la vista corresponde a un hilo parcial (acceso directo a un comentario).
    const isPartialView = routeName === 'post.comment.show';

    // Autor de la publicación.
    const isAuthor = auth.user && auth.user.id === post.user.id;

    // Verifica si el usuario autenticado tiene permisos de moderación.
    const canModerate = auth.user && ['admin', 'mod'].includes(auth.user.role);

    // Determina si el usuario autenticado puede comentar.
    const canComment = (auth.user && (isAuthor || (useCheckPermission('comment') && !post.is_closed) || canModerate)) || false;

    // Migas de pan de la vista actual.
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('user_profile', { username: post.user.username }),
            href: route('profile.show', post.user.username),
        },
        {
            title: t('single_post'),
            href: route('post.show', post.id),
        },
    ];

    // Desplaza automáticamente a la sección de comentarios
    // cuando se accede a un hilo parcial.
    useEffect(() => {
        if (isPartialView && commentsRef.current) {
            commentsRef.current.scrollIntoView();
        }
    }, [isPartialView]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Título del documento */}
            <Head title={t('post_by_user', { username: post.user.username })} />

            <AppContentLayout>
                <article className="flex flex-col gap-8">
                    {/* Publicación principal */}
                    <EntryListItem entry={post} />

                    {/* Sección de comentarios */}
                    <section id="comments" ref={commentsRef} className="flex flex-col gap-8">
                        {/* Contexto para sincronizar cambios en el listado de comentarios */}
                        <EntryListUpdateContext.Provider value={applyItemChange}>
                            {/* Encabezado y listado de comentarios */}
                            {post.comments_count > 0 && (
                                <>
                                    {/* Encabezado del listado de comentarios */}
                                    <div className="flex items-center gap-2">
                                        {/* Número de comentarios */}
                                        <h2>{t('total_comments', { total: post.comments_count })}</h2>

                                        {/* Indicador de hilo parcial */}
                                        {isPartialView && (
                                            <>
                                                <span className="text-muted-foreground text-sm">({t('partial')})</span>
                                                <Link href={route('post.show', post.id)} className="text-sm text-blue-600 hover:underline">
                                                    {t('see_full_thread')}
                                                </Link>
                                            </>
                                        )}
                                    </div>

                                    {/* Listado de comentarios */}
                                    <EntryList entries={entries} />

                                    {/* Botón para cargar más comentarios */}
                                    <ListLoadMore type="comment" cursor={nextCursor} isProcessing={processing} onClick={loadMore} autoClick={false} />
                                </>
                            )}

                            {/* Formulario para añadir un nuevo comentario */}
                            {post.is_closed && (
                                <div className="bg-muted text-muted-foreground border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                                    <Lock className="h-4 w-4" />
                                    <span>{t('comments_closed')}</span>
                                </div>
                            )}
                            {canComment && <EntryForm postId={post.id} />}
                        </EntryListUpdateContext.Provider>
                    </section>
                </article>
            </AppContentLayout>
        </AppLayout>
    );
}
