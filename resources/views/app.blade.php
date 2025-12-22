<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Laravel 9 vite with react</title>

    <!-- <meta name="csrf-token" content="{{ csrf_token() }}"> -->
    <meta name="shopify-debug" content="web-vitals">

    @viteReactRefresh
    @vite('resources/js/app.jsx')
    <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
</head>

<body>
    <div id="app"></div>
</body>

</html>