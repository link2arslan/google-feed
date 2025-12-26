import React, { useState, useCallback, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
    Page,
    Layout,
    Card,
    TextField,
    BlockStack,
    Text,
    InlineStack,
    Badge,
    Box,
    Select,
    Icon,
    Tabs,
    Banner,
    InlineGrid,
    DropZone,
    Thumbnail,
    Checkbox,
    Link,
    Button,
    SkeletonPage,
    SkeletonBodyText,
    SkeletonTabs,
} from "@shopify/polaris";
import { ImageIcon, CheckIcon } from "@shopify/polaris-icons";
import axios from "axios";
import fetchSessionToken from "../utils/fetchSessionToken";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useParams, useNavigate } from "react-router-dom";

const EditProduct = () => {
    const { id: productId } = useParams();
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [imageToRemove, setImageToRemove] = useState(null);
    const [removeType, setRemoveType] = useState(null); // "product" or "variant"
    const app = useAppBridge();
    const shop = new URL(window.location.href).searchParams.get("shop");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "active",
        vendor: "",
        media: [],
        variants: [],
    });

    const handleBack = () => {
        if (
            window.shopify &&
            window.shopify.config &&
            window.shopify.config.navigation
        ) {
            window.shopify.config.navigation.navigate(
                "/products" + window.location.search
            );
        } else {
            navigate("/products" + window.location.search);
        }
    };

    // Fetch product data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const token = await fetchSessionToken({ app });
                const response = await axios.get(`/api/product`, {
                    params: { shop, productId },
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                });
                if (response.data) {
                    setFormData(response.data);
                    // Ensure at least one variant exists for index safety
                    if (response.data.variants.length > 0) {
                        setActiveVariantIndex(0);
                    }
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (productId) fetchData();
    }, [productId, app, shop]);

    // Generic field updater
    const updateField = (path) => (value) => {
        setFormData((prev) => {
            const newState = { ...prev };
            const keys = path.split(".");
            let current = newState;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const updateVariantField = (index, field, value) => {
        setFormData((prev) => {
            const newVariants = [...prev.variants];
            newVariants[index] = { ...newVariants[index], [field]: value };
            return { ...prev, variants: newVariants };
        });
    };

    // Remove product image
    const removeProductImage = (indexToRemove) => {
        const imageToDelete = formData.media[indexToRemove];

        if (!imageToDelete.id || imageToDelete.url.startsWith("blob:")) {
            // Local unsaved image - just remove from UI
            clearImageFromVariants(imageToDelete.url); // in case blob URL was temporarily assigned
            setFormData((prev) => ({
                ...prev,
                media: prev.media.filter((_, index) => index !== indexToRemove),
            }));
            return;
        }

        setImageToRemove({ index: indexToRemove, mediaItem: imageToDelete });
        setRemoveType("product");
        setShowRemoveModal(true);
    };

    const clearImageFromVariants = (imageUrlOrId) => {
        setFormData((prev) => {
            const newVariants = prev.variants.map((variant) => {
                if (
                    variant.imageUrl === imageUrlOrId ||
                    variant.imageId === imageUrlOrId
                ) {
                    return {
                        ...variant,
                        imageUrl: null,
                        imageId: null,
                    };
                }
                return variant;
            });
            return { ...prev, variants: newVariants };
        });
    };
    // Remove variant image association
    const removeVariantImage = (index) => {
        setImageToRemove(index);
        setRemoveType("variant");
        setShowRemoveModal(true);
    };

    const confirmRemoveImage = async () => {
        if (!imageToRemove) return;

        const token = await fetchSessionToken({ app });

        if (removeType === "product") {
            const { index: indexToRemove, mediaItem } = imageToRemove;

            // Optimistic UI: Remove from product media immediately
            setFormData((prev) => ({
                ...prev,
                media: prev.media.filter((_, i) => i !== indexToRemove),
            }));

            // Also clear from any variant using this image (UI only)
            clearImageFromVariants(mediaItem.url);
            clearImageFromVariants(mediaItem.id);

            // If it's a real Shopify image, delete via backend
            if (mediaItem.id && !mediaItem.url.startsWith("blob:")) {
                try {
                    await axios.post(
                        `/api/product/media/delete`,
                        { shop, productId, mediaId: mediaItem.id },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    // Success: already handled optimistically
                } catch (error) {
                    console.error(
                        "Failed to delete media from Shopify:",
                        error
                    );
                    alert(
                        "Image removed from UI, but failed to delete from Shopify."
                    );
                    // You could revert UI here if needed, but usually safe to leave removed
                }
            }
        } else if (removeType === "variant") {
            const variantIndex = imageToRemove;
            const variantToUpdate = formData.variants[variantIndex];

            try {
                const response = await axios.post(
                    `/api/variant/media/remove`,
                    { shop, variantId: variantToUpdate.id, productId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (response.data.success) {
                    setFormData((prev) => {
                        const newVariants = [...prev.variants];
                        newVariants[variantIndex] = {
                            ...newVariants[variantIndex],
                            imageUrl: null,
                            imageId: null,
                        };
                        return { ...prev, variants: newVariants };
                    });
                }
            } catch (error) {
                console.error("Failed to remove variant image:", error);
                alert("Error removing image from variant.");
            }
        }

        setShowRemoveModal(false);
        setImageToRemove(null);
        setRemoveType(null);
    };

    const cancelRemoveImage = () => {
        setShowRemoveModal(false);
        setImageToRemove(null);
        setRemoveType(null);
    };

    // Media upload handler (uploads directly to Shopify)
    const handleMediaUpload =
        (targetIndex = null) =>
        async (_files, acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file) return;

            const tempUrl = window.URL.createObjectURL(file);
            const tempItem = { id: "loading", url: tempUrl, alt: file.name };

            // Optimistic UI update
            if (targetIndex === null) {
                // Product media
                setFormData((prev) => ({
                    ...prev,
                    media: [...prev.media, tempItem],
                }));
            } else {
                // Variant-specific
                setFormData((prev) => {
                    const newVariants = [...prev.variants];
                    newVariants[targetIndex] = {
                        ...newVariants[targetIndex],
                        imageUrl: tempUrl,
                        isLoading: true,
                    };
                    return { ...prev, variants: newVariants };
                });
            }

            const uploadData = new FormData();
            uploadData.append("shop", shop);
            uploadData.append("productId", productId);
            uploadData.append("image", file);

            if (targetIndex !== null) {
                uploadData.append(
                    "variantId",
                    formData.variants[targetIndex].id
                );
            }

            try {
                const token = await fetchSessionToken({ app });
                const response = await axios.post(
                    "/api/product/media/upload",
                    uploadData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );

                if (response.data.success) {
                    const newShopifyMedia = response.data.media;

                    setFormData((prev) => {
                        const newState = { ...prev };

                        // Add to product media list (remove loading placeholder)
                        newState.media = [
                            ...newState.media.filter(
                                (item) => item.id !== "loading"
                            ),
                            newShopifyMedia,
                        ];

                        // Update variant if applicable
                        if (targetIndex !== null) {
                            const updatedVariants = [...prev.variants];
                            updatedVariants[targetIndex] = {
                                ...updatedVariants[targetIndex],
                                imageUrl: newShopifyMedia.url,
                                imageId: newShopifyMedia.id,
                                isLoading: false,
                            };
                            newState.variants = updatedVariants;
                        }

                        return newState;
                    });
                }
            } catch (error) {
                console.error("Upload failed:", error);
                alert("Failed to upload image.");

                // Revert on error
                setFormData((prev) => {
                    if (targetIndex === null) {
                        return {
                            ...prev,
                            media: prev.media.filter(
                                (item) => item.id !== "loading"
                            ),
                        };
                    } else {
                        const revertedVariants = [...prev.variants];
                        revertedVariants[targetIndex] = {
                            ...revertedVariants[targetIndex],
                            imageUrl:
                                prev.variants[targetIndex].imageUrl || null,
                            isLoading: false,
                        };
                        return { ...prev, variants: revertedVariants };
                    }
                });
            }
        };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = await fetchSessionToken({ app });
            const endpoint =
                selectedTab === 0
                    ? "/api/product/update"
                    : "/api/variants/update";

            let payload = {
                shop,
                productId,
                ...(selectedTab === 0
                    ? {
                          title: formData.title,
                          description: formData.description,
                          status: formData.status,
                          vendor: formData.vendor,
                          media: formData.media.filter(
                              (img) =>
                                  img && img.id && !img.url.startsWith("blob:")
                          ),
                      }
                    : {
                          variants: formData.variants,
                      }),
            };

            const response = await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.data.success) {
                alert("Saved successfully!");
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("Failed to save.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SkeletonPage primaryAction backAction>
                <BlockStack gap="500">
                    <SkeletonTabs count={3} />
                    <Layout>
                        <Layout.Section>
                            <Card>
                                <SkeletonBodyText lines={6} />
                            </Card>
                        </Layout.Section>
                        <Layout.Section variant="oneThird">
                            <Card>
                                <SkeletonBodyText lines={2} />
                            </Card>
                        </Layout.Section>
                    </Layout>
                </BlockStack>
            </SkeletonPage>
        );
    }

    const tabs = [
        { id: "product", content: "Product" },
        { id: "variants", content: "Variants" },
        { id: "attributes", content: "Custom attributes" },
    ];

    const currentVariant = formData.variants[activeVariantIndex] || {};

    const MetafieldsCard = (
        <Card>
            <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                    Metafields
                </Text>
                <Box
                    padding="800"
                    borderWidth="025"
                    borderColor="border"
                    borderRadius="200"
                    background="bg-surface-secondary"
                >
                    <BlockStack gap="200" align="center">
                        <Text variant="headingSm" as="h3" alignment="center">
                            No metafields found
                        </Text>
                        <Text tone="subdued" alignment="center">
                            Add product metafields in{" "}
                            <Link monochrome url="#">
                                Shopify admin
                            </Link>
                        </Text>
                    </BlockStack>
                </Box>
            </BlockStack>
        </Card>
    );

    return (
        <Page
            backAction={{ content: "Products", onAction: handleBack }}
            title={formData.title || "Edit Product"}
            titleMetadata={
                <Badge
                    tone={
                        formData.status === "active" ? "success" : "attention"
                    }
                >
                    {formData.status}
                </Badge>
            }
            primaryAction={{
                content:
                    selectedTab === 0 ? "Save Product" : "Save All Variants",
                onAction: handleSave,
                loading: isSaving,
            }}
        >
            <BlockStack gap="500">
                <Tabs
                    tabs={tabs}
                    selected={selectedTab}
                    onSelect={setSelectedTab}
                />

                {selectedTab === 0 && (
                    <Layout>
                        <Layout.Section>
                            <BlockStack gap="400">
                                <Card>
                                    <BlockStack gap="400">
                                        <TextField
                                            label="Title"
                                            value={formData.title}
                                            onChange={updateField("title")}
                                            autoComplete="off"
                                        />
                                        <BlockStack gap="100">
                                            <Text as="label" variant="bodyMd">
                                                Description
                                            </Text>
                                            <div className="polar-quill-wrapper">
                                                <ReactQuill
                                                    theme="snow"
                                                    value={formData.description}
                                                    onChange={updateField(
                                                        "description"
                                                    )}
                                                />
                                            </div>
                                        </BlockStack>
                                    </BlockStack>
                                </Card>

                                <Card>
                                    <BlockStack gap="200">
                                        <Text variant="headingMd" as="h2">
                                            Media
                                        </Text>
                                        <DropZone onDrop={handleMediaUpload()}>
                                            <DropZone.FileUpload />
                                        </DropZone>
                                        {formData.media.length > 0 && (
                                            <Box paddingBlockStart="400">
                                                <InlineStack gap="300">
                                                    {formData.media.map(
                                                        (img, i) =>
                                                            img ? (
                                                                <BlockStack
                                                                    key={
                                                                        img.id ||
                                                                        i
                                                                    }
                                                                    gap="100"
                                                                    align="center"
                                                                >
                                                                    <Thumbnail
                                                                        size="large"
                                                                        alt={
                                                                            img.alt
                                                                        }
                                                                        source={
                                                                            img.url
                                                                        }
                                                                    />
                                                                    <Button
                                                                        variant="plain"
                                                                        tone="critical"
                                                                        size="micro"
                                                                        onClick={() =>
                                                                            removeProductImage(
                                                                                i
                                                                            )
                                                                        }
                                                                    >
                                                                        Remove
                                                                    </Button>
                                                                </BlockStack>
                                                            ) : null
                                                    )}
                                                </InlineStack>
                                            </Box>
                                        )}
                                    </BlockStack>
                                </Card>

                                {MetafieldsCard}
                            </BlockStack>
                        </Layout.Section>

                        <Layout.Section variant="oneThird">
                            <BlockStack gap="400">
                                <Card>
                                    <Select
                                        label="Status"
                                        options={[
                                            {
                                                label: "Active",
                                                value: "active",
                                            },
                                            { label: "Draft", value: "draft" },
                                        ]}
                                        value={formData.status}
                                        onChange={updateField("status")}
                                    />
                                </Card>
                                <Card>
                                    <TextField
                                        label="Vendor"
                                        value={formData.vendor}
                                        onChange={updateField("vendor")}
                                    />
                                </Card>
                            </BlockStack>
                        </Layout.Section>
                    </Layout>
                )}

                {selectedTab === 1 && formData.variants.length > 0 && (
                    <Layout>
                        <Layout.Section variant="oneThird">
                            <BlockStack gap="200">
                                {formData.variants.map((v, index) => (
                                    <Box
                                        key={v.id || index}
                                        onClick={() =>
                                            setActiveVariantIndex(index)
                                        }
                                        cursor="pointer"
                                    >
                                        <Card
                                            background={
                                                activeVariantIndex === index
                                                    ? "bg-surface-selected"
                                                    : "bg-surface"
                                            }
                                        >
                                            <InlineStack
                                                align="space-between"
                                                blockAlign="center"
                                            >
                                                <InlineStack
                                                    gap="200"
                                                    blockAlign="center"
                                                >
                                                    <Thumbnail
                                                        size="small"
                                                        source={
                                                            v.imageUrl ||
                                                            ImageIcon
                                                        }
                                                        alt={v.title}
                                                    />
                                                    <Text
                                                        fontWeight={
                                                            activeVariantIndex ===
                                                            index
                                                                ? "bold"
                                                                : "regular"
                                                        }
                                                    >
                                                        {v.title}
                                                    </Text>
                                                </InlineStack>
                                                {activeVariantIndex ===
                                                    index && (
                                                    <Icon
                                                        source={CheckIcon}
                                                        tone="success"
                                                    />
                                                )}
                                            </InlineStack>
                                        </Card>
                                    </Box>
                                ))}
                            </BlockStack>
                        </Layout.Section>

                        <Layout.Section>
                            <BlockStack gap="400">
                                <Banner
                                    tone="warning"
                                    title="Variant Review Required"
                                >
                                    <p>
                                        Check compliance for Google Merchant
                                        Center.
                                    </p>
                                </Banner>

                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h2">
                                            Pricing - {currentVariant.title}
                                        </Text>
                                        <InlineGrid columns={2} gap="400">
                                            <TextField
                                                label="Price"
                                                prefix="$"
                                                value={
                                                    currentVariant.price || ""
                                                }
                                                onChange={(val) =>
                                                    updateVariantField(
                                                        activeVariantIndex,
                                                        "price",
                                                        val
                                                    )
                                                }
                                            />
                                            <TextField
                                                label="Compare at price"
                                                prefix="$"
                                                value={
                                                    currentVariant.compareAtPrice ||
                                                    ""
                                                }
                                                onChange={(val) =>
                                                    updateVariantField(
                                                        activeVariantIndex,
                                                        "compareAtPrice",
                                                        val
                                                    )
                                                }
                                            />
                                        </InlineGrid>
                                    </BlockStack>
                                </Card>

                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h2">
                                            Inventory
                                        </Text>
                                        <InlineGrid columns={2} gap="400">
                                            <TextField
                                                label="SKU"
                                                value={currentVariant.sku || ""}
                                                onChange={(val) =>
                                                    updateVariantField(
                                                        activeVariantIndex,
                                                        "sku",
                                                        val
                                                    )
                                                }
                                            />
                                            <TextField
                                                label="Barcode"
                                                value={
                                                    currentVariant.barcode || ""
                                                }
                                                onChange={(val) =>
                                                    updateVariantField(
                                                        activeVariantIndex,
                                                        "barcode",
                                                        val
                                                    )
                                                }
                                            />
                                        </InlineGrid>
                                        <Checkbox
                                            label="Track quantity"
                                            checked={
                                                currentVariant.inventoryPolicy ===
                                                "DENY"
                                            }
                                            onChange={(val) =>
                                                updateVariantField(
                                                    activeVariantIndex,
                                                    "inventoryPolicy",
                                                    val ? "DENY" : "CONTINUE"
                                                )
                                            }
                                        />
                                    </BlockStack>
                                </Card>

                                <Card>
                                    <BlockStack gap="200">
                                        <Text variant="headingMd" as="h2">
                                            Media
                                        </Text>
                                        {currentVariant.imageUrl ? (
                                            <Box paddingBlockStart="200">
                                                <InlineStack
                                                    gap="300"
                                                    blockAlign="center"
                                                >
                                                    <Thumbnail
                                                        size="large"
                                                        source={
                                                            currentVariant.imageUrl
                                                        }
                                                        alt={
                                                            currentVariant.title
                                                        }
                                                    />
                                                    <BlockStack gap="100">
                                                        <Text
                                                            variant="bodyMd"
                                                            fontWeight="bold"
                                                        >
                                                            Active Image
                                                        </Text>
                                                        <Button
                                                            variant="plain"
                                                            tone="critical"
                                                            onClick={() =>
                                                                removeVariantImage(
                                                                    activeVariantIndex
                                                                )
                                                            }
                                                        >
                                                            Remove image
                                                        </Button>
                                                    </BlockStack>
                                                </InlineStack>
                                            </Box>
                                        ) : (
                                            <DropZone
                                                onDrop={handleMediaUpload(
                                                    activeVariantIndex
                                                )} // FIXED!
                                            >
                                                <DropZone.FileUpload actionHint="Upload an image to assign it to this variant" />
                                            </DropZone>
                                        )}
                                    </BlockStack>
                                </Card>

                                {MetafieldsCard}
                            </BlockStack>
                        </Layout.Section>
                    </Layout>
                )}

                {selectedTab === 2 && (
                    <Layout>
                        <Layout.Section>
                            <BlockStack gap="400">
                                <Card>
                                    <BlockStack gap="200">
                                        <Text variant="headingMd" as="h2">
                                            Custom Attributes
                                        </Text>
                                        <Banner tone="info" title="Coming Soon">
                                            <p>
                                                Custom attributes functionality
                                                will be available in a future
                                                update.
                                            </p>
                                        </Banner>
                                        <Box
                                            padding="800"
                                            borderWidth="025"
                                            borderColor="border"
                                            borderRadius="200"
                                            background="bg-surface-secondary"
                                        >
                                            <BlockStack
                                                gap="200"
                                                align="center"
                                            >
                                                <Text
                                                    variant="headingSm"
                                                    as="h3"
                                                    alignment="center"
                                                >
                                                    Custom attributes
                                                    placeholder
                                                </Text>
                                                <Text
                                                    tone="subdued"
                                                    alignment="center"
                                                >
                                                    This section will allow you
                                                    to manage custom attributes
                                                    for Google Merchant Center
                                                    integration
                                                </Text>
                                            </BlockStack>
                                        </Box>
                                    </BlockStack>
                                </Card>
                            </BlockStack>
                        </Layout.Section>
                    </Layout>
                )}
            </BlockStack>

            <style>{`
                .polar-quill-wrapper .ql-toolbar.ql-snow { 
                    border-top-left-radius: 8px; 
                    border-top-right-radius: 8px; 
                    border-color: #8c9196; 
                    background-color: #f6f6f7; 
                }
                .polar-quill-wrapper .ql-container.ql-snow { 
                    border-bottom-left-radius: 8px; 
                    border-bottom-right-radius: 8px; 
                    border-color: #8c9196; 
                    min-height: 200px; 
                }
            `}</style>

            {/* Confirmation Modal */}
            {showRemoveModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Card
                        padding="400"
                        style={{ maxWidth: "500px", width: "90%" }}
                    >
                        <BlockStack gap="400">
                            <Text variant="headingMd" as="h3">
                                Confirm Removal
                            </Text>
                            <Text as="p">
                                Are you sure you want to remove this image? This
                                action cannot be undone.
                            </Text>
                            <InlineStack gap="200" align="end">
                                <Button onClick={cancelRemoveImage}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    tone="critical"
                                    onClick={confirmRemoveImage}
                                >
                                    Remove
                                </Button>
                            </InlineStack>
                        </BlockStack>
                    </Card>
                </div>
            )}
        </Page>
    );
};

export default EditProduct;
