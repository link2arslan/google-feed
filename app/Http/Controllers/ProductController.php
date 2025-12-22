<?php

namespace App\Http\Controllers;

use Illuminate\Support\Str;
use App\Models\User;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function products(Request $request)
    {
        $shop = $request->query('shop');
        $shopModel = User::where('name', $shop)->first();

        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        $query = file_get_contents(resource_path('qraphQl/get-products.txt'));
        $response = callShopifyGraphQL($shop, $shopModel, $query);
        $responseArray = $response['body']->toArray();

        // Extract the product data we need for the frontend
        $products = [];
        if (isset($responseArray['data']['products']['edges'])) {
            foreach ($responseArray['data']['products']['edges'] as $edge) {
                $node = $edge['node'];
                $product = [
                    'id' => Str::afterLast($node['id'], '/'),
                    'title' => $node['title'],
                ];

                // Add featured image URL if available
                if (isset($node['featuredImage']['url'])) {
                    $product['imageUrl'] = $node['featuredImage']['url'];
                } else {
                    $product['imageUrl'] = null;
                }

                $products[] = $product;
            }
        }

        // Return JSON response for the API endpoint
        return response()->json([
            'products' => $products
        ]);
    }

    public function getProductDetails(Request $request)
    {
        $shop = $request->query('shop');
        $productId = $request->query('productId');
        $shopModel = User::where('name', $shop)->first();

        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        // Ensure your .txt file includes the "id" field inside media { nodes { id ... } }
        $query = file_get_contents(resource_path('qraphQl/get-product-details.txt'));

        $variables = ['id' => "gid://shopify/Product/{$productId}"];
        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
        $responseArray = $response['body']->toArray();

        $productData = $responseArray['data']['product'] ?? null;

        if (!$productData) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        // --- Process media images (Now including ID) ---
        $images = [];
        if (isset($productData['media']['nodes'])) {
            foreach ($productData['media']['nodes'] as $media) {
                if ($media['mediaContentType'] === 'IMAGE' && isset($media['image']['url'])) {
                    $images[] = [
                        'id' => $media['id'], // CRITICAL: This allows immediate deletion
                        'url' => $media['image']['url'],
                        'alt' => $media['alt'] ?? ''
                    ];
                }
            }
        }

        // --- Process variants ---
        $variants = [];
        if (isset($productData['variants']['nodes'])) {
            foreach ($productData['variants']['nodes'] as $variant) {
                $variants[] = [
                    'id' => Str::afterLast($variant['id'], '/'),
                    'title' => $variant['title'],
                    'price' => $variant['price'],
                    'compareAtPrice' => $variant['compareAtPrice'],
                    'sku' => $variant['sku'],
                    'barcode' => $variant['barcode'],
                    'inventoryPolicy' => $variant['inventoryPolicy'],
                    // Add variant image URL so the Variant Tab shows the correct thumbnail
                    'imageUrl' => $variant['image']['url'] ?? null,
                    'weight' => [
                        'value' => $variant['inventoryItem']['measurement']['weight']['value'] ?? null,
                        'unit' => $variant['inventoryItem']['measurement']['weight']['unit'] ?? null
                    ]
                ];
            }
        }

        $responseData = [
            'title' => $productData['title'],
            'description' => $productData['descriptionHtml'],
            'status' => strtolower($productData['status']),
            'vendor' => $productData['vendor'],
            'media' => $images,
            'variants' => $variants
        ];

        return response()->json($responseData);
    }

    public function bulkProducts(Request $request)
    {
        $shop = $request->query('shop');
        $shopModel = User::where('name', $shop)->first();
        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        $ids = $request->query('ids');
        $ids = explode(',', $ids);

        // Convert IDs to Shopify format
        $ids = array_map(function ($id) {
            return 'gid://shopify/Product/' . $id;
        }, $ids);

        $query = file_get_contents(resource_path('qraphQl/get-products-detail.txt'));
        $variables = ['ids' => $ids];
        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
        $responseArray = $response['body']->toArray();

        // Process the response data
        $products = [];

        if (isset($responseArray['data']['nodes'])) {
            foreach ($responseArray['data']['nodes'] as $node) {
                // Skip if node is null (product not found)
                if (!$node)
                    continue;

                // Process media images
                $images = [];
                if (isset($node['images']['nodes'])) {
                    foreach ($node['images']['nodes'] as $image) {
                        $images[] = [
                            'url' => $image['url'],
                            'alt' => $image['altText'] ?? ''
                        ];
                    }
                }

                // Process variants
                $variants = [];
                if (isset($node['variants']['nodes'])) {
                    foreach ($node['variants']['nodes'] as $variant) {
                        $variants[] = [
                            'id' => Str::afterLast($variant['id'], '/'),
                            'title' => $variant['title'],
                            'price' => $variant['price'],
                            'compareAtPrice' => $variant['compareAtPrice'],
                            'sku' => $variant['sku'],
                            'barcode' => $variant['barcode'],
                            'inventoryPolicy' => $variant['inventoryPolicy'],
                            'weight' => [
                                'value' => $variant['inventoryItem']['measurement']['weight']['value'] ?? null,
                                'unit' => $variant['inventoryItem']['measurement']['weight']['unit'] ?? null
                            ]
                        ];
                    }
                }

                $products[] = [
                    'id' => Str::afterLast($node['id'], '/'),
                    'title' => $node['title'],
                    'description' => $node['descriptionHtml'],
                    'status' => strtolower($node['status']),
                    'vendor' => $node['vendor'],
                    'productType' => $node['productType'],
                    'media' => $images,
                    'variants' => $variants
                ];
            }
        }

        return response()->json($products);
    }

    public function updateProducts(Request $request)
    {
        $shop = $request->input('shop');
        $shopModel = User::where('name', $shop)->first();

        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        $products = $request->input('products');
        $query = file_get_contents(resource_path('qraphQl/update-products.txt'));
        $finalResults = [];

        foreach ($products as $product) {
            $gidProductId = "gid://shopify/Product/" . $product['id'];

            $variantInput = array_map(function ($variant) {
                return [
                    'id' => "gid://shopify/ProductVariant/" . $variant['id'],
                    'price' => (string) $variant['price'],
                ];
            }, $product['variants']);

            $variables = [
                'productId' => $gidProductId,
                'productInput' => [
                    'id' => $gidProductId,
                    'status' => strtoupper($product['status']),
                    'vendor' => $product['vendor'],
                    'productType' => $product['productType'],
                ],
                'variantInput' => $variantInput
            ];

            $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);

            // Store results to return to frontend
            $finalResults[] = [
                'product_id' => $product['id'],
                'response' => $response['body']['data'] ?? null,
                'errors' => $response['body']['errors'] ?? null
            ];
        }

        return response()->json([
            'success' => true,
            'results' => $finalResults
        ]);
    }

    public function updateSingleProduct(Request $request)
    {
        $shop = $request->input('shop');
        $shopModel = User::where('name', $shop)->first();

        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        $rawId = $request->input('productId');
        $gidProductId = str_contains($rawId, 'gid://') ? $rawId : "gid://shopify/Product/" . $rawId;

        // 1. Update basic Product Info (Title, Desc, etc.)
        $updateQuery = file_get_contents(resource_path('qraphQl/update-single-product.txt'));
        $productInput = [
            'id' => $gidProductId,
            'title' => $request->input('title'),
            'descriptionHtml' => $request->input('description'),
            'status' => strtoupper($request->input('status')),
            'vendor' => $request->input('vendor'),
        ];

        callShopifyGraphQL($shop, $shopModel, $updateQuery, ['input' => $productInput]);

        return response()->json(['success' => true]);
    }

    public function deleteMedia(Request $request)
    {
        $shop = $request->input('shop');
        $shopModel = User::where('name', $shop)->first();

        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        $productId = $request->input('productId');
        $mediaId = $request->input('mediaId');

        // Ensure Product ID is in GID format
        $gidProductId = str_contains($productId, 'gid://')
            ? $productId
            : "gid://shopify/Product/" . $productId;

        // Ensure Media ID is in GID format
        $gidMediaId = str_contains($mediaId, 'gid://')
            ? $mediaId
            : "gid://shopify/ProductImage/" . $mediaId;

        // Load the mutation from your text file
        $query = file_get_contents(resource_path('qraphQl/delete-product-image.txt'));

        // Variables must match the names in your .txt file ($mediaIds and $productId)
        $variables = [
            'productId' => $gidProductId,
            'mediaIds' => [$gidMediaId] // Must be an array
        ];

        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);

        // Check for userErrors in the response
        $body = $response['body']->toArray();
        if (!empty($body['data']['productDeleteMedia']['userErrors'])) {
            return response()->json([
                'success' => false,
                'errors' => $body['data']['productDeleteMedia']['userErrors']
            ], 422);
        }

        return response()->json(['success' => true, 'data' => $body]);
    }


    public function uploadMedia(Request $request)
    {
        $shop = $request->input('shop');
        $shopModel = User::where('name', $shop)->first();
        $productId = $request->input('productId');
        $file = $request->file('image');

        if (!$shopModel || !$file) {
            return response()->json(['success' => false, 'message' => 'Missing data'], 400);
        }

        $fileName = time() . '_' . str_replace(' ', '_', trim($file->getClientOriginalName()));
        $file->move(public_path('uploads'), $fileName);
        $publicUrl = url("uploads/{$fileName}");

        $gidProductId = str_contains($productId, 'gid://') ? $productId : "gid://shopify/Product/" . $productId;
        $query = file_get_contents(resource_path('qraphQl/product-create-media.txt'));

        $variables = [
            'productId' => $gidProductId,
            'media' => [
                [
                    'mediaContentType' => 'IMAGE',
                    'originalSource' => $publicUrl,
                    'alt' => $file->getClientOriginalName()
                ]
            ]
        ];

        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
        $body = $response['body']->toArray();

        // 3. Extract the newly created Media object
        if (!empty($body['data']['productCreateMedia']['media'])) {
            $newMedia = $body['data']['productCreateMedia']['media'][0];
            
            return response()->json([
                'success' => true,
                'media' => [
                    'id' => $newMedia['id'],
                    'url' => $publicUrl, // we can also get Shopify's CDN URL if we query it back
                    'alt' => $file->getClientOriginalName()
                ]
            ]);
        }

        return response()->json(['success' => false, 'errors' => $body], 422);
    }

    
}
