import { Button } from '@/components/ui/button';
import { EntryListUpdateContext } from '@/contexts/entry-list-update-context';
import { usePostVisibility } from '@/hooks/app/use-post-visibility';
import type { Auth, Comment, Entry, Post } from '@/types';
import { SpecialPages } from '@/types/modules/page';
import { useForm, usePage } from '@inertiajs/react';
import { Globe, LoaderCircle, Lock, Settings2, Users } from 'lucide-react';
import { SubmitEventHandler, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '../ui/field';
import { Switch } from '../ui/switch';
import FormErrors from './form-errors';
import RichTextRenderer from './rich-text-renderer';
import RichTextToolbar from './rich-text-toolbar';

interface EntryFormProps {
    entry?: Entry; // Una entrada existente (publicación o comentario).
    postId?: number; // ID de una publicación al crear un comentario.
    onSubmit?: () => void; // Función que se llama tras el envío exitoso del formulario.
    profileUserId?: null | number; // ID del usuario del perfil en el que se publica.
}

// Tipo auxiliar que garantiza una visibilidad válida.
type PostVisibility = NonNullable<Post['visibility']>;

/**
 * Formulario para crear o editar una entrada (publicación o comentario).
 */
export default function EntryForm({ profileUserId = null, entry, postId, onSubmit }: EntryFormProps) {
    // Funciones de traducción y acceso al idioma actual.
    const { t, i18n } = useTranslation();

    // Captura el usuario autenticado y las páginas estáticas
    // especiales proporcionados por Inertia.
    const { auth, specialPages, routeName } = usePage<{ auth: Auth; specialPages: SpecialPages; routeName: string }>().props;

    // Referencia al elemento textarea del formulario.
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Determina el tipo de formulario según el contexto.
    const formType = entry ? (entry.type === 'post' ? 'post' : 'comment') : postId ? 'comment' : 'post';

    // Almacena la entrada retornada tras el envío del formulario.
    const [entryFromResponse, setEntryFromResponse] = useState<Entry>();

    // Estado para alternar vista previa.
    const [previewMode, setPreviewMode] = useState(false);

    // Referencia para almacenar la posición del cursor en el textarea.
    const selectionRef = useRef<{ start: number; end: number } | null>(null);

    // Opciones de visibilidad para las publicaciones.
    const visibilityOptions = {
        public: {
            icon: Globe,
            label: 'public',
            description: 'anyone_can_see_your_post',
        },
        following: {
            icon: Users,
            label: 'following',
            description: 'only_users_you_follow_can_see_your_post',
        },
        private: {
            icon: Lock,
            label: 'private',
            description: 'only_you_can_see_your_post',
        },
    };

    // Hook para gestionar la visibilidad de una publicación.
    const { visibility, changeVisibility, isCreatePost } = usePostVisibility({
        formType,
        entry: entry as Post | undefined,
        profileUserId,
    });

    // Hook para gestionar datos del formulario, errores y estados.
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        content: '',
        visibility,
        profile_user_id: profileUserId,
        is_closed: formType === 'post' ? (entry ? (entry as Post).is_closed : false) : null,
    });

    // Contexto para notificar cambios en la lista de entradas.
    const updateEntryList = useContext(EntryListUpdateContext);

    // Gestiona el envío del formulario.
    const submitForm: SubmitEventHandler<HTMLFormElement> = (e) => {
        // Determina la acción según si es edición o creación.
        const action = entry ? patch : post;

        // Genera la ruta correspondiente según el tipo de entrada y acción.
        const url = entry
            ? route(entry.type === 'post' ? 'post.update' : 'comment.update', entry.type === 'post' ? { post: entry.id } : { comment: entry.id })
            : route(postId ? 'comment.store' : 'post.store', postId ? { post: postId } : undefined);

        action(url, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Obtiene la entrada creada o actualizada desde la respuesta.
                const pageProp = formType === 'post' ? (page.props.post as Post) : (page.props.comment as Comment);

                // Guarda la entrada para notificar al contexto.
                setEntryFromResponse(pageProp);

                // Limpia el contenido del formulario.
                setData('content', '');
            },
            onError: (errors) => {
                toast.error(t('unexpected_error'));

                if (import.meta.env.DEV) {
                    console.error(errors);
                }
            },
        });

        e.preventDefault();
    };

    // Notifica al contexto cuando se recibe una nueva entrada.
    useEffect(() => {
        if (entryFromResponse) {
            const action = entry ? 'update' : 'create';

            // Informa al contexto del cambio realizado.
            updateEntryList?.(action, entryFromResponse);

            // Ejecuta el callback externo si existe.
            onSubmit?.();
        }
    }, [entryFromResponse]);

    // Precarga el contenido cuando se edita una entrada existente.
    useEffect(() => {
        if (entry) {
            setData('content', entry.content);

            if (formType === 'post') {
                setData('visibility', (entry as Post).visibility ?? 'public');
            }
        }
    }, [entry]);

    // Guarda la visibilidad de la publicación en el formulario.
    useEffect(() => {
        if (formType === 'post') {
            setData('visibility', visibility);
        }
    }, [visibility]);

    // Restaura la posición del cursor al cambiar entre vista previa y edición.
    useEffect(() => {
        if (!previewMode && textareaRef.current && selectionRef.current) {
            const { start, end } = selectionRef.current;

            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start, end);
        }
    }, [previewMode]);

    return (
        <>
            {previewMode ? (
                <div className="flex flex-col gap-2">
                    {/* Vista previa del contenido formateado */}
                    <div className="bg-card text-card-foreground rounded-xl border px-6 py-6 shadow-sm">
                        <RichTextRenderer entryType={formType} text={data.content} alwaysExpanded={true} disableLinks={true} />
                    </div>

                    {/* Botón para volver al modo edición */}
                    <Button variant="outline" className="ml-auto" onClick={() => setPreviewMode(false)}>
                        {t('back_to_edit')}
                    </Button>
                </div>
            ) : (
                <form onSubmit={submitForm} className="space-y-3">
                    {/* Errores de validación del formulario */}
                    <FormErrors errors={errors} />

                    {/* Barra de herramientas de formato */}
                    <RichTextToolbar
                        user={entry ? entry.user : auth.user}
                        text={data.content}
                        onChange={(val) => setData('content', val)}
                        textareaRef={textareaRef}
                    />

                    {/* Campo de texto principal */}
                    <TextareaAutosize
                        ref={textareaRef}
                        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        minRows={1}
                        maxRows={10}
                        value={data.content}
                        onChange={(e) => setData('content', e.target.value)}
                        disabled={processing}
                        placeholder={t('whats_on_your_mind')}
                        maxLength={3000}
                    />

                    <div className="flex items-center gap-4">
                        {/* Enlace a las normas de la comunidad */}
                        <div className="text-muted-foreground flex-1 text-sm hover:underline">
                            {specialPages[auth.user.language].guidelines && (
                                <a
                                    href={route('page.show', {
                                        lang: auth.user.language,
                                        slug: specialPages[i18n.currentLang].guidelines?.slug,
                                    })}
                                    target="_black"
                                >
                                    {t('community_guidelines')}
                                </a>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Opciones de configuración */}
                            {formType === 'post' && profileUserId === null && (!entry || (entry as Post).profile_user_id === null) && (
                                <>
                                    {/* Visibilidad de la publicación */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="data-[state=open]:bg-muted"
                                                title={t('post_visibility')}
                                            >
                                                {(() => {
                                                    const Icon = visibilityOptions[visibility!].icon;
                                                    return <Icon className="h-4 w-4" />;
                                                })()}
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end" className="w-72">
                                            <DropdownMenuRadioGroup
                                                value={visibility as PostVisibility}
                                                onValueChange={(value) => changeVisibility(value as PostVisibility)}
                                                className="flex flex-col gap-1"
                                            >
                                                {Object.entries(visibilityOptions).map(([key, option]) => {
                                                    const Icon = option.icon;

                                                    return (
                                                        <DropdownMenuRadioItem
                                                            key={key}
                                                            value={key}
                                                            className="data-[state=checked]:bg-muted flex items-start gap-3 py-3 pl-3 [&>span:first-child]:hidden"
                                                        >
                                                            <Icon className="text-muted-foreground mt-1 h-4 w-4" />

                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">{t(option.label)}</span>

                                                                <span className="text-muted-foreground text-xs">{t(option.description)}</span>
                                                            </div>
                                                        </DropdownMenuRadioItem>
                                                    );
                                                })}
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Configuración de la publicación */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="data-[state=open]:bg-muted"
                                                title={t('post_settings')}
                                            >
                                                <Settings2 className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>

                                        <DropdownMenuContent align="end" className="w-72">
                                            <FieldLabel htmlFor="is-closed" className="border-none">
                                                <Field orientation="horizontal">
                                                    <FieldContent>
                                                        <FieldTitle>{t('comments')}</FieldTitle>
                                                        <FieldDescription>
                                                            {t(data.is_closed ? 'comments_disabled' : 'comments_enabled')}
                                                        </FieldDescription>
                                                    </FieldContent>
                                                    <Switch
                                                        id="is-closed"
                                                        checked={!Boolean(data.is_closed)}
                                                        onCheckedChange={(checked) => setData('is_closed', !checked)}
                                                    />
                                                </Field>
                                            </FieldLabel>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}

                            {/* Botón para activar la vista previa */}
                            {data.content.trim().length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (textareaRef.current) {
                                            selectionRef.current = {
                                                start: textareaRef.current.selectionStart,
                                                end: textareaRef.current.selectionEnd,
                                            };
                                        }
                                        setPreviewMode(true);
                                    }}
                                >
                                    {t('preview')}
                                </Button>
                            )}

                            {/* Botón de envío */}
                            <Button type="submit" disabled={processing || data.content.trim().length === 0}>
                                {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {formType === 'post' ? t('post') : t('comment')}
                            </Button>
                        </div>
                    </div>
                </form>
            )}
        </>
    );
}
