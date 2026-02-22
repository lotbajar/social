import ListLoadMore from '@/components/app/list-load-more';
import ReactionList from '@/components/app/reactions-list';
import { usePaginatedData } from '@/hooks/app/use-paginated-data';
import AppLayout from '@/layouts/kit/app-layout';
import { AppContentLayout } from '@/layouts/kit/app/app-content-layout';
import type { BreadcrumbItem, Comment, Post, Reactions, User, Users } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function ReactionsIndex() {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura la lista de reacciones y usuarios que reaccionaron
    // con el emoji seleccionado (selected_emoji).
    const { routeName, post, comment, reactions, users, selected_emoji } = usePage<{
        routeName: string;
        post: Post;
        comment: Comment | null;
        reactions: Reactions;
        users: Users;
        selected_emoji: string;
    }>().props;

    // Usa el hook de paginación para gestionar la lista de usuarios.
    const { items, nextCursor, processing, loadMore } = usePaginatedData<User>({
        initialItems: users.data,
        initialCursor: users.meta.next_cursor,
        propKey: 'users',
    });

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
        ...(routeName === 'comment.reaction.index'
            ? [
                  {
                      title: t('single_comment'),
                      href: route('post.comment.show', {
                          post: post.id,
                          comment: comment!.id,
                      }),
                  },
              ]
            : []),
        {
            title: t('reactions'),
            href: '#',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Título del documento */}
            <Head title={t('reactions')} />

            <AppContentLayout>
                {/* Título principal */}
                <h2 className="text-2xl font-bold">{t('reactions')}</h2>

                {/* Lista de reacciones */}
                <ReactionList reactions={reactions.data} users={users.data} selectedEmoji={selected_emoji} isLoading={processing} />

                {/* Botón para cargar más publicaciones */}
                <ListLoadMore type="post" cursor={nextCursor} isProcessing={processing} onClick={loadMore} />
            </AppContentLayout>
        </AppLayout>
    );
}
