export type UserPermission = 
    | 'post' 
    | 'comment'
    | 'react'
    | 'update_username' 
    | 'update_avatar';

export interface User {
    type: 'user';
    id: number;
    username: string;
    email: string;
    avatar_url: string | null;
    email_verified_at: string | null;
    is_followed?: boolean | null;
    follows_count?: number;
    followers_count?: number;
    is_blocked: boolean | null;
    blocked_me: boolean | null;
    role: 'user' | 'mod' | 'admin';
    is_active: boolean;
    language: 'es' | 'en';
    permissions: UserPermission[];
    created_at: string;
    updated_at: string;
}

export interface Users {
    data: User[];
    links: {
      next: string | null;
      prev: string | null;
    };
    meta: {
      next_cursor: string | null;
    }
}