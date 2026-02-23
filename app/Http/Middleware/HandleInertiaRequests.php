<?php

namespace App\Http\Middleware;

use App\Http\Resources\UserResource;
use App\Models\Report;
use App\Models\SiteSetting;
use App\Utils\Locales;
use App\Utils\PageUtils;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

/**
 * Middleware responsable de preparar y compartir datos globales
 * con el frontend a través de Inertia.
 */
class HandleInertiaRequests extends Middleware
{
    /**
     * Vista raíz que se carga en la primera visita a la aplicación.
     * 
     * Esta vista actúa como contenedor principal para Inertia.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determina la versión actual de los assets.
     *
     * Se utiliza para forzar recargas del frontend cuando los
     * archivos compilados (JS/CSS) cambian.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define las propiedades compartidas globalmente con Inertia.
     *
     * Estos datos estarán disponibles en todas las páginas
     * del frontend sin necesidad de pasarlos explícitamente
     * desde cada controlador.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            // Propiedades compartidas por defecto por Inertia.
            ...parent::share($request),

            // Nombre de la aplicación.
            'name' => config('app.name'),

            // Nombre de la ruta actual (si existe).
            'routeName' => $request->route()?->getName(),

            // Mensajes flash comunes almacenados en la sesión.
            'status' => fn () => $request->session()->get('status'),
            'message' => fn () => $request->session()->get('message'),

            // Token CSRF compartido explícitamente para solicitudes
            // PUT, PATCH y DELETE realizadas fuera del flujo
            // estándar de Inertia.
            'csrfToken' => csrf_token(),

            // Información de autenticación del usuario actual.
            'auth' => [
                'user' => $request->user()
                    ? (new UserResource($request
                        ->user()
                      ))->resolve()
                    : null,
            ],

            // Configuración de Ziggy para el manejo de rutas en frontend.
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],

            // Estado inicial del sidebar según la cookie almacenada.
            'sidebarOpen' => 
                ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',

            // Configuración general del sitio expuesta al frontend.
            'siteSettings' => function () {
                $siteSettings = SiteSetting::first();
                return [
                    'is_user_registration_enabled' =>
                        $siteSettings?->is_user_registration_enabled
                        ?? false,
                ];
            },

            // Datos flash provenientes de redirecciones Inertia
            // relacionados con la creación o actualización de una
            // publicación, comentario, invitación, archivo o URL de un archivo
            // para que que el frontend reaccione a los cambios como en una SPA.
            'post' => fn () => $request->session()->get('post'),
            'comment' => fn () => $request->session()->get('comment'),
            'invitation' => fn () => $request->session()->get('invitation'),
            'media' => fn () => $request->session()->get('media'),
            'media_url' => fn () => $request->session()->get('media_url'),
            'reactions_info' => fn () => $request->session()->get('reactions_info'),

            // Cantidad de notificaciones no leídas del usuario autenticado.
            'unreadNotisCount' => fn () =>
                $request->user()
                    ?->unreadNotifications()
                    ->count()
                ?? 0,

            // Cantidad de reportes pendientes de moderación.
            'pendingReportsCount' => fn () =>
                $request->user()?->hasAnyRole(['admin', 'mod'])
                    ? Report::pending()->count()
                    : 0,

            // Idiomas disponibles en la aplicación.
            'locales' => Locales::all(),

            // Páginas informativas especiales (ej. "acerca de").
            'specialPages' => fn() => PageUtils::getSpecialPages(),
        ];
    }
}