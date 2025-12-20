import { getSessionToken } from "@shopify/app-bridge-utils";

const fetchSessionToken = async ({ app }) => {
    try {
        if (!app) {
            throw new Error("App Bridge instance is required");
        }
        const token = await getSessionToken(app);
        return token;
    } catch (error) {
        console.error("Error fetching session token:", error);
        throw new Error("Failed to fetch session token");
    }
};

export default fetchSessionToken;