// resources/js/PolarisProvider.jsx
import React from "react";
import { AppProvider } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

const PolarisProvider = ({ children }) => {
  return <AppProvider i18n={en}>{children}</AppProvider>;
};

export default PolarisProvider;
