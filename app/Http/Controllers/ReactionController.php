<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommentResource;
use App\Http\Resources\PostResource;
use App\Http\Resources\ReactionResource;
use App\Http\Resources\UserResource;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Reaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Controlador responsable de gestionar las reacciones de los usuarios.
 *
 * Permite crear, reemplazar o eliminar reacciones (emojis) asociadas
 * a publicaciones o comentarios, garantizando que cada usuario tenga
 * una única reacción por elemento.
 */
class ReactionController extends Controller
{
    /**
     * Lista los usuarios que hicieron una reacción dada sobre una
     * publicación o comentario.
     * 
     * @param Request       $request  Datos de la petición HTTP.
     * @param Post|null     $post     Publicación que se reaccionó.
     * @param Comment|null  $comment  Comentario que se reaccionó.
     */
    public function index(Request $request, ?Post $post = null, ?Comment $comment = null)
    {
        // Captura el modelo sobre el que se reaccionó.
        $model = $comment ?? $post;

        // Si se recibió un comentario y este no es de la publicación,
        // se muestra error.
        if ($comment && $comment->post_id !== $post->id) {
          abort(404);
        }

        // Valida los datos enviados.
        $request->validate([            
            'emoji' => 'nullable|string|max:20',
        ]);

        // Obtiene el cursor de paginación.
        $cursor = $request->header('X-Cursor');

        // Agrupa las reacciones por emoji y cuenta el número de veces
        // que se reaccionó con dicho emoji.
        $reactions = $model->reactions()
            ->select('emoji')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('emoji')
            ->orderByDesc('count')
            ->get();

        // Si no se porporcionó un emoji, toma el primero de la consulta
        // previa para listar los usuarios que reaccionaron con él.
        $selected_emoji = $request->emoji ?? $reactions->first()?->emoji;

        // Obtiene los usuarios qu$emojie reaccionaron con el emoji especificado.
        $users = $model->reactions()
            ->where('emoji', $selected_emoji)
            ->with('user')
            ->orderByDesc('created_at')
            ->cursorPaginate(20, ['*'], 'cursor', $cursor)
            ->through(fn ($reaction) => $reaction->user);
 
        // Obtiene la publicación y el comentario relacionados
        // con la reacción.
        $reacted_post = $post->load('user');
        $reacted_comment = $comment?->load('user');

        return Inertia::render('reactions/index', [
            'post'            => (new PostResource($reacted_post))->resolve(),
            'comment'         => $reacted_comment
                                  ? (new CommentResource($reacted_comment))->resolve()
                                  : null,
            'reactions'       => ReactionResource::collection($reactions),
            'users'           => UserResource::collection($users),
            'selected_emoji'  => $selected_emoji,
        ]);
    }

    /**
     * Crea, reemplaza o elimina una reacción de un usuario
     * sobre una publicación o un comentario.
     *
     * El comportamiento es el siguiente:
     * - Si el usuario no ha reaccionado antes, se crea una nueva reacción.
     * - Si ya reaccionó con el mismo emoji, la reacción se elimina.
     * - Si ya reaccionó con un emoji distinto, la reacción se reemplaza.
     * 
     * @param Request $request Datos de la petición HTTP.
     */
    public function toggle(Request $request)
    {
        // Valida los datos de la solicitud:
        // - type:   Indica si la reacción es para una publicación o comentario.
        // - id:     ID del recurso al que se aplica la reacción.
        // - emoji:  Emoji que representa la reacción.
        $request->validate([
            'type' => 'required|in:post,comment',
            'id' => 'required|integer',
            'emoji' => 'required|string|max:20',
        ]);

        $user = $request->user();
        $type = $request->type;
        $id = $request->id;
        $emoji = $request->emoji;

        // Obtiene el modelo correspondiente (Post o Comment)
        // o lanza una excepción 404 si no existe.
         $model = $type === 'post' 
            ? Post::findOrFail($id) 
            : Comment::findOrFail($id);

        // Busca si el usuario ya tiene una reacción registrada
        // sobre el recurso.
        $existing = $model->reactions()->where('user_id', $user->id)->first();

        if ($existing) {
            // Si el emoji es el mismo, se elimina la reacción.
            if ($existing->emoji === $emoji) {
                $existing->delete();
                return back()->with('status', 'reaction_deleted');
            }

            // Si el emoji es distinto, se reemplaza la reacción anterior.
            $existing->update(['emoji' => $emoji]);
            
            return back()->with('status', 'reaction_replaced');
        }

        // Cuenta la cantidad de emojis distintos en el recurso.
        $distinct_count = $model->reactions()
            ->distinct('emoji')
            ->count('emoji');

        // Verifica si el emoji ya existe en el recurso.
        $emoji_exists = $model->reactions()
            ->where('emoji', $emoji)
            ->exists();

        // Si se alcanzó el límite y el emoji aún no existe, se rechaza.
        if ($distinct_count >= 10 && !$emoji_exists) {
            return back()->withErrors([
                'message' => __('Maximum reactions reached.'),
            ]);
        }

        // Si no existe una reacción previa, se crea una nueva.
        $model->reactions()->create([
            'user_id' => $user->id,
            'emoji' => $emoji,
        ]);

        return back()->with('status', 'reaction_created');
    }
}