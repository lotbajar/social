<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Permission::firstOrCreate(['name' => 'post']);
        Permission::firstOrCreate(['name' => 'comment']);
        Permission::firstOrCreate(['name' => 'react']);
        Permission::firstOrCreate(['name' => 'update_username']);
        Permission::firstOrCreate(['name' => 'update_avatar']);
    }
}