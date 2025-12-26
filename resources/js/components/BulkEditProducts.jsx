import React, { useState, useEffect, useCallback } from "react";
import {
    Page,
    Card,
    IndexTable,
    TextField,
    Select,
    Thumbnail,
    Box,
    SkeletonPage,
    SkeletonBodyText,
    BlockStack,
    Text,
    InlineStack,
} from "@shopify/polaris";
import { ImageIcon, SearchIcon } from "@shopify/polaris-icons";
import axios from "axios";
import fetchSessionToken from "../utils/fetchSessionToken";
import { useAppBridge, SaveBar } from "@shopify/app-bridge-react";
import { useLocation, useNavigate } from "react-router-dom";

const BulkEditProducts = () => {
    const shopify = useAppBridge();
    const navigate = useNavigate();
    const { search } = useLocation();
    const isFirstRender = React.useRef(true);
    const params = new URLSearchParams(search);
    const shop = params.get("shop");
    const ids = params.get("ids");

    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [originalProducts, setOriginalProducts] = useState([]); // Track for Discard
    const [isSaving, setIsSaving] = useState(false);

    // --- 1. Dirty State Check ---
    const isDirty =
        JSON.stringify(products) !== JSON.stringify(originalProducts);

    // --- 2. Save Bar Visibility Control ---
    // --- 2. Save Bar Visibility Control ---
    useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return; // Skip the very first run to allow the SaveBar to mount
    }
    
    if (isDirty) {
        shopify.saveBar.show("bulk-edit-save-bar");
    } else {
        shopify.saveBar.hide("bulk-edit-save-bar");
    }
}, [isDirty, shopify]);

    // --- 3. Fetch Data ---
    useEffect(() => {
        const fetchSelectedProducts = async () => {
            try {
                setIsLoading(true);
                const token = await fetchSessionToken({ app: shopify });
                const res = await axios.get("/api/products/bulk", {
                    params: { shop, ids },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });

                const data = Array.isArray(res.data)
                    ? res.data
                    : res.data.products;
                const sanitizedData = data || [];
                setProducts(sanitizedData);
                setOriginalProducts(JSON.parse(JSON.stringify(sanitizedData))); // Deep clone
            } catch (error) {
                console.error("Error fetching bulk products:", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (ids) fetchSelectedProducts();
    }, [shopify, shop, ids]);

    // --- 4. Handlers ---
    const handleUpdate = (productId, variantId, field, value) => {
        setProducts((prev) =>
            prev.map((prod) => {
                if (prod.id !== productId) return prod;
                if (!variantId) return { ...prod, [field]: value };

                const updatedVariants = prod.variants.map((v) =>
                    v.id === variantId ? { ...v, [field]: value } : v
                );
                return { ...prod, variants: updatedVariants };
            })
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        shopify.saveBar.loading(true);
        try {
            const token = await fetchSessionToken({ app: shopify });
            await axios.post(
                "/api/products/bulk-update",
                { products, shop },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setOriginalProducts(JSON.parse(JSON.stringify(products))); // Reset original state
            shopify.toast.show("Changes saved successfully");
        } catch (error) {
            console.error("Save error:", error);
            shopify.toast.show("Failed to save changes", { isError: true });
        } finally {
            setIsSaving(false);
            shopify.saveBar.loading(false);
        }
    };

    const handleDiscard = useCallback(() => {
        setProducts(JSON.parse(JSON.stringify(originalProducts)));
    }, [originalProducts]);

    const handleBack = () => {
        if (isDirty) {
            shopify.saveBar.leaveConfirmation();
            return;
        }

        const targetUrl = "/products" + window.location.search;
        if (window.shopify?.config?.navigation) {
            window.shopify.config.navigation.navigate(targetUrl);
        } else {
            navigate(targetUrl);
        }
    };

    if (isLoading) {
        return (
            <SkeletonPage title="Edit product by fields" fullWidth>
                <Card>
                    <Box padding="500">
                        <BlockStack gap="400">
                            {[...Array(8)].map((_, i) => (
                                <SkeletonBodyText key={i} lines={1} />
                            ))}
                        </BlockStack>
                    </Box>
                </Card>
            </SkeletonPage>
        );
    }

    const rowMarkup = products.flatMap((product, index) => {
        const mainRow = (
            <IndexTable.Row id={product.id} key={product.id} position={index}>
                <IndexTable.Cell>
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                        <Thumbnail
                            size="small"
                            source={product.media?.[0]?.url || ImageIcon}
                            alt={product.title}
                        />
                        <div style={{ maxWidth: "200px" }}>
                            <Text
                                variant="bodyMd"
                                fontWeight="bold"
                                truncate
                                as="span"
                            >
                                {product.title}
                            </Text>
                        </div>
                    </InlineStack>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Select
                        options={[
                            { label: "Active", value: "active" },
                            { label: "Draft", value: "draft" },
                            { label: "Archived", value: "archived" },
                        ]}
                        value={product.status}
                        onChange={(val) =>
                            handleUpdate(product.id, null, "status", val)
                        }
                    />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextField
                        prefix={
                            <SearchIcon
                                style={{ width: "16px", color: "#8c9196" }}
                            />
                        }
                        value={product.productType}
                        onChange={(val) =>
                            handleUpdate(product.id, null, "productType", val)
                        }
                        autoComplete="off"
                    />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextField
                        value={product.vendor}
                        onChange={(val) =>
                            handleUpdate(product.id, null, "vendor", val)
                        }
                        autoComplete="off"
                    />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextField
                        value={product.category || "Uncategorized"}
                        onChange={(val) =>
                            handleUpdate(product.id, null, "category", val)
                        }
                        autoComplete="off"
                    />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextField
                        prefix="PKR"
                        value={product.variants?.[0]?.price}
                        disabled
                        autoComplete="off"
                    />
                </IndexTable.Cell>
            </IndexTable.Row>
        );

        const variantRows = (product.variants || []).map((variant) => (
            <IndexTable.Row id={variant.id} key={variant.id} position={index}>
                <IndexTable.Cell>
                    <Box paddingInlineStart="1000">
                        <Text variant="bodyMd" tone="subdued">
                            {variant.title === "Default Title"
                                ? "Standard"
                                : variant.title}
                        </Text>
                    </Box>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <div className="ghost-bar" />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <div className="ghost-bar" />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <div className="ghost-bar" />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <div className="ghost-bar" />
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <TextField
                        value={variant.price}
                        onChange={(val) =>
                            handleUpdate(product.id, variant.id, "price", val)
                        }
                        autoComplete="off"
                    />
                </IndexTable.Cell>
            </IndexTable.Row>
        ));

        return [mainRow, ...variantRows];
    });

    return (
        <Page
            fullWidth
            title="Edit product by fields"
            backAction={{ content: "Products", onAction: handleBack }}
        >
            <SaveBar id="bulk-edit-save-bar">
                <button variant="primary" onClick={handleSave}>
                    Save changes
                </button>
                <button onClick={handleDiscard}>Discard</button>
            </SaveBar>

            <Card padding="0">
                <IndexTable
                    resourceName={{ singular: "product", plural: "products" }}
                    itemCount={products.length}
                    selectable={false}
                    headings={[
                        { title: "Product title" },
                        { title: "Status" },
                        { title: "Product type" },
                        { title: "Vendor" },
                        { title: "Product category" },
                        { title: "Base price", alignment: "end" },
                    ]}
                >
                    {rowMarkup}
                </IndexTable>
            </Card>

            <style>{`
                .ghost-bar { height: 4px; width: 30px; background-color: #e1e3e5; border-radius: 2px; margin: auto; }
                .Polaris-IndexTable__TableCell { padding: 8px !important; vertical-align: middle; }
            `}</style>
        </Page>
    );
};

export default BulkEditProducts;
