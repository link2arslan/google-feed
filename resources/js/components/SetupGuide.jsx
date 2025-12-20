import React from "react";
import {
    LegacyCard,
    Text,
    BlockStack,
    InlineStack,
    Badge,
    Button,
    ButtonGroup,
    Divider,
    RadioButton,
    Box,
    Icon,
} from "@shopify/polaris";
import {
    LockIcon,
    LinkIcon,
    ClockIcon,
} from "@shopify/polaris-icons";

const SetupGuide = ({ onDismiss, guideState, onUpdateStep, onToggleExpanded }) => {
    const completedSteps = Object.values(guideState.steps).filter((step) => step.completed).length;

    const handleSyncMethodChange = (value) => {
        onUpdateStep("step1", { value, completed: true });
    };

    const handleChannelConnect = (channel) => {
        onUpdateStep("step2", { completed: true });
    };

    return (
        <LegacyCard sectioned>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                        <Text as="h2" variant="headingLg">
                            Setup Guide
                        </Text>
                        <Text as="p" variant="bodyMd">
                            Use this personalized guide to get your store ready for sales.
                        </Text>
                        <Text as="p" tone="subdued">
                            {completedSteps} out of 3 steps completed
                        </Text>
                    </BlockStack>
                    <ButtonGroup>
                        <Button onClick={onDismiss} variant="plain" icon="x" />
                        <Button
                            onClick={() => onToggleExpanded("setupGuide")}
                            variant="plain"
                            icon={guideState.expanded.setupGuide ? "chevronUp" : "chevronDown"}
                        />
                    </ButtonGroup>
                </InlineStack>

                {guideState.expanded.setupGuide && (
                    <BlockStack gap="200">
                        {/* Step 1 */}
                        <Box>
                            <BlockStack gap="200">
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => onToggleExpanded("step1")}
                                >
                                    <InlineStack gap="400" blockAlign="center">
                                        <InlineStack gap="300" alignItems="center">
                                            <Icon source={LockIcon} tone="base" />
                                            <Text as="h3" variant="headingSm">
                                                Choose Sync Method
                                            </Text>
                                            {guideState.steps.step1.completed && <Badge tone="success">Completed</Badge>}
                                        </InlineStack>
                                        <Button
                                            variant="plain"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleExpanded("step1");
                                            }}
                                            icon={guideState.expanded.step1 ? "chevronUp" : "chevronDown"}
                                        />
                                    </InlineStack>
                                    <Text as="p" tone="subdued">
                                        Choose how you want to sync products
                                    </Text>
                                </div>

                                {guideState.expanded.step1 && (
                                    <Box background="bg-surface-secondary" borderRadius="200" padding="400">
                                        <BlockStack gap="400">
                                            <RadioButton
                                                label="Use Content API"
                                                helpText="Direct sync"
                                                checked={guideState.steps.step1.value === "content_api"}
                                                onChange={() => handleSyncMethodChange("content_api")}
                                            />
                                            <RadioButton
                                                label="Use XML feed"
                                                helpText="Manual XML link-base sync"
                                                checked={guideState.steps.step1.value === "xml_feed"}
                                                onChange={() => handleSyncMethodChange("xml_feed")}
                                            />
                                        </BlockStack>
                                    </Box>
                                )}
                            </BlockStack>
                        </Box>

                        <Divider />

                        {/* Step 2 */}
                        <Box>
                            <BlockStack gap="200">
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => onToggleExpanded("step2")}
                                >
                                    <InlineStack gap="400" blockAlign="center">
                                        <InlineStack gap="300" alignItems="center">
                                            <Icon source={LinkIcon} tone="base" />
                                            <Text as="h3" variant="headingSm">
                                                Choose Channels
                                            </Text>
                                            {guideState.steps.step2.completed && <Badge tone="success">Completed</Badge>}
                                        </InlineStack>
                                        <Button
                                            variant="plain"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleExpanded("step2");
                                            }}
                                            icon={guideState.expanded.step2 ? "chevronUp" : "chevronDown"}
                                        />
                                    </InlineStack>
                                    <Text as="p" tone="subdued">
                                        Sync your products to one or more advertising platforms
                                    </Text>
                                </div>

                                {guideState.expanded.step2 && (
                                    <Box background="bg-surface-secondary" borderRadius="200" padding="400">
                                        <BlockStack gap="400">
                                            {/* Google */}
                                            <LegacyCard sectioned>
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <InlineStack gap="400" blockAlign="center">
                                                        <div style={{ width: "32px", height: "32px" }}>
                                                            {/* Google Logo SVG */}
                                                            <svg viewBox="0 0 48 48" width="24" height="24">
                                                                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                                                <path fill="#34A853" d="M24 44c5.16 0 9.92-1.63 13.56-4.42l-6.85-6.85c-1.87 1.24-4.24 1.96-6.71 1.96-6.26 0-11.57-4.22-13.44-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                                                <path fill="#FABB05" d="M43.61 28.5c.34-1.61.53-3.23.53-4.82 0-2.34-.33-4.52-1.01-6.52l-6.83 5.43c.18 1.14.33 2.38.33 3.69 0 3.39-1.2 6.53-3.08 8.87l6.85 6.85C42.45 39.06 44.25 34.02 43.61 28.5z" />
                                                                <path fill="#E94235" d="M10.56 28.18c-.46-1.52-.7-3.13-.7-4.78 0-1.65.24-3.26.7-4.78l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 11.22l7.98-6.19c-.38-1.52-.7-3.1-.98-4.85z" />
                                                            </svg>
                                                        </div>
                                                        <Text as="h4" variant="headingSm">
                                                            Google Merchant Center (GMC)
                                                        </Text>
                                                    </InlineStack>
                                                    <Button disabled>Connected</Button>
                                                </InlineStack>
                                            </LegacyCard>

                                            {/* Facebook */}
                                            <LegacyCard sectioned>
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <InlineStack gap="400" blockAlign="center">
                                                        <div style={{ width: "32px", height: "32px" }}>
                                                            {/* Facebook Logo SVG */}
                                                            <svg viewBox="0 0 48 48" width="24" height="24">
                                                                <path fill="#1877F2" d="M24 0C10.74 0 0 10.74 0 24c0 11.99 8.77 21.97 20.26 23.77V30.95h-6.1V24h6.1v-5.27c0-6.01 3.58-9.35 9.07-9.35 2.62 0 5.37.47 5.37.47v5.9h-3.03c-2.98 0-3.91 1.85-3.91 3.75V24h6.64l-1.06 6.95h-5.58v16.82C39.23 45.97 48 35.99 48 24c0-13.26-10.74-24-24-24z" />
                                                            </svg>
                                                        </div>
                                                        <Text as="h4" variant="headingSm">
                                                            Facebook catalog
                                                        </Text>
                                                    </InlineStack>
                                                    <Button onClick={() => handleChannelConnect("facebook")}>Connect</Button>
                                                </InlineStack>
                                            </LegacyCard>

                                            {/* Microsoft */}
                                            <LegacyCard sectioned>
                                                <InlineStack align="space-between" blockAlign="center">
                                                    <InlineStack gap="400" blockAlign="center">
                                                        <div style={{ width: "32px", height: "32px" }}>
                                                            {/* Microsoft Logo SVG */}
                                                            <svg viewBox="0 0 23 23" width="24" height="24">
                                                                <path fill="#F25022" d="M1 1h10v10H1z" />
                                                                <path fill="#00A4EF" d="M1 12h10v10H1z" />
                                                                <path fill="#7FBA00" d="M12 1h10v10H12z" />
                                                                <path fill="#FFB900" d="M12 12h10v10H12z" />
                                                            </svg>
                                                        </div>
                                                        <Text as="h4" variant="headingSm">
                                                            Microsoft Merchant Center (MMC)
                                                        </Text>
                                                    </InlineStack>
                                                    <Button onClick={() => handleChannelConnect("mmc")}>Connect</Button>
                                                </InlineStack>
                                            </LegacyCard>
                                        </BlockStack>
                                    </Box>
                                )}
                            </BlockStack>
                        </Box>

                        <Divider />

                        {/* Step 3 */}
                        <Box>
                            <BlockStack gap="200">
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => onToggleExpanded("step3")}
                                >
                                    <InlineStack gap="400" blockAlign="center">
                                        <InlineStack gap="300" alignItems="center">
                                            <Icon source={ClockIcon} tone="base" />
                                            <Text as="h3" variant="headingSm">
                                                Check Sync Status
                                            </Text>
                                            {guideState.steps.step3.completed && <Badge tone="success">Completed</Badge>}
                                        </InlineStack>
                                        <Button
                                            variant="plain"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleExpanded("step3");
                                            }}
                                            icon={guideState.expanded.step3 ? "chevronUp" : "chevronDown"}
                                        />
                                    </InlineStack>
                                    <Text as="p" tone="subdued">
                                        Check how many products are synced, disapproved, or invalid
                                    </Text>
                                </div>

                                {guideState.expanded.step3 && (
                                    <Box background="bg-surface-secondary" borderRadius="200" padding="400">
                                        <Button onClick={() => onUpdateStep("step3", { completed: true })}>
                                            View product statistics
                                        </Button>
                                    </Box>
                                )}
                            </BlockStack>
                        </Box>
                    </BlockStack>
                )}
            </BlockStack>
        </LegacyCard>
    );
};

export default SetupGuide;