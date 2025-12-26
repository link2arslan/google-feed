import React, { useState, useEffect, useCallback } from "react";
import { Page, Banner, Box } from "@shopify/polaris";
import SetupGuide from "../components/SetupGuide";
import Dashboard from "../components/Dashboard";
import axios from "axios";
import fetchSessionToken from "../utils/fetchSessionToken";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useNavigate } from "react-router-dom";

const Home = () => {
    const app = useAppBridge();
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get("shop");
    
    const [visible, setVisible] = useState({
        banner: true,
        setupGuide: true,
    });

    const [dashboardData, setDashboardData] = useState({
        planName: "Free",
        shopifyProductCount: 0,
        appProductCount: 0,
        gmcProductCount: 0,
        resourceUsage: { percentage: 0, used: 0, total: 500 },
    });

    const [guideState, setGuideState] = useState({
        steps: {
            step1: { completed: false, value: "content_api" },
            step2: {
                completed: false,
                connected: false,
                merchantId: null,
                channels: { gmc: true, facebook: false, mmc: false },
            },
            step3: { completed: false },
        },
        expanded: {
            setupGuide: true,
            step1: false,
            step2: false,
            step3: false,
        },
    });

    // 1. Triggered when user clicks "Connect" in Step 2
    const handleConnectGMC = useCallback(async () => {
        try {
            const token = await fetchSessionToken({ app });
            const res = await axios.get("/api/google/connect", {
                params: { shop },
                headers: { Authorization: `Bearer ${token}` },
            });

            // Redirect the top-level window to Google OAuth
            if (res.data.url) {

                // This is the App Bridge v4 direct way

                if (window.shopify && window.shopify.config && window.shopify.config.navigation) {

                    window.shopify.config.navigation.redirect(res.data.url);

                } else {

                    // Fallback for local development

                    window.location.href = res.data.url;

                }
            }
        } catch (error) {
            console.error("Failed to get Google Auth URL:", error);
        }
    }, [app, shop]);

    // 2. Fetch initial data + check for MerchantID in URL after redirect
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!app) return;
                const token = await fetchSessionToken({ app });
                const res = await axios.get("/api/home", {
                    params: { shop },
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                });

                setDashboardData(prev => ({
                    ...prev,
                    shopifyProductCount: res.data.productCount,
                }));

                // If DB shows connected or URL contains merchantId from callback
                const queryMerchantId = urlParams.get("merchantId");
                const isGmcConnected = res.data.gmcConnected || !!queryMerchantId;
                const merchantId = queryMerchantId || res.data.merchantId;
                
                if (isGmcConnected) {
                    setGuideState(prev => ({
                        ...prev,
                        steps: {
                            ...prev.steps,
                            step2: { 
                                ...prev.steps.step2, 
                                completed: true, 
                                connected: true, 
                                merchantId: merchantId
                            }
                        }
                    }));
                }
            } catch (error) {
                console.error("Error fetching home data:", error);
            }
        };
        fetchData();
    }, [app, shop]);

    const handleUpdateStep = (step, data) => {
        if (step === "step2" && data.action === "connectGMC") {
            handleConnectGMC();
            return;
        }

        setGuideState((prev) => ({
            ...prev,
            steps: { ...prev.steps, [step]: { ...prev.steps[step], ...data } },
        }));
    };

    const handleToggleExpanded = (key) => {
        setGuideState((prev) => ({
            ...prev,
            expanded: { ...prev.expanded, [key]: !prev.expanded[key] },
        }));
    };

    return (
        <Page>
            <Box paddingBlockEnd="500">
                {visible.banner && (
                    <Box paddingBlockEnd="400">
                        <Banner
                            status="info"
                            onDismiss={() => setVisible({ ...visible, banner: false })}
                        >
                            Connect your Google Merchant Center to start syncing your {dashboardData.shopifyProductCount} products.
                        </Banner>
                    </Box>
                )}

                {visible.setupGuide && (
                    <Box paddingBlockEnd="400">
                        <SetupGuide
                            onDismiss={() => setVisible({ ...visible, setupGuide: false })}
                            guideState={guideState}
                            onUpdateStep={handleUpdateStep}
                            onToggleExpanded={handleToggleExpanded}
                        />
                    </Box>
                )}
                <Dashboard data={dashboardData} />
            </Box>
        </Page>
    );
};

export default Home;