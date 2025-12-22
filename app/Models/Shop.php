<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    protected $fillable = [
    'name', 
    'google_merchant_id', 
    'google_access_token', 
    'google_refresh_token', 
    'google_token_expires_at',
    'google_connected'
];
}
