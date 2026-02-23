<?php

namespace App\Http\Resources;

use App\Http\Resources\PermissionResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Define la representación de usuario para el frontend.
 */
class UserResource extends JsonResource
{
    /**
     * Convierte el recurso en un arreglo para ser enviado al frontend.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $auth = $request->user();

        /**
         * Determina si el usuario autenticado tiene permiso para
         * ver información sensible del recurso.
         *
         * Se permite si:
         *    - es el mismo usuario representado por el recurso actual o
         *    - es un moderador.
         */
        $can_view_sensitive_data =
            $auth && (
                $auth->id === $this->id || $auth->hasAnyRole(['admin', 'mod'])
            );

        /**
         * Determina si el usuario autenticado tiene permiso para
         * ver el correo electrónico del recurso.
         *
         * Se permite si:
         *    - es el mismo usuario representado por el recurso actual o
         *    - es un administrador y se está en un entorno local.
         */
        $can_view_email = 
            $auth && (
                $auth->id === $this->id ||
                ($auth->hasRole('admin') && app()->environment('local'))
            );

        // Datos sensibles.
        $email = $can_view_email
            ? $this->getRawOriginal('email')
            : '';

        $email_verified_at = $can_view_sensitive_data
            ? $this->email_verified_at
            : null;

        $updated_at = $can_view_sensitive_data
            ? $this->updated_at
            : null;
        
        // Datos que requieren autenticación.
        $is_blocked = $auth
            ? $auth->hasBlocked($this->resource)
            : null;

        $blocked_me = $auth
            ? $this->resource->hasBlocked($auth)
            : null;

        return [
            'id'                => $this->id,
            'username'          => $this->username,
            'avatar_url'        => $this->avatar_url,
            'email'             => $email,
            'email_verified_at' => $email_verified_at,
            'role'              => $this->role,
            'permissions'       => $this->getAllPermissions()->pluck('name'),
            'is_active'         => $this->is_active,
            'language'          => $this->language,
            'created_at'        => $this->created_at,
            'updated_at'        => $updated_at,
            'type'              => $this->type,
            'follows_count'     => $this->follows_count ?? null,
            'followers_count'   => $this->followers_count ?? null,
            'is_followed'       => $this->is_followed ?? null,
            'is_blocked'        => $is_blocked,
            'blocked_me'        => $blocked_me,
        ];
    }
}