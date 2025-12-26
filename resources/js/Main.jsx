import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// 1. REMOVED Provider/AppBridgeProvider
import { useAppBridge } from "@shopify/app-bridge-react";
import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    HttpLink,
} from "@apollo/client";
// 2. Note: userLoggedInFetch is still used for Apollo in v4
import { authenticatedFetch as userLoggedInFetch } from "@shopify/app-bridge-utils";
import { Frame } from "@shopify/polaris";
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

import PolarisProvider from "./components/PolarisProvider";
import ClientRouter from "./components/ClientRouter";
import AppNavigation from "./components/AppNavigation";
import Home from "./pages/Home";
import Products from "./pages/Products";
import EditProduct from "./pages/EditProduct";
import BulkEditProducts from "./components/BulkEditProducts";
import fetchSessionToken from "./utils/fetchSessionToken";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const shop = new URL(window.location.href).searchParams.get("shop");
console.log(shop,'hello dear');
const WebVitalsLogger = () => {
    const app = useAppBridge();
    
    useEffect(() => {
        const sendToAnalytics = async (metric) => {
            try {
                const token = await fetchSessionToken({ app });
                await axios.post("/api/my-web-vitals", metric, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });
            } catch (error) {
                console.error("Error sending web vitals:", error);
            }
        };
        
        onCLS(sendToAnalytics);
        onFID(sendToAnalytics);
        onFCP(sendToAnalytics);
        onLCP(sendToAnalytics);
        onTTFB(sendToAnalytics);
    }, [app]);

    return null;
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
                {/* 3. Provider is GONE. Wrapping directly in Apollo & Logic */}
                <AppBridgeApolloProvider>
                    <WebVitalsLogger />
                    <Frame>
                        <AppNavigation shop={shop} />
                        {/* <ClientRouter /> */}
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/products" element={<Products />} />
                            <Route path="/products/edit/:id" element={<EditProduct />} />
                            <Route path="/products/bulk" element={<BulkEditProducts />} />
                        </Routes>
                    </Frame>
                </AppBridgeApolloProvider>
            </PolarisProvider>
        </BrowserRouter>
    );
};

export default Main;