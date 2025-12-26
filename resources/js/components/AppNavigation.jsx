import React from "react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Link } from "react-router-dom";
 
export default function AppNavigation({ shop }) {
  return (
    <NavMenu>
      <Link to={`/?shop=${shop}`} rel={`home?shop=${shop}`}>Home</Link>
      <Link to={`/products?shop=${shop}`}>Products</Link>
    </NavMenu>
  );
}