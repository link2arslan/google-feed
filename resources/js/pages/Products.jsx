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

const Products = () => {
    const app = useAppBridge();
    const shop = new URL(window.location.href).searchParams.get("shop");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

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
            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={selectedResources.includes(id)}
                    position={index}
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

    return (
        <Page
            fullWidth
            title="Products"
            primaryAction={{ content: "Add product" }}
            secondaryActions={[{ content: "Export" }, { content: "Import" }]}
        >
            <BlockStack gap="400">
                <Card padding="0">
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
                                    content: selectedResources.length > 1 ? "Bulk edit" : "Edit",
                                    onAction: () => {
                                        const redirect = Redirect.create(app);
                                        const shopParam = encodeURIComponent(shop);
                                        
                                        if (selectedResources.length === 1) {
                                            // Redirect to single edit page
                                            redirect.dispatch(
                                                Redirect.Action.APP,
                                                `/products/${selectedResources[0]}/edit?shop=${shopParam}`
                                            );
                                        } else {
                                            // Redirect to the Bulk Edit page with comma-separated IDs
                                            const ids = selectedResources.join(",");
                                            redirect.dispatch(Redirect.Action.APP, `/products/bulk?ids=${ids}&shop=${shop}`);
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