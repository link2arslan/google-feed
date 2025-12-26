const fetchSessionToken = async () => {
    try {
        // In v4, we use the global shopify object
        if (typeof window.shopify === 'undefined') {
            throw new Error("Shopify App Bridge script not loaded");
        }
        
        const token = await window.shopify.idToken();
        return token;
    } catch (error) {
        console.error("Error fetching session token:", error);
        throw new Error("Failed to fetch session token");
    }
};

export default fetchSessionToken;