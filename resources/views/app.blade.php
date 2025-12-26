<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Laravel 9 vite with react</title>

    <meta name="shopify-api-key" content="{{ env('SHOPIFY_API_KEY') }}">

    <!-- Debug mode - keep for now, remove later -->
    <meta name="shopify-debug" content="web-vitals">

    @viteReactRefresh
    @vite('resources/js/app.jsx')

    <meta name="shopify-api-key" content="{{ env('SHOPIFY_API_KEY') }}" />
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    


</head>

<body>
    <div id="app"></div>
</body>

</html> 