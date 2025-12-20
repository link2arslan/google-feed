import React from "react";
import {
    Card,
    Text,
    BlockStack,
    InlineGrid,
    InlineStack,
    Badge,
    Button,
    ProgressBar,
    Box,
    Icon,
    Divider,
} from "@shopify/polaris";
import {
    StoreIcon,
    ImportIcon,
    CheckIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ExternalIcon,
} from "@shopify/polaris-icons";

const Dashboard = ({ data }) => {
    const [statsExpanded, setStatsExpanded] = React.useState(true);

    if (!data) return null;

    return (
        <Box paddingBlockStart="500" paddingBlockEnd="500">
            <BlockStack gap="500">
                {/* Header Section */}
                <InlineStack align="space-between" blockAlign="center">
                    <Text as="h1" variant="headingLg">
                        Dashboard
                    </Text>
                    <Button
                        variant="tertiary"
                        icon={ExternalIcon}
                        onClick={() => {}}
                    >
                        Google channel
                    </Button>
                </InlineStack>

                {/* Main Stats Grid */}
                <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                    {/* Overview Card */}
                    <Card>
                        <BlockStack gap="400">
                            {/* Header with Title and Badge */}
                            <InlineStack
                                align="space-between"
                                blockAlign="center"
                            >
                                <Text as="h2" variant="headingMd">
                                    Overview
                                </Text>
                                <Badge tone="info-keppel">
                                    {data.planName} Plan
                                </Badge>
                            </InlineStack>

                            <Divider />

                            {/* The List Section - Using a Box to control the width and center it */}
                            <Box paddingBlockStart="200" paddingBlockEnd="200">
                                <BlockStack gap="300">
                                    {/* Row 1 */}
                                    <InlineStack gap="300" blockAlign="center">
                                        <Box width="24px">
                                            <Icon
                                                source={StoreIcon}
                                                tone="base"
                                            />
                                        </Box>
                                        <Text as="p" variant="bodyMd">
                                            <Text as="span" fontWeight="bold">
                                                {data.shopifyProductCount}
                                            </Text>{" "}
                                            products in Shopify
                                        </Text>
                                    </InlineStack>

                                    {/* Row 2 */}
                                    <InlineStack gap="300" blockAlign="center">
                                        <Box width="24px">
                                            <Icon
                                                source={ImportIcon}
                                                tone="base"
                                            />
                                        </Box>
                                        <Text as="p" variant="bodyMd">
                                            <Text as="span" fontWeight="bold">
                                                {data.appProductCount}
                                            </Text>{" "}
                                            products imported
                                        </Text>
                                    </InlineStack>

                                    {/* Row 3 */}
                                    <InlineStack gap="300" blockAlign="center">
                                        <Box width="24px">
                                            <Icon
                                                source={CheckIcon}
                                                tone="success"
                                            />
                                        </Box>
                                        <Text as="p" variant="bodyMd">
                                            <Text as="span" fontWeight="bold">
                                                {data.gmcProductCount}
                                            </Text>{" "}
                                            products submitted to GMC
                                        </Text>
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </Card>

                    {/* Resource Usage Card */}
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">
                                Resource remaining
                            </Text>
                            <Divider />
                            <Box paddingBlockStart="200">
                                <BlockStack gap="200">
                                    <InlineStack align="space-between">
                                        <Text
                                            as="p"
                                            variant="bodyMd"
                                            fontWeight="medium"
                                        >
                                            Processed products
                                        </Text>
                                        <Text
                                            as="p"
                                            variant="bodyMd"
                                            tone="subdued"
                                        >
                                            {data.resourceUsage.used} /{" "}
                                            {data.resourceUsage.total}
                                        </Text>
                                    </InlineStack>
                                    <ProgressBar
                                        progress={data.resourceUsage.percentage}
                                        tone={
                                            data.resourceUsage.percentage > 90
                                                ? "critical"
                                                : "primary"
                                        }
                                        size="small"
                                    />
                                    <Text
                                        as="p"
                                        variant="bodySm"
                                        tone="subdued"
                                    >
                                        You have used{" "}
                                        {data.resourceUsage.percentage}% of your
                                        monthly limit.
                                    </Text>
                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </Card>
                </InlineGrid>

                {/* Footer Info Card */}
                <Card padding="0">
                    <Box padding="400">
                        <BlockStack gap="200">
                            <InlineStack align="space-between">
                                <Text as="h2" variant="headingMd">
                                    Products Statistic
                                </Text>
                                <Button
                                    variant="plain"
                                    icon={
                                        statsExpanded
                                            ? ChevronUpIcon
                                            : ChevronDownIcon
                                    }
                                    onClick={() =>
                                        setStatsExpanded(!statsExpanded)
                                    }
                                >
                                    {statsExpanded ? "Collapse" : "Expand"}
                                </Button>
                            </InlineStack>

                            {statsExpanded && (
                                <Box paddingBlockStart="200">
                                    <Text as="p" tone="subdued">
                                        Products are processed by{" "}
                                        <strong>google-feeds-app</strong> and
                                        automatically synced to your Google
                                        Merchant Center using the Content API
                                        for real-time updates.
                                    </Text>
                                </Box>
                            )}
                        </BlockStack>
                    </Box>
                </Card>
            </BlockStack>
        </Box>
    );
};

export default Dashboard;
