<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Google\Auth\Credentials\UserRefreshCredentials;
use Google\Shopping\Merchant\Products\V1\Client\ProductsServiceClient;
use Google\Shopping\Merchant\Products\V1\ProductInput;
use Google\Shopping\Merchant\Products\V1\ProductAttributes;
use Google\Shopping\Merchant\Products\V1\Client\ProductInputsServiceClient;
// use Google\Shopping\Merchant\Products\V1\Price;
use Google\Shopping\Type\Price;
// use Google\Shopping\Merchant\Products\V1\InsertProductRequest;
use Google\Shopping\Merchant\Products\V1\InsertProductInputRequest;
use Google\Shopping\Merchant\Products\V1\Client\InsertProductRequest;
use Str;
use Illuminate\Support\Facades\Log;

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

        $query = file_get_contents(resource_path('qraphQl/get-product-details.txt'));

        $variables = ['id' => "gid://shopify/Product/{$productId}"];
        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
        $responseArray = $response['body']->toArray();

        $productData = $responseArray['data']['product'] ?? null;

        if (!$productData) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        // --- Process product media images (with ID for deletion) ---
        $images = [];
        if (isset($productData['media']['nodes'])) {
            foreach ($productData['media']['nodes'] as $media) {
                if ($media['mediaContentType'] === 'IMAGE' && isset($media['image']['url'])) {
                    $images[] = [
                        'id' => $media['id'],                    // Full GID for deletion
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
                $variantImage = $variant['image'] ?? null;

                $variants[] = [
                    'id' => Str::afterLast($variant['id'], '/'),
                    'title' => $variant['title'],
                    'price' => $variant['price'],
                    'compareAtPrice' => $variant['compareAtPrice'],
                    'sku' => $variant['sku'],
                    'barcode' => $variant['barcode'],
                    'inventoryPolicy' => $variant['inventoryPolicy'],
                    'imageUrl' => $variantImage['url'] ?? null,
                    'imageId' => $variantImage['id'] ?? null,  // ← CRITICAL: For deleting variant-specific image
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
        $variantId = $request->input('variantId'); // New field from frontend
        $file = $request->file('image');

        if (!$shopModel || !$file) {
            return response()->json(['success' => false, 'message' => 'Missing data'], 400);
        }

        // 1. Save locally and get URL (Your existing logic)
        $fileName = time() . '_' . str_replace(' ', '_', trim($file->getClientOriginalName()));
        $file->move(public_path('uploads'), $fileName);
        $publicUrl = url("uploads/{$fileName}");

        $gidProductId = str_contains($productId, 'gid://') ? $productId : "gid://shopify/Product/" . $productId;

        // 2. Create the Media item on the Product
        $createMediaQuery = file_get_contents(resource_path('qraphQl/product-create-media.txt'));
        $createMediaVars = [
            'productId' => $gidProductId,
            'media' => [
                [
                    'mediaContentType' => 'IMAGE',
                    'originalSource' => $publicUrl,
                    'alt' => $file->getClientOriginalName()
                ]
            ]
        ];

        $response = callShopifyGraphQL($shop, $shopModel, $createMediaQuery, $createMediaVars);
        $body = $response['body']->toArray();

        if (empty($body['data']['productCreateMedia']['media'])) {
            return response()->json(['success' => false, 'errors' => $body], 422);
        }

        $newMediaId = $body['data']['productCreateMedia']['media'][0]['id'];

        // 3. IF Variant ID is present, LINK IT to the variant
        if ($variantId) {
            $gidVariantId = str_contains($variantId, 'gid://') ? $variantId : "gid://shopify/ProductVariant/" . $variantId;

            $bulkUpdateQuery = <<<'GRAPHQL'
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
        GRAPHQL;

            $bulkUpdateVars = [
                'productId' => $gidProductId,
                'variants' => [
                    [
                        'id' => $gidVariantId,
                        'mediaId' => $newMediaId
                    ]
                ]
            ];

            callShopifyGraphQL($shop, $shopModel, $bulkUpdateQuery, $bulkUpdateVars);
        }

        return response()->json([
            'success' => true,
            'media' => [
                'id' => $newMediaId,
                'url' => $publicUrl,
                'alt' => $file->getClientOriginalName()
            ]
        ]);
    }

    public function syncProducts(Request $request)
    {
        $shopDomain = $request->input('shop');
        $shopModel = User::where('name', $shopDomain)->first();

        if (!$shopModel) {
            return response()->json(['error' => 'Shop not found'], 404);
        }

        try {
            $credentials = new UserRefreshCredentials(
                'https://www.googleapis.com/auth/content',
                [
                    'client_id' => config('services.google.client_id'),
                    'client_secret' => config('services.google.client_secret'),
                    'refresh_token' => $shopModel->google_refresh_token,
                ]
            );

            // $productsClient = new ProductsServiceClient(['credentials' => $credentials]);
            $productsClient = new ProductInputsServiceClient(['credentials' => $credentials]);
            $merchantId = trim((string) $shopModel->google_merchant_id);
            $parent = "accounts/{$merchantId}";
            $dataSource = "accounts/{$merchantId}/dataSources/default";

            $ids = $request->input('product_ids');
            if (!is_array($ids)) {
                $ids = explode(',', $ids);
            }
            $ids = array_map(fn($id) => 'gid://shopify/Product/' . trim($id), $ids);

            $query = file_get_contents(resource_path('qraphQl/get-products-detail.txt'));
            $response = callShopifyGraphQL($shopDomain, $shopModel, $query, ['ids' => $ids]);
            $products = $response['body']['data']['nodes'] ?? [];

            // dd($products);

            $synced = 0;
            $errors = [];

            foreach ($products as $shopifyProduct) {
                foreach ($shopifyProduct['variants']['nodes'] as $variant) {
                    try {
                        $attributes = new ProductAttributes();
                        $attributes->setTitle($shopifyProduct['title']);
                        $attributes->setDescription(substr(strip_tags($shopifyProduct['descriptionHtml'] ?? ''), 0, 5000));
                        $attributes->setLink("https://{$shopDomain}/products/{$shopifyProduct['handle']}");
                        $attributes->setBrand($shopifyProduct['vendor'] ?: 'Generic');
                        $attributes->setCondition(1);
                        $attributes->setAvailability(1);

                        /* -------------------------------------------------
                        | FINAL PRICE FIX - Cast to int safely (64-bit PHP)
                        * -------------------------------------------------*/
                        $rawPrice = (string) $variant['price'];

                        $microsString = bcmul($rawPrice, '1000000', 0);

                        $microsInt = (int) ltrim($microsString, '0') ?: 0;

                        Log::info("Processing Variant Price: " . $variant['id'], [
                            'variant_id' => $variant['id'],
                            'raw_price' => $rawPrice,
                            'micros_string' => $microsString,
                            'micros_int' => $microsInt,
                            'int_type' => gettype($microsInt),
                            'php_int_size' => PHP_INT_SIZE,
                            'php_int_max' => PHP_INT_MAX
                        ]);

                        $price = new Price();
                        $price->setAmountMicros($microsInt);
                        $price->setCurrencyCode('USD');
                        $attributes->setPrice($price);
                        /* ------------------------------------------------- */

                        if (!empty($shopifyProduct['images']['nodes'][0]['url'])) {
                            $attributes->setImageLink($shopifyProduct['images']['nodes'][0]['url']);
                        }

                        $productInput = new ProductInput();
                        $productInput->setOfferId((string) str_replace('gid://shopify/ProductVariant/', '', $variant['id']));
                        $productInput->setContentLanguage('en');
                        $productInput->setFeedLabel('US');
                        $productInput->setProductAttributes($attributes);

                        // Use InsertProductInputRequest, not InsertProductRequest
                        $request = new InsertProductInputRequest();
                        $request->setParent($parent);
                        $request->setProductInput($productInput); // Method is setProductInput
                        $request->setDataSource($dataSource);

                        // 3. Call the correct method
                        $productsClient->insertProductInput($request);
                        dd("there");



                        $synced++;

                    } catch (\Throwable $e) {
                        Log::error("Variant Sync Error: " . $e->getMessage(), [
                            'variant_id' => $variant['id'] ?? 'unknown',
                            'trace' => $e->getTraceAsString()
                        ]);
                        $errors[] = "Variant {$variant['id']}: " . $e->getMessage();
                        dd($errors);
                    }
                }
            }

            return response()->json([
                'success' => count($errors) === 0,
                'synced' => $synced,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            Log::error("SyncProducts General Error: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateVariants(Request $request)
    {
        $shop = $request->input('shop');
        $productId = $request->input('productId');
        $variants = $request->input('variants');

        $shopModel = User::where('name', $shop)->first();

        if (!$shopModel) {
            return response()->json(['success' => false, 'error' => 'Shop not found'], 404);
        }

        // 1. Format the variants for the ProductVariantsBulkInput schema
        $formattedVariants = array_map(function ($variant) {
            // Core fields at the root of the input
            $input = [
                'id' => "gid://shopify/ProductVariant/{$variant['id']}",
                'price' => (string) $variant['price'],
            ];

            // Barcode is a root-level field in ProductVariantsBulkInput
            if (isset($variant['barcode']) && (string) $variant['barcode'] !== "") {
                $input['barcode'] = (string) $variant['barcode'];
            }

            if (isset($variant['compareAtPrice']) && (string) $variant['compareAtPrice'] !== "") {
                $input['compareAtPrice'] = (string) $variant['compareAtPrice'];
            }

            if (!empty($variant['inventoryPolicy'])) {
                $input['inventoryPolicy'] = strtoupper($variant['inventoryPolicy']);
            }

            // SKU belongs inside the inventoryItem object
            $inventoryItem = [];
            if (isset($variant['sku']) && (string) $variant['sku'] !== "") {
                $inventoryItem['sku'] = (string) $variant['sku'];
            }

            if (!empty($inventoryItem)) {
                $input['inventoryItem'] = $inventoryItem;
            }

            return $input;
        }, $variants);

        // 2. Load the mutation from your txt file
        $query = file_get_contents(resource_path('qraphQl/update-variants.txt'));

        // 3. Prepare Variables
        $variables = [
            'productId' => "gid://shopify/Product/{$productId}",
            'variants' => $formattedVariants,
        ];

        // 4. Execute using your helper function
        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);

        // 5. Structure the result for consistency with updateProducts
        $responseData = $response['body']['data'] ?? null;

        $finalResults = [
            'product_id' => $productId,
            'response' => $responseData,
            'errors' => $response['body']['errors'] ?? null
        ];

        // Check for userErrors (business logic errors like "invalid price")
        $userErrors = $responseData['productVariantsBulkUpdate']['userErrors'] ?? [];

        return response()->json([
            'success' => empty($userErrors) && !isset($response['body']['errors']),
            'results' => [$finalResults]
        ]);
    }

    // public function attachMediaToVariant(Request $request)
    // {
    //     $shop = $request->input('shop');
    //     $shopModel = User::where('name', $shop)->first();

    //     if (!$shopModel) {
    //         return response()->json(['error' => 'Shop not found'], 404);
    //     }

    //     $variantId = $request->input('variantId');
    //     $mediaId = $request->input('mediaId');
    //     $productId = $request->input('productId'); 

    //     // dd($productId);

    //     // Ensure Global IDs
    //     $gidVariantId = str_contains($variantId, 'gid://') ? $variantId : "gid://shopify/ProductVariant/" . $variantId;
    //     $gidProductId = str_contains($productId, 'gid://') ? $productId : "gid://shopify/Product/" . $productId;

    //     $query = file_get_contents(resource_path('qraphQl/attach-media-to-variant.txt'));

    //     // NEW: ProductVariantsBulkInput structure
    //     $variables = [
    //         'productId' => $gidProductId,
    //         'variants' => [
    //             [
    //                 'id' => $gidVariantId,
    //                 'mediaIds' => [$mediaId] // mediaIds is an array in the new API
    //             ]
    //         ]
    //     ];

    //     $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
    //     $body = $response['body']->toArray();

    //     // 1. Check for top-level GraphQL errors
    //     if (isset($body['errors'])) {
    //         return response()->json(['success' => false, 'errors' => $body['errors']], 400);
    //     }

    //     $data = $body['data']['productVariantsBulkUpdate'];

    //     // 2. Check for Shopify business logic errors
    //     if (!empty($data['userErrors'])) {
    //         return response()->json([
    //             'success' => false,
    //             'errors' => $data['userErrors']
    //         ], 422);
    //     }

    //     // 3. Get the first updated variant from the returned array
    //     $updatedVariant = $data['productVariants'][0] ?? null;

    //     return response()->json([
    //         'success' => true,
    //         'variant' => $updatedVariant
    //     ]);
    // }


    public function removeVariantMedia(Request $request)
    {
        $shop = $request->shop;
        $shopModel = User::where('name', $shop)->first();
        $variantId = $request->variantId;
        $productId = $request->productId;

        // dd($variantId, $productId);

        $query = file_get_contents(resource_path('qraphQl/remove-variant-image.txt'));

        $variables = [
            "productId" => "gid://shopify/Product/{$productId}",
            "variants" => [
                [
                    "id" => "gid://shopify/ProductVariant/{$variantId}",
                    "mediaId" => null // Use singular 'mediaId' and set to null
                ]
            ]
        ];

        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
        $result = $response['body']->toArray();

        if (!empty($result['data']['productVariantUpdate']['userErrors'])) {
            return response()->json([
                'success' => false,
                'errors' => $result['data']['productVariantUpdate']['userErrors']
            ], 422);
        }

        return response()->json(['success' => true]);
    }

    public function uploadVariantImage(Request $request)
    {
        $shop = $request->shop;
        $shopModel = User::where('name', $shop)->first();
        $variantId = $request->variantId;
        $productId = $request->productId;
        $image = $request->image;

        // dd($variantId, $productId, $image);

        $query = file_get_contents(resource_path('qraphQl/upload-variant-image.txt'));

        $variables = [
            "productId" => "gid://shopify/Product/{$productId}",
            "variants" => [
                [
                    "id" => "gid://shopify/ProductVariant/{$variantId}",
                    "mediaId" => null // Use singular 'mediaId' and set to null
                ]
            ]
        ];

        $response = callShopifyGraphQL($shop, $shopModel, $query, $variables);
        dd($response);
    }
}
