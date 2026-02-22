<?php
/*
|--------------------------------------------------------------------------
| Controladores sociales
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\BlockUserController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\FollowController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReactionController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\SearchController;


/*
|--------------------------------------------------------------------------
| Controladores de configuración
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\SettingsLanguageController;
use App\Http\Controllers\SettingsPasswordController;
use App\Http\Controllers\SettingsProfileController;


/*
|--------------------------------------------------------------------------
| Controladores de administración
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\AdminInvitationController;
use App\Http\Controllers\AdminPageController;
use App\Http\Controllers\AdminReportController;
use App\Http\Controllers\AdminSiteController;
use App\Http\Controllers\AdminUserController;


/*
|--------------------------------------------------------------------------
| Controladores de autenticación
|--------------------------------------------------------------------------
*/
use App\Http\Controllers\AuthPasswordConfirmController;
use App\Http\Controllers\AuthPasswordForgotController;
use App\Http\Controllers\AuthPasswordResetController;
use App\Http\Controllers\AuthSessionController;
use App\Http\Controllers\AuthSignUpController;
use App\Http\Controllers\AuthVerifyEmailController;

use App\Http\Middleware\EnsureEmailNotVerified;
use App\Models\Comment;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


/*
|--------------------------------------------------------------------------
| Página de inicio
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('home.index');
    }

    return Inertia::render('welcome');
})->name('home');


/*
|--------------------------------------------------------------------------
| Rutas para invitados
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('register/{token?}', [AuthSignUpController::class, 'create'])
        ->middleware('registration.access')
        ->name('register');

    Route::post('register', [AuthSignUpController::class, 'store']);

    Route::get('login', [AuthSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthSessionController::class, 'store']);

    Route::get('forgot-password', [AuthPasswordForgotController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [AuthPasswordForgotController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [AuthPasswordResetController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [AuthPasswordResetController::class, 'store'])
        ->name('password.store');
});


/*
|--------------------------------------------------------------------------
| Rutas autenticadas
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    Route::post('logout', [AuthSessionController::class, 'destroy'])
        ->name('logout');
});


/*
|--------------------------------------------------------------------------
| Rutas autenticadas (sin verificación)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', EnsureEmailNotVerified::class])->group(function () {
    Route::get('verify-email', [AuthVerifyEmailController::class, 'prompt'])
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', [AuthVerifyEmailController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [AuthVerifyEmailController::class, 'notify'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('change-email', [AuthVerifyEmailController::class, 'edit'])
        ->name('verification.email.edit');

    Route::post('change-email', [AuthVerifyEmailController::class, 'update'])
        ->name('verification.email.update');
});


/*
|--------------------------------------------------------------------------
| Rutas autenticadas y verificadas
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    // Feed principal
    Route::get('/home', [HomeController::class, 'index'])
        ->name('home.index');

    // Usuarios y relaciones
    Route::prefix('user')
        ->group(function () {
            Route::get('{user}/following', [FollowController::class, 'showFollowing'])
                ->name('follow.following');
            Route::get('{user}/followers', [FollowController::class, 'showFollowers'])
                ->name('follow.followers');
            Route::post('{user}/follow', [FollowController::class, 'toggle'])
                ->name('follow.toggle');
            Route::post('{user}/block', [BlockUserController::class, 'toggle'])
                ->name('user.block');
        });

    // Publicaciones
    Route::prefix('post')
        ->name('post.')
        ->group(function () {
            Route::post('/', [PostController::class, 'store'])
                ->name('store');
            Route::patch('{post}', [PostController::class, 'update'])
                ->name('update');
            Route::delete('{post}', [PostController::class, 'delete'])
                ->name('delete');
        });

    // Comentarios
    Route::post('/post/{post}/comment', [CommentController::class, 'store'])
        ->name('comment.store');
    Route::patch('/comment/{comment}', [CommentController::class, 'update'])
        ->name('comment.update');
    Route::delete('/comment/{comment}', [CommentController::class, 'delete'])
        ->name('comment.delete');
    
    // Reacciones
    Route::put('/reaction', [ReactionController::class, 'toggle'])
        ->name('reaction.toggle');
    Route::get('/post/{post}/reactions', [ReactionController::class, 'index'])
        ->name('post.reaction.index');
    Route::get('/post/{post}/comment/{comment}/reactions', [ReactionController::class, 'index'])
        ->name('comment.reaction.index');

    // Multimedia
    Route::post('/media', [MediaController::class, 'store'])
        ->name('media.store');
    Route::get('/user/{user}/media', [MediaController::class, 'index'])
        ->name('media.index');
    Route::delete('/media/{media}', [MediaController::class, 'destroy'])
        ->name('media.destroy');

    // Búsqueda
    Route::get('/search', [SearchController::class, 'index'])
        ->name('search.index');

    // Notificaciones
    Route::prefix('notifications')
        ->name('notification.')
        ->group(function () {
            Route::get('/', [NotificationController::class, 'index'])
                ->name('index');
            Route::patch('read', [NotificationController::class, 'markAllAsRead'])
                ->name('markAllAsRead');
            Route::patch('read/{id}', [NotificationController::class, 'markOneAsRead'])
                ->name('markOneAsRead');
        });

    // Configuración de cuenta
    Route::prefix('settings')
        ->group(function () {
            Route::redirect('settings', 'settings/profile');

            Route::get('profile', [SettingsProfileController::class, 'edit'])
                ->name('profile.edit');
            Route::patch('profile', [SettingsProfileController::class, 'update'])
                ->name('profile.update');
            Route::delete('profile', [SettingsProfileController::class, 'destroy'])
                ->name('profile.destroy');

            Route::get('password', [SettingsPasswordController::class, 'edit'])
                ->name('password.edit');
            Route::put('password', [SettingsPasswordController::class, 'update'])
                ->name('password.update');

            Route::get('language', [SettingsLanguageController::class, 'edit'])
                ->name('language.edit');
            Route::patch('language', [SettingsLanguageController::class, 'update'])
                ->name('language.update');

            Route::get('appearance', function () {
                return Inertia::render('settings/appearance');
            })->name('appearance');
        });

    // Administración
    Route::prefix('admin')
        ->name('admin.')
        ->group(function () {
            // Página de administración por defecto.
            Route::get('/', function () {
                $user = auth()->user();

                if ($user->hasRole('admin')) {
                    return redirect()->route('admin.site.edit');
                }

                if ($user->hasAnyRole(['admin', 'mod'])) {
                    return redirect()->route('admin.user.index');
                }

                abort(403);
            })
            ->name('index');

            // Administración del sitio
            Route::prefix('site')
                ->name('site.')
                ->group(function () {
                    Route::get('/', [AdminSiteController::class, 'edit'])
                        ->name('edit');
                    Route::patch('/', [AdminSiteController::class, 'update'])
                        ->name('update');
                });

            // Administración de invitaciones
            Route::prefix('site/invitations')
                ->middleware('invitation.access')
                ->name('invitation.')
                ->group(function () {
                    Route::get('/', [AdminInvitationController::class, 'index'])
                        ->name('index');
                    Route::post('/', [AdminInvitationController::class, 'store'])
                        ->name('store');
                    Route::delete('{invitation}', [AdminInvitationController::class, 'destroy'])
                        ->name('destroy');
                });

            // Administración de páginas informativas
            Route::prefix('pages')
                ->name('page.')
                ->group(function () {
                    Route::get('/', [AdminPageController::class, 'index'])
                        ->name('index');
                    Route::get('/create', [AdminPageController::class, 'create'])
                        ->name('create');
                    Route::post('/create', [AdminPageController::class, 'store'])
                        ->name('store');
                    Route::get('/{page}/edit', [AdminPageController::class, 'edit'])
                        ->name('edit');
                    Route::patch('/{page}/edit', [AdminPageController::class, 'update'])
                        ->name('update');
                    Route::delete('{page}', [AdminPageController::class, 'destroy'])
                        ->name('destroy');
                });

            // Administración de usuarios        
            Route::prefix('users')
                ->name('user.')
                ->group(function () {
                    Route::get('/', [AdminUserController::class, 'index'])
                        ->name('index');
                    Route::get('{user}', [AdminUserController::class, 'edit'])
                        ->name('edit');
                    Route::patch('{user}', [AdminUserController::class, 'update'])
                        ->name('update');
                });

            // Administración de reportes
            Route::prefix('reports')
                ->name('report.')
                ->group(function () {
                    Route::get('/', [AdminReportController::class, 'index'])
                        ->name('index');
                    Route::get('/{report}', [AdminReportController::class, 'show'])
                        ->name('show');
                    Route::patch('/{report}', [AdminReportController::class, 'update'])
                        ->name('update');
                });
        });

    // Confirmación de contraseña
    Route::get('confirm-password', [AuthPasswordConfirmController::class, 'show'])
        ->name('password.confirm');
    Route::post('confirm-password', [AuthPasswordConfirmController::class, 'store']);

    // Creación de reportes
    Route::post('report', [AdminReportController::class, 'store'])
        ->name('report.store');
});

/*
|--------------------------------------------------------------------------
| Rutas públicas de visualización
|--------------------------------------------------------------------------
*/
Route::get('/user/{user}', [ProfileController::class, 'show'])
    ->name('profile.show');
Route::get('/post/{post}', [PostController::class, 'show'])
    ->name('post.show');
Route::get('/post/{post}/comment/{comment}', [PostController::class, 'show'])
    ->name('post.comment.show');
Route::get('/page/{lang}/{slug}', [AdminPageController::class, 'show'])
    ->name('page.show');

Route::get('/comment/{comment}', function (Request $request, Comment $comment) {
    return redirect()->route('post.comment.show', [
        'post' => $comment->post_id,
        'comment' => $comment->id,
    ]);
})->name('comment.show');