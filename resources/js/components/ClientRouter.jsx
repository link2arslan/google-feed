import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";

const ClientRouter = () => {
    const app = useAppBridge();
    const location = useLocation();

    useEffect(() => {
        if (!app) return;

        const redirect = Redirect.create(app);

        const unsubscribe = app.subscribe(
            "APP::NAVIGATION::REDIRECT",
            ({ path }) => {
                if (path !== location.pathname) {
                    redirect.dispatch(Redirect.Action.APP, path);
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
