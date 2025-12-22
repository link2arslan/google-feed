import React, { useState, useCallback, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
    Page, Layout, Card, TextField, BlockStack, Text, InlineStack, Badge,
    Box, Select, Icon, Tabs, Banner, InlineGrid, DropZone, Thumbnail,
    Checkbox, Link, Button, SkeletonPage, SkeletonBodyText, SkeletonTabs,
} from "@shopify/polaris";
import { ImageIcon, CheckIcon } from "@shopify/polaris-icons";
import axios from "axios";
import fetchSessionToken from "../utils/fetchSessionToken";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useParams } from "react-router-dom";

const EditProduct = () => {
    const { id: productId } = useParams();
    const [selectedTab, setSelectedTab] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
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

    // --- API Logic ---
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
                if (response.data) setFormData(response.data);
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (productId) fetchData();
    }, [productId, app, shop]);

    // --- State Handlers ---
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

    // --- UPDATED: Remove handler that uses Media ID ---
    const removeProductImage = async (indexToRemove) => {
        const imageToDelete = formData.media[indexToRemove];

        // 1. If it's a new upload (blob), just remove from UI
        if (!imageToDelete.id || imageToDelete.url.startsWith('blob:')) {
            setFormData((prev) => ({
                ...prev,
                media: prev.media.filter((_, index) => index !== indexToRemove),
            }));
            return;
        }

        // 2. If it has an ID, delete from Shopify via Backend
        try {
            const token = await fetchSessionToken({ app });
            const response = await axios.post(`/api/product/media/delete`, {
                shop,
                productId,
                mediaId: imageToDelete.id // This ID comes from your updated Laravel controller
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setFormData((prev) => ({
                    ...prev,
                    media: prev.media.filter((_, index) => index !== indexToRemove),
                }));
            }
        } catch (error) {
            console.error("Failed to delete media:", error);
            alert("Error deleting image from Shopify.");
        }
    };

    const removeVariantImage = (index) => {
        setFormData((prev) => {
            const newMedia = [...prev.media];
            newMedia[index] = null;
            return { ...prev, media: newMedia };
        });
    };

    const handleMediaUpload_bkp = (targetIndex = null) => (_files, acceptedFiles) => {
        const newMediaItems = acceptedFiles.map((file) => ({
            id: null, // New files don't have a Shopify ID yet
            url: window.URL.createObjectURL(file),
            alt: file.name,
            file: file,
        }));

        setFormData((prev) => {
            const updatedMedia = [...prev.media];
            if (targetIndex !== null) {
                updatedMedia[targetIndex] = newMediaItems[0];
                return { ...prev, media: updatedMedia };
            } else {
                return { ...prev, media: [...prev.media, ...newMediaItems] };
            }
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = await fetchSessionToken({ app });
            let endpoint = selectedTab === 0 ? "/api/product/update" : "/api/variants/update";
            
            let payload = { 
                shop, 
                productId,
                ...(selectedTab === 0 ? {
                    title: formData.title,
                    description: formData.description,
                    status: formData.status,
                    vendor: formData.vendor,
                    media: formData.media.filter(img => img !== null),
                } : {
                    variants: formData.variants.map((variant, index) => ({
                        ...variant,
                        imageUrl: formData.media[index]?.url || null
                    }))
                })
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

    const handleMediaUpload = (targetIndex = null) => async (_files, acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        // 1. Create a "Loading" placeholder in UI
        const tempUrl = window.URL.createObjectURL(file);
        const tempItem = { id: 'loading', url: tempUrl, alt: file.name };

        setFormData((prev) => ({
            ...prev,
            media: [...prev.media, tempItem]
        }));

        // 2. Upload to Backend immediately
        const uploadData = new FormData();
        uploadData.append("shop", shop);
        uploadData.append("productId", productId);
        uploadData.append("image", file);

        try {
            const token = await fetchSessionToken({ app });
            const response = await axios.post("/api/product/media/upload", uploadData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data" 
                },
            });

            if (response.data.success) {
                // 3. Replace the 'loading' item with the actual Shopify data
                const newShopifyMedia = response.data.media; // Should contain {id, url, alt}
                
                setFormData((prev) => ({
                    ...prev,
                    media: prev.media.map(item => item.id === 'loading' ? newShopifyMedia : item)
                }));
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image to Shopify.");
            // Remove the failed placeholder
            setFormData((prev) => ({
                ...prev,
                media: prev.media.filter(item => item.id !== 'loading')
            }));
        }
    };

    if (isLoading) {
        return (
            <SkeletonPage primaryAction backAction>
                <BlockStack gap="500">
                    <SkeletonTabs count={3} />
                    <Layout>
                        <Layout.Section>
                            <Card><SkeletonBodyText lines={6} /></Card>
                        </Layout.Section>
                        <Layout.Section variant="oneThird">
                            <Card><SkeletonBodyText lines={2} /></Card>
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
                <Text variant="headingMd" as="h2">Metafields</Text>
                <Box padding="800" borderWidth="025" borderColor="border" borderRadius="200" backgroundColor="bg-surface-secondary">
                    <BlockStack gap="200" align="center">
                        <Text variant="headingSm" as="h3" alignment="center">No metafields found</Text>
                        <Text tone="subdued" alignment="center">
                            Add product metafields in <Link monochrome url="#">Shopify admin</Link>
                        </Text>
                    </BlockStack>
                </Box>
            </BlockStack>
        </Card>
    );

    return (
        <Page
            backAction={{ content: "Products", url: "#" }}
            title={formData.title || "Edit Product"}
            titleMetadata={<Badge tone={formData.status === "active" ? "success" : "attention"}>{formData.status}</Badge>}
            primaryAction={{
                content: selectedTab === 0 ? "Save Product" : "Save All Variants",
                onAction: handleSave,
                loading: isSaving,
            }}
        >
            <BlockStack gap="500">
                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab} />

                {selectedTab === 0 && (
                    <Layout>
                        <Layout.Section>
                            <BlockStack gap="400">
                                <Card>
                                    <BlockStack gap="400">
                                        <TextField label="Title" value={formData.title} onChange={updateField("title")} autoComplete="off" />
                                        <BlockStack gap="100">
                                            <Text as="label" variant="bodyMd">Description</Text>
                                            <div className="polar-quill-wrapper">
                                                <ReactQuill theme="snow" value={formData.description} onChange={updateField("description")} />
                                            </div>
                                        </BlockStack>
                                    </BlockStack>
                                </Card>
                                <Card>
                                    <BlockStack gap="200">
                                        <Text variant="headingMd" as="h2">Media</Text>
                                        <DropZone onDrop={handleMediaUpload()}>
                                            <DropZone.FileUpload />
                                        </DropZone>
                                        {formData.media.length > 0 && (
                                            <Box paddingBlockStart="400">
                                                <InlineStack gap="300">
                                                    {formData.media.map((img, i) => img && (
                                                        <BlockStack key={i} gap="100" align="center">
                                                            <Thumbnail size="large" alt={img.alt} source={img.url} />
                                                            <Button 
                                                                variant="plain" 
                                                                tone="critical" 
                                                                size="micro" 
                                                                onClick={() => removeProductImage(i)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </BlockStack>
                                                    ))}
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
                                    <Select label="Status" options={[{ label: "Active", value: "active" }, { label: "Draft", value: "draft" }]} value={formData.status} onChange={updateField("status")} />
                                </Card>
                                <Card>
                                    <TextField label="Vendor" value={formData.vendor} onChange={updateField("vendor")} />
                                </Card>
                            </BlockStack>
                        </Layout.Section>
                    </Layout>
                )}

                {selectedTab === 1 && (
                    <Layout>
                        <Layout.Section variant="oneThird">
                            <BlockStack gap="200">
                                {formData.variants.map((v, index) => (
                                    <Box key={v.id || index} onClick={() => setActiveVariantIndex(index)} cursor="pointer">
                                        <Card background={activeVariantIndex === index ? "bg-surface-selected" : "bg-surface"}>
                                            <InlineStack align="space-between" blockAlign="center">
                                                <InlineStack gap="200" blockAlign="center">
                                                    {/* Updated to use variant's specific imageUrl if available */}
                                                    <Thumbnail size="small" source={v.imageUrl || formData.media[index]?.url || ImageIcon} alt={v.title} />
                                                    <Text fontWeight={activeVariantIndex === index ? "bold" : "regular"}>{v.title}</Text>
                                                </InlineStack>
                                                {activeVariantIndex === index && <Icon source={CheckIcon} tone="success" />}
                                            </InlineStack>
                                        </Card>
                                    </Box>
                                ))}
                            </BlockStack>
                        </Layout.Section>

                        <Layout.Section>
                            <BlockStack gap="400">
                                <Banner tone="warning" title="Variant Review Required">
                                    <p>Check compliance for Google Merchant Center.</p>
                                </Banner>
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h2">Pricing - {currentVariant.title}</Text>
                                        <InlineGrid columns={2} gap="400">
                                            <TextField label="Price" prefix="$" value={currentVariant.price} onChange={(val) => updateVariantField(activeVariantIndex, "price", val)} />
                                            <TextField label="Compare at price" prefix="$" value={currentVariant.compareAtPrice || ""} onChange={(val) => updateVariantField(activeVariantIndex, "compareAtPrice", val)} />
                                        </InlineGrid>
                                    </BlockStack>
                                </Card>
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h2">Inventory</Text>
                                        <InlineGrid columns={2} gap="400">
                                            <TextField label="SKU" value={currentVariant.sku || ""} onChange={(val) => updateVariantField(activeVariantIndex, "sku", val)} />
                                            <TextField label="Barcode" value={currentVariant.barcode || ""} onChange={(val) => updateVariantField(activeVariantIndex, "barcode", val)} />
                                        </InlineGrid>
                                        <Checkbox label="Track quantity" checked={currentVariant.inventoryPolicy === "DENY"} onChange={(val) => updateVariantField(activeVariantIndex, "inventoryPolicy", val ? "DENY" : "CONTINUE")} />
                                    </BlockStack>
                                </Card>
                                <Card>
                                    <BlockStack gap="200">
                                        <Text variant="headingMd" as="h2">Media</Text>
                                        {formData.media[activeVariantIndex] ? (
                                            <Box paddingBlockStart="200">
                                                <InlineStack gap="300" blockAlign="center">
                                                    <Thumbnail size="large" source={formData.media[activeVariantIndex].url} alt="Variant" />
                                                    <BlockStack gap="100">
                                                        <Text variant="bodyMd" fontWeight="bold">Active Image</Text>
                                                        <Button variant="plain" tone="critical" onClick={() => removeVariantImage(activeVariantIndex)}>Remove image</Button>
                                                    </BlockStack>
                                                </InlineStack>
                                            </Box>
                                        ) : (
                                            <DropZone onDrop={handleMediaUpload(activeVariantIndex)}>
                                                <DropZone.FileUpload />
                                            </DropZone>
                                        )}
                                    </BlockStack>
                                </Card>
                                {MetafieldsCard}
                            </BlockStack>
                        </Layout.Section>
                    </Layout>
                )}
            </BlockStack>

            <style>{`
                .polar-quill-wrapper .ql-toolbar.ql-snow { border-top-left-radius: 8px; border-top-right-radius: 8px; border-color: #8c9196; background-color: #f6f6f7; }
                .polar-quill-wrapper .ql-container.ql-snow { border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-color: #8c9196; min-height: 200px; }
            `}</style>
        </Page>
    );
};

export default EditProduct;