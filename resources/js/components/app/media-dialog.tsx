import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { User } from '@/types';
import { Media } from '@/types/modules/media';
import { DialogDescription } from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import MediaDialogAlbum from './media-dialog-album';

interface MediaDialogProps {
    open: boolean;
    user: User;
    type: 'image' | 'video';
    onClose: () => void;
    onSelect: (url: string) => void;
}

/**
 * Diálogo que muestra el historial de archivos multimedia subidos por un usuario.
 */
export default function MediaDialog({ open, user, type, onClose, onSelect }: MediaDialogProps) {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="!max-w-5xl">
                <DialogHeader>
                    <DialogTitle>{t('uploaded_files')}</DialogTitle>
                    <DialogDescription>{t('use_or_delete_your_uploaded_files')}</DialogDescription>
                </DialogHeader>

                <MediaDialogAlbum
                    user={user}
                    type={type}
                    onSelect={(media: Media) => {
                        onSelect?.(media.url);
                        onClose();
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
