import { generateThumbnail } from '@/lib/utils';
import { User } from '@/types';
import { router } from '@inertiajs/react';
import {
    Bold,
    CaptionsOff,
    Code,
    EyeOff,
    Heading,
    Heading1,
    Heading2,
    History,
    Image,
    ImagePlus,
    Italic,
    Link,
    Link2,
    List,
    ListOrdered,
    LoaderCircle,
    Minus,
    PaintBucket,
    Quote,
    SquareCode,
    SquarePlay,
    Type,
    Upload,
} from 'lucide-react';
import React, { ChangeEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import MediaDialog from './media-dialog';
import { Tooltip } from './tooltip';

interface RichTextToolbarProps {
    user: User; // Usuario autenticado.

    text: string; // Contenido actual del editor de texto.

    // Función callback para actualizar el texto.
    onChange: (newText: string) => void;

    // Referencia al textarea controlado externamente.
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Barra de herramientas que permite aplicar formato al texto
 * utilizando sintaxis Markdown y directivas personalizadas.
 *
 * Opera directamente sobre un textarea externo mediante una referencia,
 * manipulando la selección de texto y la posición del cursor.
 */
export default function RichTextToolbar({ user, text, onChange, textareaRef }: RichTextToolbarProps) {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Estado para controlar el diálogo de selección de archivos multimedia.
    const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);

    // Modo de inserción multimedia.
    const [mediaMode, setMediaMode] = useState<'image' | 'video' | null>(null);

    /**
     * Obtiene la selección actual del textarea.
     * Retorna las posiciones de inicio y fin junto con el texto seleccionado.
     */
    function getSelection() {
        const textarea = textareaRef.current;

        if (!textarea) return null;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (start == null || end == null) return null;

        return { start, end, value: textarea.value.substring(start, end) };
    }

    /**
     * Reemplaza el texto seleccionado por el contenido indicado
     * y reposiciona el cursor de forma controlada.
     */
    function replaceSelection(replacement: string, moveCursorOffset = 0): void {
        const textarea = textareaRef.current;

        if (!textarea) return;

        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = before + replacement + after;

        onChange(newText);

        // Reposiciona el cursor después de que React actualice el estado.
        requestAnimationFrame(() => {
            textarea.focus();
            const newPos = start + replacement.length + moveCursorOffset;
            textarea.setSelectionRange(newPos, newPos);
        });
    }

    /**
     * Aplica una transformación si existe selección,
     * o inserta un texto de respaldo en caso contrario.
     */
    function applyOrInsert({ fnWhenSelected, fallback }: { fnWhenSelected: (selected: string) => string; fallback: string }): void {
        const sel = getSelection();

        if (sel && sel.start !== sel.end) {
            replaceSelection(fnWhenSelected(sel.value));
        } else {
            replaceSelection(fallback);
        }
    }

    /**
     * Gestiona la inserción de enlaces.
     */
    const [linkData, setLinkData] = useState({ text: '', url: '' });

    function applyLink(): void {
        const sel = getSelection();
        const selectedIsUrl = sel && /^https?:\/\//i.test(sel.value);
        const defaultText = sel && !selectedIsUrl ? sel.value : 'example';
        const textToUse = linkData.text.trim() || defaultText;
        const urlToUse = linkData.url.trim() || 'https://example.com';
        replaceSelection(`[${textToUse}](${urlToUse})`);
        setLinkData({ text: '', url: '' });
    }

    /**
     * Sube un archivo multimedia.
     */
    async function uploadMedia(
        file: File,
        {
            onStart,
            onSuccess,
            onFinish,
        }: {
            onStart: () => void;
            onSuccess: (url: string) => void;
            onFinish: () => void;
        },
    ): Promise<void> {
        const formData = new FormData();

        formData.append('file', file);

        if (file.type.startsWith('video/')) {
            const thumbnail = await generateThumbnail(file);

            if (thumbnail) {
                formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
            }
        }

        onStart();

        router.post(route('media.store'), formData, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,

            onSuccess: (page) => {
                const mediaUrl = page.props.media_url as string;

                if (!mediaUrl) {
                    toast.error(t('upload_failed'));
                    return;
                }

                onSuccess(mediaUrl);
            },

            onError: (errors) => {
                const firstError = Object.values(errors)[0];

                toast.error(firstError ?? t('upload_failed'));

                if (import.meta.env.DEV) {
                    console.error(errors);
                }
            },

            onFinish,
        });
    }

    /**
     * Gestiona la inserción de imágenes.
     */

    // Atributos de la imagen.
    const [imageData, setImageData] = useState({ alt: '', url: '' });

    // Referencia del campo de archivo de imagen.
    const imgFileInputRef = useRef<HTMLInputElement | null>(null);

    // Indica si se está subiendo una imagen.
    const [isImgUploading, setIsImgUploading] = useState(false);

    // Inserta la imagen en el editor.
    function applyImage(): void {
        const sel = getSelection();
        const selectedIsUrl = sel && /^https?:\/\//i.test(sel.value);
        const defaultAlt = sel && sel.start !== sel.end && !selectedIsUrl ? sel.value : `${t('text')}`;
        const altToUse = imageData.alt.trim() || defaultAlt;
        const urlToUse = sel && selectedIsUrl ? sel.value : imageData.url.trim() || `${window.location.origin}/samples/cat.jpg`;
        replaceSelection(`\n![${altToUse}](${urlToUse})\n`);
        setImageData({ alt: '', url: '' });
    }

    // Sube una imagen al seleccionar un archivo.
    function onImgFileSelected(e: ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        uploadMedia(file, {
            onStart: () => setIsImgUploading(true),
            onSuccess: (url) =>
                setImageData((p) => ({
                    ...p,
                    url,
                })),
            onFinish: () => setIsImgUploading(false),
        });
    }

    /**
     * Gestiona la inserción de videos.
     */

    // Atributos del video.
    const [videoData, setVideoData] = useState({ url: '' });

    // Referencia del input de archivo de video.
    const videoFileInputRef = useRef<HTMLInputElement | null>(null);

    // Indica si se está subiendo un video.
    const [isVideoUploading, setIsVideoUploading] = useState(false);

    // Inserta el video en el editor.
    function applyVideo(): void {
        const sel = getSelection();
        const url = videoData.url.trim() || (sel ? sel.value : '');
        const finalUrl = url || `${window.location.origin}/samples/cat.mp4`;
        replaceSelection(`\n::video[${finalUrl}]\n`);
        setVideoData({ url: '' });
    }

    // Sube un video al seleccionar un archivo.
    function onVideoFileSelected(e: ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        uploadMedia(file, {
            onStart: () => setIsVideoUploading(true),
            onSuccess: (url) => setVideoData({ url }),
            onFinish: () => setIsVideoUploading(false),
        });
    }

    /**
     * Acciones básicas de formato.
     */

    // Inserta texto en negrita.
    const onBold = () => applyOrInsert({ fnWhenSelected: (s) => `**${s}**`, fallback: `**${t('text')}**` });

    // Inserta texto en cursiva.
    const onItalic = () => applyOrInsert({ fnWhenSelected: (s) => `*${s}*`, fallback: `*${t('text')}*` });

    // Inserta encabezados según el nivel indicado.
    function onHeading(level: number): void {
        applyOrInsert({
            fnWhenSelected: (s) => `\n${'#'.repeat(level)} ${s}\n`,
            fallback: `\n${'#'.repeat(level)} ${t('text')}\n`,
        });
    }

    // Inserta cita en bloque.
    const onQuote = () =>
        applyOrInsert({
            fnWhenSelected: (s) => `\n> ${s}\n\n`,
            fallback: `\n> ${t('text')}\n\n`,
        });

    // Inserta código en línea.
    const onInlineCode = () =>
        applyOrInsert({
            fnWhenSelected: (s) => `\`${s}\``,
            fallback: `\`${t('text')}\``,
        });

    // Inserta bloque de código.
    const onCodeBlock = () => {
        const sel = getSelection();
        const content = sel && sel.start !== sel.end ? sel.value : t('text');
        replaceSelection(`\n\`\`\`\n${content}\n\`\`\`\n`);
    };

    // Inserta lista ordenada.
    const onOrderedList = () => {
        const sel = getSelection();
        if (sel && sel.start !== sel.end) {
            const lines = sel.value.split(/\r?\n/);
            const replaced = lines.map((ln, i) => `${i + 1}. ${ln}`).join('\n');
            replaceSelection(`\n${replaced}\n\n`);
        } else {
            replaceSelection(`\n1. ${t('first_item')}\n2. ${t('second_item')}\n3. ${t('third_item')}\n\n`);
        }
    };

    // Inserta lista sin orden.
    const onUnorderedList = () => {
        const sel = getSelection();
        if (sel && sel.start !== sel.end) {
            const lines = sel.value.split(/\r?\n/);
            const replaced = lines.map((ln) => `- ${ln}`).join('\n');
            replaceSelection(`\n${replaced}\n\n`);
        } else {
            replaceSelection(`\n- ${t('first_item')}\n- ${t('second_item')}\n- ${t('third_item')}\n\n`);
        }
    };

    // Inserta texto oculto en línea.
    const onHiddenInline = () =>
        applyOrInsert({
            fnWhenSelected: (s) => `:hidden[${s}]`,
            fallback: `:hidden[${t('text')}]`,
        });

    // Inserta bloque de texto oculto.
    const onHiddenBlock = () => {
        const sel = getSelection();
        const content = sel && sel.start !== sel.end ? sel.value : t('text');
        replaceSelection(`\n:::hidden\n${content}\n:::\n`);
    };

    // Inserta separador horizontal.
    const onSeparator = () => replaceSelection('\n---\n');

    /**
     * Estilo de fuente.
     */

    // Mapas estáticos de estilos disponibles.
    const colors = {
        yellow: 'bg-yellow-400',
        blue: 'bg-blue-500',
        red: 'bg-red-500',
        green: 'bg-green-500',
        pink: 'bg-pink-400',
    } as const;

    const sizes = {
        small: 'text-sm',
        large: 'text-lg',
    } as const;

    // Aplica un color de fuente.
    function onColorSelected(key: keyof typeof colors): void {
        const sel = getSelection();
        const content = sel && sel.start !== sel.end ? sel.value : t('text');
        replaceSelection(`:style[${content}]{color=${key}}`);
    }

    // Aplica un tamaño de fuente.
    function onSizeSelected(key: keyof typeof sizes): void {
        const sel = getSelection();
        const content = sel && sel.start !== sel.end ? sel.value : t('text');
        replaceSelection(`:style[${content}]{size=${key}}`);
    }

    return (
        <div className="flex flex-wrap items-center gap-1 p-1">
            {/* Negrita */}
            <Tooltip content={t('apply_bold')}>
                <Button type="button" variant="ghost" size="icon" onClick={onBold}>
                    <Bold className="h-4 w-4" />
                </Button>
            </Tooltip>

            {/* Cursiva */}
            <Tooltip content={t('apply_italic')}>
                <Button type="button" variant="ghost" size="icon" onClick={onItalic}>
                    <Italic className="h-4 w-4" />
                </Button>
            </Tooltip>

            {/* Encabezados (H1 y H2) */}
            <Popover>
                <Tooltip content={t('insert_heading')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Heading className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>

                <PopoverContent className="flex w-auto flex-col items-start gap-1 p-2">
                    <Button variant="ghost" className="flex items-center gap-2 text-sm" onClick={() => onHeading(1)}>
                        <Heading1 className="h-4 w-4" />
                        {t('title')}
                    </Button>
                    <Button variant="ghost" className="flex items-center gap-2 text-sm" onClick={() => onHeading(2)}>
                        <Heading2 className="h-4 w-4" />
                        {t('subtitle')}
                    </Button>
                </PopoverContent>
            </Popover>

            {/* Color de fuente */}
            <Popover>
                <Tooltip content={t('change_font_color')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <PaintBucket className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-auto gap-2">
                    {(Object.keys(colors) as (keyof typeof colors)[]).map((key) => (
                        <button
                            key={key}
                            title={t(key)}
                            onClick={() => onColorSelected(key)}
                            className={`h-6 w-6 rounded-full ${colors[key]} border border-gray-300 transition-transform hover:scale-110`}
                        />
                    ))}
                </PopoverContent>
            </Popover>

            {/* Tamaño de fuente */}
            <Popover>
                <Tooltip content={t('change_font_size')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Type className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-auto flex-col items-start gap-1 p-2">
                    {(Object.keys(sizes) as (keyof typeof sizes)[]).map((key) => (
                        <Button
                            key={key}
                            variant="ghost"
                            className="flex w-full items-center justify-start gap-2 text-sm"
                            onClick={() => onSizeSelected(key)}
                        >
                            <Type className={`h-4 w-4 ${key === 'small' ? 'scale-90' : 'scale-125'}`} />
                            {key === 'small' ? t('small') : t('big')}
                        </Button>
                    ))}
                </PopoverContent>
            </Popover>

            {/* Enlace */}
            <Popover>
                <Tooltip content={t('insert_link')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Link className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-64 flex-col gap-2 p-4">
                    <Input
                        placeholder={t('link_text')}
                        value={linkData.text}
                        onChange={(e) => setLinkData((p) => ({ ...p, text: e.target.value }))}
                    />
                    <Input
                        placeholder="https://example.com"
                        value={linkData.url}
                        onChange={(e) => setLinkData((p) => ({ ...p, url: e.target.value }))}
                    />
                    <Button size="sm" className="mt-2" onClick={applyLink}>
                        <Link2 className="mr-2 h-4 w-4" /> {t('insert_link')}
                    </Button>
                </PopoverContent>
            </Popover>

            {/* Imagen */}
            <Popover>
                <Tooltip content={t('insert_image')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isImgUploading}>
                            <Image className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-64 flex-col gap-2 p-4">
                    <div className="flex gap-2">
                        {/* Campo URL */}
                        <Input
                            disabled={isImgUploading}
                            placeholder={`${window.location.origin}/samples/cat.jpg`}
                            value={imageData.url}
                            onChange={(e) => setImageData((p) => ({ ...p, url: e.target.value }))}
                        />

                        {/* Botón subir imagen */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t('upload_image')}
                            disabled={isImgUploading}
                            onClick={() => imgFileInputRef.current?.click()}
                        >
                            {isImgUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>

                        {/* Botón para abrir álbum */}
                        <Button
                            variant="ghost"
                            size="icon"
                            title={t('open_uploads_history')}
                            onClick={() => {
                                setMediaMode('image');
                                setIsMediaDialogOpen(true);
                            }}
                        >
                            <History className="h-4 w-4" />
                        </Button>

                        {/* Input oculto */}
                        <input
                            ref={imgFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            hidden
                            onChange={onImgFileSelected}
                        />
                    </div>

                    {/* Campo texto alternativo */}
                    <Input
                        disabled={isImgUploading}
                        placeholder={t('alternative_text')}
                        value={imageData.alt}
                        onChange={(e) => setImageData((p) => ({ ...p, alt: e.target.value }))}
                    />

                    {/* Botón insertar imagen */}
                    <Button size="sm" className="mt-2" onClick={applyImage} disabled={isImgUploading}>
                        <ImagePlus className="mr-2 h-4 w-4" /> {t('insert_image')}
                    </Button>
                </PopoverContent>
            </Popover>

            {/* Separador horizontal */}
            <Tooltip content={t('insert_separator')}>
                <Button type="button" variant="ghost" size="icon" onClick={onSeparator}>
                    <Minus className="h-4 w-4" />
                </Button>
            </Tooltip>

            {/* Cita en bloque */}
            <Tooltip content={t('quote')}>
                <Button type="button" variant="ghost" size="icon" onClick={onQuote}>
                    <Quote className="h-4 w-4" />
                </Button>
            </Tooltip>

            {/* Código */}
            <Popover>
                <Tooltip content={t('insert_code')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Code className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-auto flex-col items-start gap-1 p-2">
                    <Button variant="ghost" className="flex w-full items-center justify-start gap-2 text-sm" onClick={onInlineCode}>
                        <Code className="h-4 w-4" />
                        {t('inline_code')}
                    </Button>
                    <Button type="button" variant="ghost" className="flex w-full items-center justify-start gap-2 text-sm" onClick={onCodeBlock}>
                        <SquareCode className="h-4 w-4" />
                        {t('code_block')}
                    </Button>
                </PopoverContent>
            </Popover>

            {/* Lista */}
            <Popover>
                <Tooltip content={t('insert_list')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <List className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-auto flex-col items-start gap-1 p-2">
                    <Button type="button" variant="ghost" className="flex w-full items-center justify-start gap-2 text-sm" onClick={onOrderedList}>
                        <ListOrdered className="h-4 w-4" /> {t('ordered_list')}
                    </Button>
                    <Button type="button" variant="ghost" className="flex w-full items-center justify-start gap-2 text-sm" onClick={onUnorderedList}>
                        <List className="h-4 w-4" /> {t('unordered_list')}
                    </Button>
                </PopoverContent>
            </Popover>

            {/* Contenido oculto */}
            <Popover>
                <Tooltip content={t('hide_content')}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <EyeOff className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-auto flex-col items-start gap-1 p-2">
                    <Button type="button" variant="ghost" className="flex w-full items-center justify-start gap-2 text-sm" onClick={onHiddenInline}>
                        <EyeOff className="h-4 w-4" /> {t('hidden_text')}
                    </Button>
                    <Button type="button" variant="ghost" className="flex w-full items-center justify-start gap-2 text-sm" onClick={onHiddenBlock}>
                        <CaptionsOff className="h-4 w-4" /> {t('hidden_block')}
                    </Button>
                </PopoverContent>
            </Popover>

            {/* Video */}
            <Popover>
                <Tooltip content={t('insert_video')}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                            <SquarePlay className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </Tooltip>
                <PopoverContent className="flex w-64 flex-col gap-2 p-4">
                    <div className="flex gap-2">
                        {/* Campo URL */}
                        <Input
                            disabled={isVideoUploading}
                            placeholder={`${window.location.origin}/samples/cat.mp4`}
                            value={videoData.url}
                            onChange={(e) => setVideoData({ url: e.target.value })}
                        />

                        {/* Botón subir video */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={t('upload_video')}
                            disabled={isVideoUploading}
                            onClick={() => videoFileInputRef.current?.click()}
                        >
                            {isVideoUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>

                        {/* Botón para abrir álbum */}
                        <Button
                            variant="ghost"
                            size="icon"
                            title={t('open_uploads_history')}
                            onClick={() => {
                                setMediaMode('video');
                                setIsMediaDialogOpen(true);
                            }}
                        >
                            <History className="h-4 w-4" />
                        </Button>

                        {/* Input oculto */}
                        <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm" hidden onChange={onVideoFileSelected} />
                    </div>

                    <Button size="sm" className="mt-2" onClick={applyVideo}>
                        <SquarePlay className="mr-2 h-4 w-4" /> {t('insert_video')}
                    </Button>
                </PopoverContent>
            </Popover>

            <MediaDialog
                open={isMediaDialogOpen}
                user={user}
                type={mediaMode || 'image'}
                onClose={() => {
                    setIsMediaDialogOpen(false);
                    setMediaMode(null);
                }}
                onSelect={(url) => {
                    if (mediaMode === 'image') {
                        replaceSelection(`\n![${t('text')}](${url})\n`);
                    }

                    if (mediaMode === 'video') {
                        replaceSelection(`\n::video[${url}]\n`);
                    }
                }}
            />
        </div>
    );
}
