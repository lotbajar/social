import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminActionForm } from '@/hooks/app/use-admin-action-form';
import { Auth, User, UserPermission } from '@/types';
import { usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import ConfirmActionDialog from './admin-confirm-action-dialog';
import FormErrors from './form-errors';

interface AdminUserEditFormProps {
    user: User; // Usuario que se va a gestionar.
}

/**
 * Formulario para la gestión de un usuario.
 */
export default function AdminUserEditForm({ user }: AdminUserEditFormProps) {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura el usuario autenticado proporcionado por Inertia.
    const { auth } = usePage<{ auth: Auth }>().props;

    // Mapa de roles con sus descripciones.
    const role_descriptions = new Map([
        [t('user'), t('user_role_description')],
        [t('moderator'), t('moderator_role_description')],
        [t('administrator'), t('administrator_role_description')],
    ]);

    // Lista de permisos que se pueden gestionar para el usuario.
    const permissions = [
        { key: 'post', label: t('can_post') },
        { key: 'comment', label: t('can_comment') },
        { key: 'react', label: t('can_react') },
        { key: 'update_avatar', label: t('can_update_avatar') },
        { key: 'update_username', label: t('can_update_username') },
    ];

    // Inicializa y gestiona el formulario de acciones administrativas sobre el usuario.
    const { form, handleAction, confirmAction, isDialogOpen, closeDialog } = useAdminActionForm({
        initialData: {
            new_username: user.username,
            new_email: user.email,
            new_role: user.role,
            random_password: false,
            permission_key: '',
        },
        route: () => route('admin.user.update', user.id),
        onSuccess: (action, page) => {
            switch (action) {
                case 'change_username':
                    // Sincroniza el nombre de usuario actualizado desde la respuesta del servidor.
                    const typedPage = page as unknown as { props: { user: User } };
                    form.setData((prev) => ({ ...prev, new_username: typedPage.props.user.username }));
                    break;
            }
        },
    });

    return (
        <form className="space-y-8">
            {/* Gestión del estado de la cuenta */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('change_account_status')}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Errores de la acción */}
                    {form.data.action === 'toggle_account_status' && <FormErrors errors={form.errors} />}

                    {/* Opción para alternar el estado de la cuenta */}
                    <div className="flex items-center gap-2">
                        <ToggleGroup
                            type="single"
                            value={String(user.is_active)}
                            onValueChange={(value) => {
                                if (value) {
                                    handleAction('toggle_account_status');
                                }
                            }}
                            variant="outline"
                            disabled={form.processing && form.data.action === 'toggle_account_status'}
                        >
                            <ToggleGroupItem value="true">{t('enabled')}</ToggleGroupItem>
                            <ToggleGroupItem value="false">{t('disabled')}</ToggleGroupItem>
                        </ToggleGroup>

                        {/* Indicador de carga durante el procesamiento de la acción  */}
                        {form.processing && form.data.action === 'toggle_account_status' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    </div>

                    {/* Descripción del comportamiento esperado */}
                    <p className="text-muted-foreground text-sm italic">{t('disable_account_ends_all_sessions')}</p>
                </CardContent>
            </Card>

            {/* Gestión del rol de usuario */}
            {auth.user.role === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('change_role')}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Errores de la acción */}
                        {form.data.action === 'change_role' && <FormErrors errors={form.errors} />}

                        {/* Selector de rol de usuario */}
                        <Select
                            value={form.data.new_role}
                            onValueChange={(value: 'user' | 'mod' | 'admin') => form.setData('new_role', value)}
                            disabled={form.processing && form.data.action === 'change_role'}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t('select_role')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">{t('administrator')}</SelectItem>
                                <SelectItem value="mod">{t('moderator')}</SelectItem>
                                <SelectItem value="user">{t('user')}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Descripción de los roles disponibles */}
                        <dl className="text-muted-foreground grid grid-cols-[min-content_1fr] gap-2 text-sm">
                            {[...role_descriptions].map(([role, description]) => (
                                <Fragment key={role}>
                                    <dt className="font-semibold">{role}:</dt>
                                    <dd>{description}</dd>
                                </Fragment>
                            ))}
                        </dl>

                        {/* Botón para guardar el nuevo rol */}
                        <Button
                            type="button"
                            onClick={() => handleAction('change_role')}
                            disabled={form.processing && form.data.action === 'change_role'}
                        >
                            {form.processing && form.data.action === 'change_role' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {t('change')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Gestión de permisos del usuario */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('manage_permissions')}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Lista de permisos a gestionar */}
                    {permissions.map((permission) => (
                        <div key={permission.key} className="flex items-center gap-2">
                            <ToggleGroup
                                type="single"
                                value={String(user.permissions.includes(permission.key as UserPermission))}
                                onValueChange={(value) => {
                                    if (value) {
                                        form.setData('permission_key', permission.key);
                                        handleAction('toggle_permission');
                                    }
                                }}
                                variant="outline"
                                disabled={form.processing && form.data.action === 'toggle_permission' && form.data.permission_key === permission.key}
                            >
                                <ToggleGroupItem value="true">{t('enabled')}</ToggleGroupItem>
                                <ToggleGroupItem value="false">{t('disabled')}</ToggleGroupItem>
                            </ToggleGroup>

                            {/* Etiqueta del permiso */}
                            <span>{permission.label}</span>

                            {/* Indicador de carga durante el procesamiento de la acción */}
                            {form.processing && form.data.action === 'toggle_permission' && form.data.permission_key === permission.key && (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Gestión del avatar del usuario */}
            {user.avatar_url && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('delete_avatar')}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Errores de la acción */}
                        {form.data.action === 'delete_avatar' && <FormErrors errors={form.errors} />}

                        <div className="flex items-center gap-4">
                            {/* Previsualización del avatar */}
                            <img src={user.avatar_url} alt={t('avatar')} className="h-24 w-24 rounded-sm bg-neutral-200 object-cover" />

                            {/* Botón para eliminar el avatar */}
                            <Button
                                type="button"
                                onClick={() => handleAction('delete_avatar')}
                                disabled={form.processing && form.data.action === 'delete_avatar'}
                            >
                                {form.processing && form.data.action === 'delete_avatar' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                                {t('delete')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Nombre de usuario */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('change_username')}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Errores de la acción */}
                    {form.data.action === 'change_username' && <FormErrors errors={form.errors} />}

                    {/* Campo de nombre de usuario */}
                    <Input
                        placeholder={t('username')}
                        value={form.data.new_username}
                        onChange={(e) => form.setData('new_username', e.target.value)}
                        disabled={form.processing && form.data.action === 'change_username'}
                    />

                    {/* Descripción del comportamiento esperado */}
                    <p className="text-muted-foreground text-sm italic">{t('random_username_if_empty')}</p>

                    {/* Botón para cambiar el nombre de usuario */}
                    <Button
                        type="button"
                        onClick={() => handleAction('change_username')}
                        disabled={form.processing && form.data.action === 'change_username'}
                    >
                        {form.processing && form.data.action === 'change_username' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {t('change')}
                    </Button>
                </CardContent>
            </Card>

            {/* Gestión del correo electrónico */}
            {auth.user.role === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('change_email_address')}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Errores de la acción */}
                        {form.data.action === 'change_email' && <FormErrors errors={form.errors} />}

                        {/* Campo de correo electrónico */}
                        <Input
                            placeholder={t('new_email')}
                            value={form.data.new_email}
                            onChange={(e) => form.setData('new_email', e.target.value)}
                            disabled={form.processing && form.data.action === 'change_email'}
                        />

                        {/* Descripción del comportamiento esperado */}
                        <p className="text-muted-foreground text-sm italic">{t('verification_email_will_be_sent')}</p>

                        {/* Botón para cambiar el correo */}
                        <Button
                            type="button"
                            onClick={() => handleAction('change_email')}
                            disabled={(form.processing && form.data.action === 'change_email') || form.data.new_email.trim().length === 0}
                        >
                            {form.processing && form.data.action === 'change_email' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {t('change')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Gestión de la contraseña */}
            {auth.user.role === 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('reset_password')}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Errores de la acción */}
                        {form.data.action === 'reset_password' && <FormErrors errors={form.errors} />}

                        {/* Descripción de la acción */}
                        <p>{t('send_password_reset_email')}</p>

                        {/* Campo de verificación para reemplazar la contraseña por una aleatoria */}
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="reset-password"
                                checked={form.data.random_password}
                                onCheckedChange={(checked) => form.setData('random_password', !!checked)}
                                disabled={form.processing && form.data.action === 'reset_password'}
                            />
                            <label htmlFor="reset-password">{t('replace_password_with_random')}</label>
                        </div>

                        {/* Botón para enviar enlace de restablecimiento de contraseña */}
                        <Button
                            type="button"
                            onClick={() => handleAction('reset_password')}
                            disabled={form.processing && form.data.action === 'reset_password'}
                        >
                            {form.processing && form.data.action === 'reset_password' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {t('reset')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Eliminación del usuario */}
            {auth.user.role === 'admin' && user.role !== 'admin' && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('delete_user')}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Descripción de la acción */}
                        {form.data.action === 'delete_account' && <FormErrors errors={form.errors} />}
                        <p>{t('delete_user_account_and_data')}</p>

                        {/* Botón para eliminar el usuario */}
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleAction('delete_account')}
                            disabled={form.processing && form.data.action === 'delete_account'}
                        >
                            {form.processing && form.data.action === 'delete_account' && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {t('delete')}
                        </Button>
                    </CardContent>
                </Card>
            )}
            {/* Confirmación de la acción */}
            <ConfirmActionDialog
                open={isDialogOpen}
                onOpenChange={closeDialog}
                password={form.data.privileged_password}
                onPasswordChange={(value) => form.setData('privileged_password', value)}
                onConfirm={confirmAction}
            />
        </form>
    );
}
