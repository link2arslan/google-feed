<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\GoogleMerchantController;

Route::prefix('api')->group(function () {
    Route::get('/home', [HomeController::class, 'index'])->middleware(['verify.shopify']);
    Route::get('/products', [ProductController::class, 'products'])->middleware(['verify.shopify']);
    Route::get('/product', [ProductController::class, 'getProductDetails'])->middleware(['verify.shopify']);
    Route::post('/product/update', [ProductController::class, 'updateSingleProduct'])->middleware(['verify.shopify']);
    Route::get('/products/bulk', [ProductController::class, 'bulkProducts'])->middleware(['verify.shopify']);
    Route::post('/products/bulk-update', [ProductController::class, 'updateProducts'])->middleware(['verify.shopify']);
    // Route::post('/staged-uploads', [ProductController::class, 'generateStagedUpload'])->middleware(['verify.shopify']);
    Route::post('/product/media/delete', [ProductController::class, 'deleteMedia'])->middleware(['verify.shopify']);
    Route::post('/product/media/upload', [ProductController::class, 'uploadMedia'])->middleware(['verify.shopify']);

    Route::post('/variants/update', [ProductController::class, 'updateVariants'])->middleware(['verify.shopify']);
    Route::post('/variant/media/remove', [ProductController::class, 'removeVariantMedia'])->middleware(['verify.shopify']);
    // Route::post('/product/variant/attach-media', [ProductController::class, 'attachMediaToVariant'])->middleware(['verify.shopify']);

    Route::post('/variant/media/upload', [ProductController::class, 'uploadVariantImage'])->middleware(['verify.shopify']);


    Route::get('/google/connect', [GoogleMerchantController::class, 'connect']);
    Route::get('/google/callback', [GoogleMerchantController::class, 'callback']);

    // Route::post('/metrics', function (Request $request) {
    //     // navigator.sendBeacon sends a raw string, not a standard form request
    //     $data = json_decode($request->getContent(), true);

    //     \Log::info('Web Vitals Data:', $data);

    //     return response()->noContent();
    // })->middleware(['verify.shopify']);


    Route::post('/my-web-vitals', function (Request $request) {
        \Log::info('=== CUSTOM WEB VITALS HIT ===');
        \Log::info('Headers: ', $request->headers->all());
        \Log::info('Raw body: ' . $request->getContent());

        $data = json_decode($request->getContent(), true);

        if ($data) {
            \Log::info('Custom Web Vitals Metrics:', $data);
            // Also log to a separate file for easier tracking
            \Storage::append('web-vitals.log', date('Y-m-d H:i:s') . ' - ' . json_encode($data));
        } else {
            \Log::warning('JSON decode failed: ' . json_last_error_msg());
            \Log::warning('Content type: ' . $request->header('Content-Type', 'Not set'));
        }

        return response()->json(['status' => 'received'], 200);
    })->middleware(['verify.shopify']);

    Route::post('/products/sync', [ProductController::class, 'syncProducts'])->middleware(['verify.shopify']);
});


Route::get('/', function () {
    return view('app');
})->middleware(['verify.shopify'])->name('home');

Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');



