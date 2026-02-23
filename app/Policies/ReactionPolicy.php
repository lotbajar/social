<?php

namespace App\Policies;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Define las reglas de autorización para las acciones que pueden
 * realizarse sobre las reacciones.
 */
class ReactionPolicy
{
    /**
     * Verifica si un usuario puede agregar o eliminar reacciones.
     *
     * @param User    $user    Usuario que intenta realizar la acción.
     * @param Post    $post    Publicación relacionada con la reacción.
     * @param Post    $comment Comentario reaccionado.
     * @return bool
     */
    public function toggle(User $user, Post $post, ?Comment $comment): bool
    {
        // Debe tener permiso para poder reaccionar.
        if (!$user->can('react')) {
            return false;
        }
        
        // Si no puede ver la publicación, no puede reaccionar .
        if (!$user->can('view', $post)) {
            return false;
        }

        // Si la reacción es sobre un comentario y hay bloqueo con el autor,
        // no puede reaccionar.
        if ($comment && $user->hasBlockedOrBeenBlockedBy($comment->user)) {
            return false;
        }

        return true;
    }
}