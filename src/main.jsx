import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import SellerModern from "./pages/SellerModern";
import {SellerCommandCenter,VendorCommandCenter,ProfitCalculator,KycCenter,WalletCenter,ReportsCenter,VendorImport,FeaturePage} from "./pages/GrowthOS";
import {
  SellerHome,
  SellerProducts,
  SellerCatalog,
  SellerStores,
  SellerOrders,
  SellerShipping,
  SellerFeature
} from "./pages/Seller";
import {
  VendorHome,
  VendorProducts,
  VendorOrders,
  VendorShipping
} from "./pages/Vendor";
import {SellerOrders as LiveSellerOrders, VendorOrders as LiveVendorOrders, ShipmentCenter, NdrCenter, RtoCenter, RemittanceCenter, SellerAnalytics} from "./pages/Operations";
import "./style.css";
import "./modern.css";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/seller"
        element={
          <ProtectedRoute role="seller">
            <SellerCommandCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/products"
        element={
          <ProtectedRoute role="seller">
            <SellerProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/catalog"
        element={
          <ProtectedRoute role="seller">
            <SellerCatalog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/stores"
        element={
          <ProtectedRoute role="seller">
            <SellerStores />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders"
        element={
          <ProtectedRoute role="seller">
            <LiveSellerOrders />
          </ProtectedRoute>
        }
      />
      <Route path="/seller/analytics" element={<ProtectedRoute role="seller"><SellerAnalytics/></ProtectedRoute>} />
      <Route path="/seller/external-orders" element={<ProtectedRoute role="seller"><SellerFeature title="External Orders" eyebrow="ORDER OPERATIONS" description="Centralize orders from channels outside the primary store connection."/></ProtectedRoute>} />
      <Route path="/seller/external-shipment" element={<ProtectedRoute role="seller"><SellerFeature title="External Shipment" eyebrow="SHIPMENT OPERATIONS" description="Manage shipment workflows for external order sources."/></ProtectedRoute>} />
      <Route path="/seller/winning-ads" element={<ProtectedRoute role="seller"><SellerFeature title="Winning Ads" eyebrow="GROWTH" description="Keep proven product creatives and campaign workflows close to your catalog."/></ProtectedRoute>} />
      <Route path="/seller/source-product" element={<ProtectedRoute role="seller"><SellerFeature title="Source A Product" eyebrow="PRODUCT SOURCING" description="Discover, compare and move promising products into your catalog."/></ProtectedRoute>} />
      <Route path="/seller/rto-intelligence" element={<ProtectedRoute role="seller"><RtoCenter role="seller"/></ProtectedRoute>} />
      <Route path="/seller/ndr" element={<ProtectedRoute role="seller"><NdrCenter role="seller"/></ProtectedRoute>} />
      <Route path="/seller/billing" element={<ProtectedRoute role="seller"><RemittanceCenter role="seller"/></ProtectedRoute>} />
      <Route path="/seller/settings" element={<ProtectedRoute role="seller"><SellerFeature title="Settings" eyebrow="WORKSPACE" description="Seller preferences, channel configuration and account controls belong here."/></ProtectedRoute>} />

      <Route
        path="/seller/shipping"
        element={
          <ProtectedRoute role="seller">
            <SellerShipping />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor"
        element={
          <ProtectedRoute role="vendor">
            <VendorCommandCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/products"
        element={
          <ProtectedRoute role="vendor">
            <VendorProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/orders"
        element={
          <ProtectedRoute role="vendor">
            <LiveVendorOrders />
          </ProtectedRoute>
        }
      />
      <Route path="/vendor/shipping" element={<ProtectedRoute role="vendor"><ShipmentCenter role="vendor"/></ProtectedRoute>} />

      <Route path="/seller/profit" element={<ProtectedRoute role="seller"><ProfitCalculator/></ProtectedRoute>} />
      <Route path="/seller/kyc" element={<ProtectedRoute role="seller"><KycCenter role="seller"/></ProtectedRoute>} />
      <Route path="/seller/wallet" element={<ProtectedRoute role="seller"><WalletCenter role="seller"/></ProtectedRoute>} />
      <Route path="/seller/reports" element={<ProtectedRoute role="seller"><ReportsCenter role="seller"/></ProtectedRoute>} />
      <Route path="/seller/insights" element={<ProtectedRoute role="seller"><FeaturePage role="seller" title="AI Insights" description="Actionable product, margin and fulfillment signals for your store." /></ProtectedRoute>} />
      <Route path="/vendor/import" element={<ProtectedRoute role="vendor"><VendorImport/></ProtectedRoute>} />
      <Route path="/vendor/inventory" element={<ProtectedRoute role="vendor"><FeaturePage role="vendor" title="Inventory Control" description="Stock health, low-stock alerts and SKU-level visibility." /></ProtectedRoute>} />
      <Route path="/vendor/sellers" element={<ProtectedRoute role="vendor"><FeaturePage role="vendor" title="Seller Network" description="Understand seller relationships, product adoption and order contribution." /></ProtectedRoute>} />
      <Route path="/vendor/kyc" element={<ProtectedRoute role="vendor"><KycCenter role="vendor"/></ProtectedRoute>} />
      <Route path="/vendor/wallet" element={<ProtectedRoute role="vendor"><WalletCenter role="vendor"/></ProtectedRoute>} />
      <Route path="/vendor/reports" element={<ReportsCenter role="vendor"/></ProtectedRoute>} />
      <Route path="/vendor/exceptions" element={<FeaturePage role="vendor" title="NDR & RTO Intelligence" description="Monitor delivery exceptions and prioritize recovery actions." /></ProtectedRoute>} />
      <Route path="/vendor/integrations" element={<FeaturePage role="vendor" title="Integrations" description="Shipping, APIs, webhooks and channel connectivity." /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
