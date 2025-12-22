<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Google\Auth\OAuth2;
use Google\Shopping\Merchant\Accounts\V1beta\Client\AccountsServiceClient;
use Google\Shopping\Merchant\Accounts\V1beta\ListAccountsRequest;
use Google\ApiCore\CredentialsWrapper;

class GoogleMerchantController extends Controller
{
    private function getOAuth2Client()
    {
        return new OAuth2([
            'clientId' => config('services.google.client_id'),
            'clientSecret' => config('services.google.client_secret'),
            'authorizationUri' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'tokenCredentialUri' => 'https://oauth2.googleapis.com/token',
            'redirectUri' => config('services.google.redirect'),  // <-- Change here
            'scope' => 'https://www.googleapis.com/auth/content',
        ]);
    }

    // Step 1: Redirect User to Google
    public function connect(Request $request)
    {
        $oauth2 = $this->getOAuth2Client();

        // Pass the shop domain in the state so we know who is returning
        $state = base64_encode(json_encode(['shop' => $request->query('shop')]));

        $authUrl = $oauth2->buildFullAuthorizationUri([
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state
        ]);

        return response()->json(['url' => $authUrl]);
    }

    // Step 2: Handle Google Callback
    // Step 2: Handle Google Callback
    public function callback(Request $request)
    {
        // 1. Handle potential errors from Google
        if ($request->has('error')) {
            return response()->json(['error' => $request->error], 401);
        }

        $oauth2 = $this->getOAuth2Client();

        try {
            // 2. Exchange the Code for an Access Token array
            $oauth2->setCode($request->code);
            $authToken = $oauth2->fetchAuthToken();

            // 3. Extract the Shopify shop domain from the state
            $state = json_decode(base64_decode($request->state), true);
            $shopDomain = $state['shop'] ?? null;

            if (!$shopDomain) {
                throw new \Exception("Shop domain missing from state.");
            }

            // 4. Use the Merchant API to identify the Merchant Account ID
            $accountsClient = new AccountsServiceClient(['credentials' => $oauth2]);
            $listRequest = new ListAccountsRequest();
            $response = $accountsClient->listAccounts($listRequest);

            // Get the first available account
            $firstAccount = $response->iterateAllElements()->current();
            if (!$firstAccount) {
                throw new \Exception("No Google Merchant Center account found for this user.");
            }

            $merchantId = str_replace('accounts/', '', $firstAccount->getName());

            // 5. STORE IN DATABASE
            // We find the shop record in your database using the domain
            $shop = User::where('name', $shopDomain)->first();

            if ($shop) {
                $shop->update([
                    'google_merchant_id' => $merchantId,
                    'google_access_token' => $authToken['access_token'],
                    // Google only sends the refresh_token on the first connection.
                    // We only overwrite it if a new one is provided.
                    'google_refresh_token' => $authToken['refresh_token'] ?? $shop->google_refresh_token,
                    'google_token_expires_at' => now()->addSeconds($authToken['expires_in']),
                    'google_connected' => true,
                ]);
            }

            // 6. Redirect back to your Shopify App UI
            // I've used the slug you provided: google-feeds-app-2
            return redirect()->away("https://{$shopDomain}/admin/apps/google-feeds-app-2?merchantId={$merchantId}");

        } catch (\Exception $e) {
            \Log::error('Google Callback Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Connection failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}