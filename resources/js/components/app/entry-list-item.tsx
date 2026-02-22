import { formatDate } from '@/lib/utils';
import type { Auth, Entry, Post } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { formatDistanceToNow, Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { Globe, Lock, MessageSquare, MessageSquareLock, Users } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import TextLink from '../kit/text-link';
import { buttonVariants } from '../ui/button';
import EntryItemOptions from './entry-list-item-options';
import EntryListItemReactions from './entry-list-item-reactions';
import RichTextRenderer from './rich-text-renderer';
import { Tooltip } from './tooltip';
import UserAvatar from './user-avatar';
import UserRoleBadge from './user-role-badge';

interface EntryListItemProps {
    // Entrada a mostrar, puede ser una publicación o un comentario.
    entry: Entry;
}

// Tipo auxiliar que garantiza una visibilidad válida.
type PostVisibility = NonNullable<Post['visibility']>;

/**
 * Entrada (publicación o comentario).
 */
export default function EntryListItem({ entry }: EntryListItemProps) {
    // Funciones de traducción y acceso al idioma actual.
    const { i18n, t } = useTranslation();

    // Relación entre idioma y configuración regional de fechas.
    const localeMap: Record<string, Locale> = {
        en: enUS,
        es,
    };

    // Selecciona la configuración regional según el idioma activo.
    const locale = localeMap[i18n.currentLang] ?? enUS;

    // Captura el usuario autenticado y nombre de la ruta actual proporcionados por Inertia.
    const { auth, routeName } = usePage<{ auth: Auth; routeName: string }>().props;

    // Icono y mensaje de visibilidad según la configuración de la publicación.
    const visibilityConfig = {
        public: {
            icon: Globe,
            message: t('visible_to_all', { username: entry.user.username }),
        },
        following: {
            icon: Users,
            message: t('visible_to_user_following', { username: entry.user.username }),
        },
        private: {
            icon: Lock,
            message: t('visible_to_user_only', { username: entry.user.username }),
        },
    };

    // Obtiene el contexto de visibilidad para mostrar el icono
    // y mensaje correcto.
    const getVisibilityContext = () => {
        const isPrivateMessage = entry.type === 'post' && entry.profile_user_id !== null;

        if (isPrivateMessage) {
            return {
                icon: MessageSquareLock,
                message: t('visible_to_author_and_profile_owner', {
                    author_username: entry.user.username,
                    profile_owner_username: (entry as Post).profile_owner?.username,
                }),
            };
        }

        if (entry.type === 'post') {
            return visibilityConfig[entry.visibility as PostVisibility];
        }

        return null;
    };

    // Tiempo relativo desde la creación de la entrada.
    const distanceToNow = formatDistanceToNow(new Date(entry.created_at), {
        addSuffix: true,
        locale,
    });

    return (
        <article className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border px-6 py-6 shadow-sm">
            <header className="flex gap-4">
                <div className="flex flex-1 items-center justify-center gap-3">
                    {/* Avatar del autor */}
                    <UserAvatar user={entry.user} />

                    <div className="flex flex-1 flex-col">
                        {/* Nombre de usuario y rol del autor */}
                        <div className="flex items-center font-semibold">
                            <Link href={route('profile.show', entry.user.username)}>{entry.user.username}</Link>
                            <UserRoleBadge role={entry.user.role} />
                        </div>

                        {/* Perfil en el que se publicó */}
                        {entry.type === 'post' && ['home.index', 'post.show'].includes(routeName) && entry.profile_owner && (
                            <div className="text-sm">
                                <Trans i18nKey="posted_on_profile" values={{ username: entry.profile_owner.username }}>
                                    <TextLink
                                        href={route('profile.show', entry.profile_owner.username)}
                                        tabIndex={5}
                                        className="font-semibold no-underline"
                                    ></TextLink>
                                </Trans>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                    {/* Visibilidad de la publicación */}
                    {entry.type === 'post' &&
                        (() => {
                            const context = getVisibilityContext();

                            if (!context) return null;

                            const { icon: Icon, message: visibilityMessage } = context;

                            return (
                                <Tooltip content={visibilityMessage}>
                                    <span className="text-muted-foreground">
                                        <Icon className="h-4 w-4" />
                                    </span>
                                </Tooltip>
                            );
                        })()}

                    {/* Fecha de creación con enlace a la entrada */}
                    <div className="flex gap-4 text-sm">
                        <Link
                            href={
                                entry.type === 'post'
                                    ? route('post.show', entry.id)
                                    : route('post.comment.show', { post: entry.post_id, comment: entry.id })
                            }
                            title={formatDate(entry.created_at)}
                        >
                            <time dateTime={entry.created_at}>{distanceToNow}</time>
                        </Link>
                    </div>

                    {/* Opciones disponibles para los usuarios autenticados */}
                    {auth.user && (
                        <div>
                            <EntryItemOptions entry={entry} />
                        </div>
                    )}
                </div>
            </header>

            {/* Contenido principal de la entrada */}
            <RichTextRenderer entryType={entry.type} text={entry.content} />

            <footer className="flex gap-4">
                {/* Reacciones de la entrada */}
                <EntryListItemReactions entry={entry} />

                {/* Enlace a los comentarios cuando es una publicación */}
                {entry.type === 'post' && routeName !== 'post.show' && (
                    <div className="ml-auto">
                        <Link href={`/post/${entry.id}#comment-form`} className={buttonVariants({ variant: 'outline' })} title={t('comment')}>
                            {(entry as Post).comments_count} <MessageSquare />
                        </Link>
                    </div>
                )}
            </footer>
        </article>
    );
}
