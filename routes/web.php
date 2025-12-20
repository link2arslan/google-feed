<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProductController;

Route::prefix('api')->group(function () {
    Route::get('/home', [HomeController::class, 'index'])->middleware(['verify.shopify']);
    Route::get('/products', [ProductController::class, 'products'])->middleware(['verify.shopify']);
    Route::get('/product', [ProductController::class, 'getProductDetails'])->middleware(['verify.shopify']);
    Route::post('/product/update', [ProductController::class, 'updateSingleProduct'])->middleware(['verify.shopify']);
    Route::get('/products/bulk', [ProductController::class, 'bulkProducts'])->middleware(['verify.shopify']);
    Route::post('/products/bulk-update', [ProductController::class, 'updateProducts'])->middleware(['verify.shopify']);
    // Route::post('/staged-uploads', [ProductController::class, 'generateStagedUpload'])->middleware(['verify.shopify']);
    Route::post('/product/media/delete', [ProductController::class, 'deleteMedia'])->middleware(['verify.shopify']);
});

Route::get('/', function () {
    return view('app');
})->middleware(['verify.shopify'])->name('home');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');



