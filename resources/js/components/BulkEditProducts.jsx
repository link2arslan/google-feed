import React, { useState, useEffect } from "react";
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
import { useAppBridge } from "@shopify/app-bridge-react";
import { useLocation } from "react-router-dom";

const BulkEditProducts = () => {
  const app = useAppBridge();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const shop = params.get("shop");
  const ids = params.get("ids");

  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. Fetch Selected Data ---
  useEffect(() => {
    const fetchSelectedProducts = async () => {
      try {
        setIsLoading(true);
        const token = await fetchSessionToken({ app });
        const res = await axios.get("/api/products/bulk", {
          params: { shop, ids },
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        
        // Based on your backend dump, the data is likely directly in res.data
        // Adjust this to setProducts(res.data) if your Laravel controller returns the array directly
        const data = Array.isArray(res.data) ? res.data : res.data.products;
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching bulk products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (ids) fetchSelectedProducts();
  }, [app, shop, ids]);

  // --- 2. Dynamic Update Handler ---
  const handleUpdate = (productId, variantId, field, value) => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod;

        if (!variantId) {
          return { ...prod, [field]: value };
        }

        const updatedVariants = prod.variants.map((v) =>
          v.id === variantId ? { ...v, [field]: value } : v
        );
        return { ...prod, variants: updatedVariants };
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await fetchSessionToken({ app });
      await axios.post("/api/products/bulk-update", { 
        products, 
        shop 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Changes saved successfully");
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
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

  // --- 4. Table Row Mapping ---
  const rowMarkup = products.flatMap((product, index) => {
    // Parent Product Row
    const mainRow = (
      <IndexTable.Row id={product.id} key={product.id} position={index}>
        <IndexTable.Cell>
          <InlineStack gap="300" blockAlign="center" wrap={false}>
            <Thumbnail
              size="small"
              // Adjusted to match your backend: media[0].url
              source={product.media?.[0]?.url || ImageIcon}
              alt={product.title}
            />
            <div style={{ maxWidth: '200px' }}>
                <Text variant="bodyMd" fontWeight="bold" truncate as="span">
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
            onChange={(val) => handleUpdate(product.id, null, "status", val)}
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <TextField
            prefix={<SearchIcon style={{ width: '16px', color: '#8c9196' }} />}
            value={product.productType}
            onChange={(val) => handleUpdate(product.id, null, "productType", val)}
            autoComplete="off"
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <TextField
            value={product.vendor}
            onChange={(val) => handleUpdate(product.id, null, "vendor", val)}
            autoComplete="off"
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <TextField
            value={product.category || "Uncategorized"}
            onChange={(val) => handleUpdate(product.id, null, "category", val)}
            autoComplete="off"
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          {/* Base price usually shows the first variant's price */}
          <TextField
            prefix="PKR"
            value={product.variants?.[0]?.price}
            disabled
            autoComplete="off"
          />
        </IndexTable.Cell>
      </IndexTable.Row>
    );

    // Child Variant Rows
    const variantRows = (product.variants || []).map((variant) => (
      <IndexTable.Row id={variant.id} key={variant.id} position={index}>
        <IndexTable.Cell>
          <Box paddingInlineStart="1000">
            <Text variant="bodyMd" tone="subdued">
              {variant.title === "Default Title" ? "Standard" : variant.title}
            </Text>
          </Box>
        </IndexTable.Cell>
        <IndexTable.Cell><div className="ghost-bar" /></IndexTable.Cell>
        <IndexTable.Cell><div className="ghost-bar" /></IndexTable.Cell>
        <IndexTable.Cell><div className="ghost-bar" /></IndexTable.Cell>
        <IndexTable.Cell><div className="ghost-bar" /></IndexTable.Cell>
        <IndexTable.Cell>
          <TextField
            value={variant.price}
            onChange={(val) => handleUpdate(product.id, variant.id, "price", val)}
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
      backAction={{ content: "Products", url: "/products" }}
      primaryAction={{
        content: "Save changes",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
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
        .ghost-bar {
          height: 4px;
          width: 30px;
          background-color: #e1e3e5;
          border-radius: 2px;
          margin: auto;
        }
        .Polaris-IndexTable__TableCell {
          padding: 8px !important;
          vertical-align: middle;
        }
      `}</style>
    </Page>
  );
};

export default BulkEditProducts;