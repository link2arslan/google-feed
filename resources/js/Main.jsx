import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { Provider } from "react-redux";
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
import { Frame } from "@shopify/polaris"; // Add Frame import

// Local imports
// import { store } from "./store/store";
import PolarisProvider from "./components/PolarisProvider";
import ClientRouter from "./components/ClientRouter";
import AppNavigation from "./components/AppNavigation";
import Home from "./pages/Home";
import Products from "./pages/Products";
import EditProduct from "./pages/EditProduct";
import BulkEditProducts from "./components/BulkEditProducts";

// Shopify App Bridge config
const appBridgeConfig = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host: new URLSearchParams(window.location.search).get("host"),
    forceRedirect: true,
};

// Apollo provider using App Bridge fetch
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
                {/* <Provider store={store}> */}
                    <AppBridgeProvider config={appBridgeConfig}>
                        <AppBridgeApolloProvider>
                            <Frame>
                                {" "}
                                {/* Add Frame here */}
                                <AppNavigation />
                                <ClientRouter />
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/products" element={<Products />} />
                                    <Route path="/products/:id/edit" element={<EditProduct />} />
                                    <Route path="/products/bulk" element={<BulkEditProducts />} />
                                </Routes>
                                {/* <DebugRedux /> */}
                            </Frame>
                        </AppBridgeApolloProvider>
                    </AppBridgeProvider>
                {/* </Provider> */}
            </PolarisProvider>
        </BrowserRouter>
    );
};

export default Main;