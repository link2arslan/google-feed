import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

const ClientRouter = () => {
    const app = useAppBridge();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!app) return;

        const unsubscribe = app.subscribe(
            "APP::NAVIGATION::REDIRECT",
            ({ path }) => {
                if (path !== location.pathname) {

                    // This is the App Bridge v4 direct way

                    if (window.shopify && window.shopify.config && window.shopify.config.navigation) {

                        window.shopify.config.navigation.navigate(path + window.location.search);

                    } else {

                        // Fallback for local development

                        navigate(path + window.location.search);

                    }
                }
            }
        );

        return () => {
            unsubscribe();
        };
    }, [app, location.pathname]);

    return null;
};

export default ClientRouter;
