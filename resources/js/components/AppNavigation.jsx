import React, { useEffect, useRef } from "react";
import { AppLink, NavigationMenu } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useLocation, useNavigate } from "react-router-dom";

function AppNavigation() {
    const app = useAppBridge();
    const location = useLocation();
    const navigate = useNavigate();
    const linksRef = useRef({});
    const navigationMenuRef = useRef(null);

    // Define navigation items
    const items = [
        {
            key: "home",
            label: "Home",
            destination: "/",
        },
        {
            key: "products",
            label: "Products",
            destination: "/products",
        },
    ];

    // Handle navigation click
    const handleNavigationClick = (key, destination) => {
        console.log(`🔍 Navigation link clicked: ${key} to ${destination}`);
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get("shop");
        if (shop) {
            navigate(`${destination}?shop=${encodeURIComponent(shop)}`);
        } else {
            navigate(destination);
        }
    };

    // Create navigation menu
    useEffect(() => {
        const links = {};
        const appLinks = items.map((item) => {
            const link = AppLink.create(app, {
                label: item.label,
                destination: item.destination,
            });
            link.subscribe("click", () => {
                handleNavigationClick(item.key, item.destination);
            });
            links[item.key] = link;
            return link;
        });

        linksRef.current = links;

        const navigationMenu = NavigationMenu.create(app, {
            items: appLinks,
        });

        navigationMenuRef.current = navigationMenu;

        const activeItem = findActiveItem(location.pathname, items);
        if (activeItem) {
            navigationMenu.set({
                active: linksRef.current[activeItem.key],
            });
        }
    }, [app]);

    // Update active link when route changes
    useEffect(() => {
        if (!navigationMenuRef.current) return;

        const activeItem = findActiveItem(location.pathname, items);
        if (activeItem) {
            navigationMenuRef.current.set({
                active: linksRef.current[activeItem.key],
            });
        }
    }, [location.pathname]);

    return null;
}

function findActiveItem(pathname, items) {
    return (
        items.find((item) =>
            item.destination === "/"
                ? pathname === "/"
                : pathname.startsWith(item.destination)
        ) || null
    );
}

export default AppNavigation;
