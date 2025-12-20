import React, { useState, useEffect } from "react";
import {
    Page,
    Banner,
    Card,
    Layout,
    LegacyCard,
    Text,
    Badge,
    Button,
    ButtonGroup,
    InlineGrid,
    BlockStack,
    InlineStack,
    Divider,
    ProgressBar,
    Box,
    Icon,
} from "@shopify/polaris";
import {
    StoreIcon,
    ImportIcon,
    CheckIcon,
    LockIcon,
    LinkIcon,
    ClockIcon,
} from "@shopify/polaris-icons";
import SetupGuide from "../components/SetupGuide";
import Dashboard from "../components/Dashboard";
import axios from "axios";
import fetchSessionToken from "../utils/fetchSessionToken";
import { useAppBridge } from "@shopify/app-bridge-react";

const Home = () => {
    const app = useAppBridge();
    const [visible, setVisible] = useState({
        banner: true,
        setupGuide: true,
    });

    // get shop from url
    const shop = new URL(window.location.href).searchParams.get("shop");
    console.log("Shop:", shop);

    // Centralized Dashboard Data
    const [dashboardData, setDashboardData] = useState({
        planName: "Free",
        shopifyProductCount: 0,
        appProductCount: 0,
        gmcProductCount: 0,
        resourceUsage: {
            percentage: 0,
            used: 0,
            total: 500,
        },
    });

    // Centralized Setup Guide State
    const [guideState, setGuideState] = useState({
        steps: {
            step1: { completed: false, value: "content_api" },
            step2: {
                completed: false,
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

    // API Call on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!app) return;

                // const response = await fetch(`/api/home?shop=${shop}`);
                // const data = await response.json();
                // console.log("API Response:", data);

                const token = await fetchSessionToken({ app });
                const res = await axios.get("/api/home", {
                    params: { shop },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                console.log("API Response:", res.data);

                setDashboardData({
                    planName: "Free",
                    shopifyProductCount: res.data.productCount,
                    appProductCount: 8,
                    gmcProductCount: 1,
                    resourceUsage: {
                        percentage: 1.6,
                        used: 8,
                        total: 500,
                    },
                });
            } catch (error) {
                console.error("Error fetching home data:", error);
            }
        };

        fetchData();
    }, [app]);

    // Handlers for Setup Guide
    const handleUpdateStep = (step, data) => {
        setGuideState((prev) => ({
            ...prev,
            steps: {
                ...prev.steps,
                [step]: { ...prev.steps[step], ...data },
            },
        }));
    };

    const handleToggleExpanded = (key) => {
        setGuideState((prev) => ({
            ...prev,
            expanded: {
                ...prev.expanded,
                [key]: !prev.expanded[key],
            },
        }));
    };

    return (
        <Page>
            <Box paddingBlockEnd="500">
                {visible.banner && (
                    <Box paddingBlockEnd="400">
                        <Banner
                            title={null}
                            status="info"
                            action={{
                                content: "Upgrade to Puzzlify Pro",
                                url: "#",
                            }}
                            onDismiss={() =>
                                setVisible({ ...visible, banner: false })
                            }
                        >
                            3 of 5 puzzles created. Upgrade to Puzzlify Pro to
                            create unlimited puzzles.
                        </Banner>
                    </Box>
                )}

                {visible.setupGuide && (
                    <Box paddingBlockEnd="400">
                        <SetupGuide
                            onDismiss={() =>
                                setVisible({ ...visible, setupGuide: false })
                            }
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
