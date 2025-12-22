import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
    useAppBridge,
    Provider as AppBridgeProvider,
} from "@shopify/app-bridge-react";
import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    HttpLink,
} from "@apollo/client";
import { authenticatedFetch as userLoggedInFetch } from "@shopify/app-bridge-utils";
import { Frame } from "@shopify/polaris";

// Local imports
import PolarisProvider from "./components/PolarisProvider";
import ClientRouter from "./components/ClientRouter";
import AppNavigation from "./components/AppNavigation";
import Home from "./pages/Home";
import Products from "./pages/Products";
import EditProduct from "./pages/EditProduct";
import BulkEditProducts from "./components/BulkEditProducts";

// --- NEW COMPONENT: Web Vitals Listener ---
// const WebVitalsLogger = () => {
//     useEffect(() => {
//         // App Bridge 4.0+ uses window.shopify
//         if (window.shopify && window.shopify.webVitals) {
//             console.log("Web Vitals Listener Registered");
//             window.shopify.webVitals.onReport((metrics) => {
//                 const body = JSON.stringify(metrics);
//                 // Laravel endpoint - ensure this route is in api.php
//                 const url = "/api/metrics"; 

//                 if (navigator.sendBeacon) {
//                     navigator.sendBeacon(url, body);
//                 } else {
//                     fetch(url, { body, method: "POST", keepalive: true });
//                 }
//             });
//         }
//     }, []);

//     return null; // This component doesn't render anything
// };

const appBridgeConfig = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host: new URLSearchParams(window.location.search).get("host"),
    forceRedirect: true,
};

function AppBridgeApolloProvider({ children }) {
    const app = useAppBridge();

    const client = new ApolloClient({
        link: new HttpLink({
            credentials: "same-origin",
            fetch: userLoggedInFetch(app),
            uri: "/graphql",
        }),
        cache: new InMemoryCache(),
    });

    return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

const Main = () => {
    return (
        <BrowserRouter>
            <PolarisProvider>
                <AppBridgeProvider config={appBridgeConfig}>
                    <AppBridgeApolloProvider>
                        {/* 1. Add the Logger here */}
                        {/* <WebVitalsLogger />  */}
                        
                        <Frame>
                            <AppNavigation />
                            <ClientRouter />
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/products" element={<Products />} />
                                <Route path="/products/:id/edit" element={<EditProduct />} />
                                <Route path="/products/bulk" element={<BulkEditProducts />} />
                            </Routes>
                        </Frame>
                    </AppBridgeApolloProvider>
                </AppBridgeProvider>
            </PolarisProvider>
        </BrowserRouter>
    );
};

export default Main;