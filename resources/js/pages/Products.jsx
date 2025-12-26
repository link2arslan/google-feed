import React, { useState, useCallback, useEffect } from "react";
import {
    Page,
    Card,
    IndexTable,
    useIndexResourceState,
    Text,
    Badge,
    InlineStack,
    BlockStack,
    Thumbnail,
    Tabs,
    Icon,
    Box,
    Divider,
    SkeletonBodyText,
    EmptySearchResult,
    Button,
} from "@shopify/polaris";
import {
    AlertTriangleIcon,
    AlertCircleIcon,
    ClockIcon,
    ImageIcon,
} from "@shopify/polaris-icons";
import axios from "axios";
import fetchSessionToken from "../utils/fetchSessionToken";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import { useNavigate } from "react-router-dom";

const Products = () => {
    const app = useAppBridge();
    const navigate = useNavigate();
    const shop = new URL(window.location.href).searchParams.get("shop");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const tabs = [
        { id: "all", content: "All products", panelID: "all-products" },
        {
            id: "invalid",
            content: "GMC - Invalid",
            panelID: "invalid-products",
        },
        {
            id: "disapproved",
            content: "GMC - Disapproved",
            panelID: "disapproved-products",
        },
    ];

    const [selectedTab, setSelectedTab] = useState(0);
    const handleTabChange = useCallback((index) => setSelectedTab(index), []);

    const activeTabId = tabs[selectedTab].id;
    const filteredProducts = products.filter((p) => {
        if (activeTabId === "all") return true;
        return p.gmc.toLowerCase() === activeTabId;
    });

    const resourceName = { singular: "product", plural: "products" };

    // Resource Selection State
    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(filteredProducts);

    const getStatusContent = (status) => {
        switch (status) {
            case "Disapproved":
                return { icon: AlertCircleIcon, tone: "critical" };
            case "Invalid":
                return { icon: AlertTriangleIcon, tone: "warning" };
            case "Scheduled":
                return { icon: ClockIcon, tone: "info" };
            default:
                return { icon: null, tone: "default" };
        }
    };

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const sessionToken = await fetchSessionToken({ app });
                const res = await axios.get("/api/products", {
                    params: { shop },
                    headers: {
                        Authorization: `Bearer ${sessionToken}`,
                        Accept: "application/json",
                    },
                });

                const transformed = res.data.products.map((product) => ({
                    id: product.id,
                    title: product.title,
                    imageUrl: product.imageUrl || null,
                    category: product.category || "Uncategorized",
                    gmc: product.gmc_status || "Scheduled",
                    updated: product.updated_at
                        ? new Date(product.updated_at).toLocaleDateString()
                        : "Just now",
                }));

                setProducts(transformed);
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [app, shop]);

    const emptyStateMarkup = (
        <EmptySearchResult
            title={"No products found"}
            description={"Try changing the filters or adding new products."}
            withIllustration
        />
    );

    const rowMarkup = filteredProducts.map(
        ({ id, title, category, gmc, updated, imageUrl }, index) => {
            const { icon, tone } = getStatusContent(gmc);
            const isSelected = selectedResources.includes(id);

            // Define the navigation function
            const handleRowClick = () => {

                // This is the App Bridge v4 direct way

                if (window.shopify && window.shopify.config && window.shopify.config.navigation) {

                    window.shopify.config.navigation.navigate(`/products/edit/${id}` + window.location.search);

                } else {

                    // Fallback for local development

                    navigate(`/products/edit/${id}` + window.location.search);

                }
            };

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={isSelected}
                    position={index}
                    // This makes the whole row navigate
                    onClick={handleRowClick}
                >
                    <IndexTable.Cell>
                        <InlineStack gap="300" blockAlign="center" wrap={false}>
                            <Thumbnail
                                source={imageUrl || ImageIcon}
                                size="small"
                                alt={title}
                            />
                            <Text variant="bodyMd" fontWeight="bold" as="span">
                                {title}
                            </Text>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" tone="subdued" as="span">
                            {category}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="200" blockAlign="center" wrap={false}>
                            {icon && (
                                <Box width="20px">
                                    <Icon source={icon} tone={tone} />
                                </Box>
                            )}
                            <Badge tone={tone}>{gmc}</Badge>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" tone="subdued" as="span">
                            {updated}
                        </Text>
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        }
    );

    const handleSyncProducts = async () => {
        try {
            setSyncing(true);
            const sessionToken = await fetchSessionToken({ app });
            
            // Get all product IDs
            const productIds = products.map(product => product.id);
            
            // Make API call to sync products
            await axios.post('/api/products/sync', {
                product_ids: productIds,
                shop: shop
            }, {
                headers: {
                    Authorization: `Bearer ${sessionToken}`,
                    Accept: "application/json",
                }
            });
            
            // Show success message or handle response as needed
            console.log('Products synced successfully');
        } catch (error) {
            console.error('Error syncing products:', error);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Page
            fullWidth
            title="Products"
            primaryAction={{ content: "Add product" }}
            secondaryActions={[{ content: "Export" }, { content: "Import" }]}
        >
            <BlockStack gap="400">
                <Card padding="0">
                    <Box padding="400">
                        <Button 
                            onClick={handleSyncProducts}
                            loading={syncing}
                            disabled={products.length === 0}
                            variant="primary"
                        >
                            Sync products
                        </Button>
                    </Box>
                    <Divider />
                    <Tabs
                        tabs={tabs}
                        selected={selectedTab}
                        onSelect={handleTabChange}
                        fitted
                    />
                    <Divider />

                    {loading ? (
                        <Box padding="500">
                            <BlockStack gap="400">
                                <SkeletonBodyText lines={3} />
                            </BlockStack>
                        </Box>
                    ) : (
                        <IndexTable
                            resourceName={resourceName}
                            itemCount={filteredProducts.length}
                            selectedItemsCount={
                                allResourcesSelected
                                    ? "All"
                                    : selectedResources.length
                            }
                            onSelectionChange={handleSelectionChange}
                            headings={[
                                { title: "Product" },
                                { title: "Google Category" },
                                { title: "GMC Status" },
                                { title: "Updated" },
                            ]}
                            emptyState={emptyStateMarkup}
                            promotedBulkActions={[
                                {
                                    content:
                                        selectedResources.length > 1
                                            ? "Bulk edit"
                                            : "Edit",
                                    onAction: () => {

                                        // This is the App Bridge v4 direct way

                                        if (window.shopify && window.shopify.config && window.shopify.config.navigation) {

                                            if (selectedResources.length === 1) {
                                                // Redirect to single edit page
                                                window.shopify.config.navigation.navigate(`/products/edit/${selectedResources[0]}` + window.location.search);
                                            } else {
                                                // Redirect to the Bulk Edit page with comma-separated IDs
                                                const ids = selectedResources.join(",");
                                                // Construct the URL with both ids and shop parameters
                                                const searchParams = new URLSearchParams(window.location.search);
                                                searchParams.set('ids', ids);
                                                if (shop) searchParams.set('shop', shop);
                                                window.shopify.config.navigation.navigate(`/products/bulk?${searchParams.toString()}`);
                                            }
                                        } else {

                                            // Fallback for local development

                                            if (selectedResources.length === 1) {
                                                // Redirect to single edit page
                                                navigate(`/products/edit/${selectedResources[0]}` + window.location.search);
                                            } else {
                                                // Redirect to the Bulk Edit page with comma-separated IDs
                                                const ids = selectedResources.join(",");
                                                // Construct the URL with both ids and shop parameters
                                                const searchParams = new URLSearchParams(window.location.search);
                                                searchParams.set('ids', ids);
                                                if (shop) searchParams.set('shop', shop);
                                                navigate(`/products/bulk?${searchParams.toString()}`);
                                            }
                                        }
                                    },
                                },
                                {
                                    content: "Assign category",
                                    onAction: () => console.log("Assign cat"),
                                },
                            ]}
                        >
                            {rowMarkup}
                        </IndexTable>
                    )}
                </Card>
            </BlockStack>
        </Page>
    );
};

export default Products;
