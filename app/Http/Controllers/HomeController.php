<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class HomeController extends Controller
{
    public function index()
    {
        $shop = request()->query('shop');

        $shopModel = User::where('name', $shop)->first();
        if (!$shopModel) {
            return response()->json([
                'message' => 'Shop not found'
            ], 404);
        }

        // get file from qraphQl folder named get-active-products-count.txt
        $query = file_get_contents(resource_path('qraphQl/get-active-products-count.txt'));

        $response = callShopifyGraphQL($shop, $shopModel, $query);
        $responseBody = $response['body']->toArray();
        $productCount = $responseBody['data']['productsCount']['count'];

        $merchantId = $shopModel->google_merchant_id ?? null;
        $gmcConnected = $shopModel->google_connected ?? false;
        
        return response()->json([
            'productCount' => $productCount,
            'merchantId' => $merchantId ?? null,
            'gmcConnected' => $gmcConnected
        ]);
    }
}
