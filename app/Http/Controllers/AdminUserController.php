<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\UserBlock;
use App\Rules\UserRules;
use App\Traits\HandlesPasswordConfirmation;
use App\Utils\UsernameGenerator;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Controlador responsable de la gestión administrativa de usuarios.
 * Permite listar, crear, editar y eliminar usuarios, así como
 * ejecutar acciones privilegiadas.
 */
class AdminUserController extends Controller
{
    use HandlesPasswordConfirmation;

    /**
     * Muestra una lista paginada de usuarios para el panel de administración.
     * Permite aplicar búsqueda y ordenamiento sobre los resultados.
     *
     * @param Request $request Datos de la petición HTTP.
     */
    public function index(Request $request)
    {
        // Deniega el acceso si el usuario autenticado
        // no tiene permisos de moderación.
        $this->authorize('moderate');

        // Columnas permitidas para el ordenamiento.
        $allowed_order_by = [
            'id',
            'username',
            'email_verified_at',
            'is_active',
            'role',
            'created_at'
        ];

        // Obtiene y valida la columna de ordenamiento.
        // Por defecto se utiliza "username".
        $order_by = $request->get('orderBy', 'id');
        $order_by = in_array(
            $order_by,
            $allowed_order_by,
            true
        ) ? $order_by : 'username';

        // Define la dirección del ordenamiento (ascendente o descendente).
        $order_direction = strtolower($request->get('orderDirection', 'desc'));
        $order_direction = in_array(
            $order_direction,
            ['asc', 'desc'],
            true
        ) ? $order_direction : 'asc';

        // Obtiene el término de búsqueda.
        $query = trim($request->get('query', ''));

        // Consulta base del modelo User.
        $users_query = User::query();

        // Aplica búsqueda por nombre de usuario parcial o por ID exacto.
        if ($query !== '') {
            $users_query->where(function($q) use ($query) {
                $q->where('username', 'like', "%{$query}%")
                  ->orWhere('id', $query);
            });
        }

        // Aplica el ordenamiento a la consulta.
        $users_query->orderBy($order_by, $order_direction);

        // Obtiene los usuarios paginados mediante cursor.
        $users = $users_query->cursorPaginate(20)->withQueryString();

        return Inertia::render('admin/users/index', [
            'users' => UserResource::collection($users),
        ]);
    }
    
    /**
     * Muestra el formulario de edición de un usuario.
     *
     * Los administradores solo pueden ser editados por otros administradores.
     *
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario que se va a editar.
     */
    public function edit(Request $request, User $user)
    {
        // Obtiene el usuario autenticado.
        $auth_user = $request->user();

        // Deniega el acceso si el usuario autenticado
        // no puede actuar sobre el usuario indicado.
        if (!$auth_user->canActOn($user)) {
            abort(403);
        }

        // Transforma el usuario utilizando UserResource para el frontend.
        $user_data = (new UserResource($user))->resolve();

        return Inertia::render('admin/users/edit', [
            'user' => $user_data,
        ]);
    }

    /**
     * Procesa las acciones administrativas sobre un usuario.
     *
     * Valida la acción solicitada, confirma la contraseña del moderador
     * y delega la ejecución a métodos específicos.
     *
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario que se va a modificar.
     */
    public function update(Request $request, User $user)
    {
        // Obtiene el usuario autenticado.
        $auth_user = $request->user();

        // Deniega el acceso si el usuario autenticado
        // no puede actuar sobre el usuario indicado.
        if (!$auth_user->canActOn($user)) {
            abort(403);
        }
        
        // Valida los datos enviados desde el formulario.
        $request->validate([
            'action' => [
                'required',
                Rule::in([
                    'change_role',
                    'delete_avatar',
                    'change_username',
                    'change_email',
                    'reset_password',
                    'toggle_account_status',
                    'toggle_permission',
                    'delete_account',
                ])
            ],
            'privileged_password' => ['required', 'string'],
        ]);

        // Verifica que la contraseña ingresada por el moderador sea correcta.
        $this->confirmPassword($request->input('privileged_password'));

        // Ejecuta la acción correspondiente delegando a métodos específicos.
        switch ($request->action) {
            case 'change_role':
                return $this->changeRole($request, $user);

            case 'delete_avatar':
                return $this->deleteAvatar($user);

            case 'change_username':
                return $this->changeUsername($request, $user);

            case 'change_email':
                return $this->changeEmail($request, $user);

            case 'reset_password':
                return $this->resetPassword($request, $user);

            case 'toggle_account_status':
                return $this->toggleAccountStatus($user);

            case 'toggle_permission':
                return $this->togglePermission($request, $user);

            case 'delete_account':
                return $this->deleteAccount($request, $user);

            default:
                return back()->with('status', 'no_action_performed');
        }
    }

    /**
     * Cambia el rol de un usuario.
     *
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario al que se
     *                         le cambiará el rol.
     */
    private function changeRole(Request $request, User $user)
    {
        // Deniega el acceso si el usuario autenticado
        // no tiene permisos administrativos.
        $this->authorize('access-admin-area');

        // Valida los datos enviados desde el formulario.
        $request->validate([
            'new_role' => 'required|in:admin,mod,user',
        ]);

        // Sincroniza el rol del usuario.
        $user->syncRoles([$request->new_role]);

        // Si el nuevo rol no es "user", elimina los bloqueos asociados.
        // Los moderadores y administradores no pueden estar bloqueados.
        if ($request->new_role !== 'user') {
            // Elimina bloqueos realizados por el usuario.
            UserBlock::where('blocker_id', $user->id)->delete();

            // Elimina bloqueos aplicados al usuario.
            UserBlock::where('blocked_id', $user->id)->delete();
        }

        return back()->with('status', 'role_updated');
    }

    /**
     * Elimina el avatar de un usuario.
     * 
     * @param User $user Instancia del usuario al que se
     *                   le va a eliminar el avatar.
     */
    private function deleteAvatar(User $user)
    {
        // Elimina el archivo del avatar si existe.
        if (
            $user->avatar_path &&
            Storage::disk('public')->exists($user->avatar_path)
        ) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        // Limpia la ruta del avatar en la base de datos.
        $user->avatar_path = null;
        $user->save();

        return back()->with('status', 'avatar_deleted');
    }

    /**
     * Cambia el nombre de usuario.
     *
     * Si se recibe un nombre de usuario nuevo, se valida y se asigna.
     * En caso contrario, se genera automáticamente uno único.
     *
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario al que se le cambiará
     *                         el nombre de usuario.
     */
    private function changeUsername(Request $request, User $user)
    {
        if ($request->filled('new_username')) {
            $request->validate([
                'new_username' => UserRules::username($user->id),
            ]);

            $new_username = $request->new_username;
        } else {
            $new_username = UsernameGenerator::generate();
        }

        $user->username = $new_username;

        // Guarda los cambios solo si el campo fue modificado.
        if ($user->isDirty('username')) {
            $user->save();
        }

        return back()->with('status', 'username_updated');
    }

    /**
     * Cambia el correo electrónico de un usuario.
     * 
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario al que se le
     *                         va a cambiar el correo.
     */
    private function changeEmail(Request $request, User $user)
    {
        // Deniega el acceso si el usuario autenticado
        // no tiene permisos de administrador.
        $this->authorize('access-admin-area');

        // Valida los datos enviados desde el formulario.
        $request->validate([
            'new_email' => UserRules::email($user->id),
        ]);

        $user->email = $request->new_email;

        // Si el correo cambió, anula la verificación previa,
        // guarda los cambios y envía el enlace de verificación.
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
            $user->save();
            $user->sendEmailVerificationNotification();
        }
        
        return back()->with('status', 'email_updated');
    }

    /**
     * Envía un enlace de restablecimiento de contraseña al correo del usuario.
     *
     * Opcionalmente, puede generar y guardar una nueva contraseña aleatoria
     * antes de enviar el enlace.
     *
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario que recibirá el correo.
     */
    private function resetPassword(Request $request, User $user)
    {
        // Deniega el acceso si el usuario autenticado
        // no tiene permisos de administrador.
        $this->authorize('access-admin-area');
        
        // Genera y guarda una nueva contraseña aleatoria si se solicitó.
        if (filter_var($request->random_password, FILTER_VALIDATE_BOOLEAN)) {
            $new_password = Str::random(12);
            $user->password = Hash::make($new_password);
            $user->remember_token = null;
            $user->save();
        }

        // Envía el enlace de restablecimiento de contraseña al usuario.
        Password::sendResetLink(['email' => $user->email]);
        
        return back()->with('status', 'password_reset_email_sent');
    }

    /**
     * Habilita o inhabilita una cuenta de usuario.
     *
     * @param User $user Instancia del usuario que se va a habilitar
     *                   o inhabilitar.
     */
    private function toggleAccountStatus(User $user)
    {
        // Alterna el estado de activación de la cuenta.
        $user->is_active = !$user->is_active;
        $user->save();

        // Si la cuenta fue inhabilitada, elimina
        // todas las sesiones activas del usuario.
        if (!$user->is_active) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return back()->with(
            'status',
            $user->is_active
                ? 'account_activated'
                : 'account_deactivated'
        );
    }

    /**
     * Asigna o revoca un permiso de un usuario.
     *
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario que se va a cambiar
     *                         el permiso.
     */
    private function togglePermission(Request $request, User $user)
    {
        // Valida los datos enviados desde el formulario.
        $request->validate([
            'permission_key' => [
                'required',
                Rule::in([
                    'post',
                    'comment',
                    'react',
                    'update_avatar',
                    'update_username',
                ]),
            ],
        ]);

        $permission = $request->permission_key;

        // Si el usuario ya tiene el permiso, se revoca.
        // Si no lo tiene, se asigna.
        if ($user->hasPermissionTo($permission)) {
            $user->revokePermissionTo($permission);
        } else {
            $user->givePermissionTo($permission);
        }

        return back()->with('status', 'permission_updated');
    }

    /**
     * Elimina definitivamente una cuenta de usuario.
     * 
     * @param Request $request Datos de la petición HTTP.
     * @param User    $user    Instancia del usuario que se va a eliminar.
     */
    public function deleteAccount(Request $request, User $user)
    {
        // Deniega acceso si el usuario autenticado no tiene permisos
        // administrativos o si se intenta eliminar a otro administrador.
        if (!$request->user()->hasRole('admin') || $user->hasRole('admin')) {
            abort(403);
        }
        
        // Elimina todas las sesiones activas del usuario.
        DB::table('sessions')->where('user_id', $user->id)->delete();

        // Elimina definitivamente al usuario.
        $user->delete();

        return redirect()
            ->route('admin.user.index')
            ->with('message', __('User successfully deleted.'));
    }
}