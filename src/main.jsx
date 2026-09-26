import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import {
  SellerHome,
  SellerProducts,
  SellerCatalog,
  SellerStores,
  SellerOrders,
  SellerShipping
} from "./pages/Seller";
import {
  VendorHome,
  VendorProducts,
  VendorOrders,
  VendorShipping
} from "./pages/Vendor";
import "./style.css";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/seller"
        element={
          <ProtectedRoute role="seller">
            <SellerHome />
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
            <SellerOrders />
          </ProtectedRoute>
        }
      />
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
            <VendorHome />
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
            <VendorOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/shipping"
        element={
          <ProtectedRoute role="vendor">
            <VendorShipping />
          </ProtectedRoute>
        }
      />

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
