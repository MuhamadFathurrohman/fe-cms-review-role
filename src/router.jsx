/**
 * @file router.jsx
 * @description Konfigurasi routing aplikasi menggunakan React Router v6.
 * Mendefinisikan semua rute, termasuk:
 * - Rute publik (login, forgot password)
 * - Rute terlindungi (`ProtectedRoute`)
 * - Rute berbasis peran (`RoleProtectedRoute`)
 * - Penanganan error (404, unauthorized)
 */

import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "./views/Auth/Login";
import ForgotPassword from "./views/Auth/ForgotPassword";
import ResetPassword from "./views/Auth/ResetPassword";
import Unauthorized from "./views/Unauthorized";
import NotFound from "./views/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Home from "./views/Home";
import Layout from "./components/Layout";
import Users from "./views/Users";
import Roles from "./views/Roles";
import Clients from "./views/Clients";
import Analytics from "./views/Analytics";
import AuditLog from "./views/AuditLog";
import Settings from "./views/Settings";
import Blogs from "./views/Content/Blogs";
import BlogsApproval from "./views/Content/BlogsApproval";
import Gallery from "./views/Content/Gallery";
import Categories from "./views/Product/Categories";
import Brands from "./views/Product/Brands";
import Items from "./views/Product/Items";
import Catalogs from "./views/Catalogs";
import ItemsApproval from "./views/Product/ItemsApproval";
import { canReview, canAccess } from "./utils/permissions";

/**
 * Instance router utama aplikasi.
 * Menggunakan `createBrowserRouter` untuk konfigurasi imperative.
 *
 * @type {import('react-router-dom').Router}
 */
const router = createBrowserRouter([
  // Redirect root ke halaman login
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  // === RUTE PUBLIK (tidak perlu autentikasi) ===
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },

  // === HALAMAN ERROR ===
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  // === RUTE DASHBOARD (terlindungi) ===
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      // Redirect default ke home
      {
        index: true,
        element: <Navigate to="/dashboard/home" replace />,
      },
      {
        path: "home",
        element: <Home />,
      },

      // Rute manajemen pengguna & peran
      {
        path: "users",
        element: (
          <RoleProtectedRoute requiredPermission="user">
            <Users />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "roles",
        element: (
          <RoleProtectedRoute requiredPermission="role">
            <Roles />
          </RoleProtectedRoute>
        ),
      },

      // Rute klien & katalog
      {
        path: "clients",
        element: (
          <RoleProtectedRoute requiredPermission="client">
            <Clients />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "catalog",
        element: (
          <RoleProtectedRoute requiredPermission="catalog">
            <Catalogs />
          </RoleProtectedRoute>
        ),
      },

      // Rute analitik (akses umum untuk user terautentikasi)
      {
        path: "analytics",
        element: <Analytics />,
      },

      // === SUB-RUTE: KONTEN ===
      {
        path: "content",
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard/content/gallery" replace />,
          },
          {
            path: "gallery",
            element: <Gallery />,
          },
          {
            path: "blogs",
            children: [
              {
                index: true,
                element: (
                  <RoleProtectedRoute
                    requiredPermission="blog"
                    permissionChecker={canAccess}
                  >
                    <Blogs />
                  </RoleProtectedRoute>
                ),
              },
              {
                path: "approval",
                element: (
                  <RoleProtectedRoute
                    requiredPermission="blog"
                    permissionChecker={canReview}
                  >
                    <BlogsApproval />
                  </RoleProtectedRoute>
                ),
              },
            ],
          },
        ],
      },

      // === SUB-RUTE: PRODUK ===
      {
        path: "products",
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard/products/categories" replace />,
          },
          {
            path: "categories",
            element: (
              <RoleProtectedRoute requiredPermission="category">
                <Categories />
              </RoleProtectedRoute>
            ),
          },
          {
            path: "brands",
            element: (
              <RoleProtectedRoute requiredPermission="brand">
                <Brands />
              </RoleProtectedRoute>
            ),
          },
          {
            path: "items",
            children: [
              {
                index: true,
                element: (
                  <RoleProtectedRoute
                    requiredPermission="product"
                    permissionChecker={canAccess}
                  >
                    <Items />
                  </RoleProtectedRoute>
                ),
              },
              {
                path: "approval",
                element: (
                  <RoleProtectedRoute
                    requiredPermission="product"
                    permissionChecker={canReview}
                  >
                    <ItemsApproval />
                  </RoleProtectedRoute>
                ),
              },
            ],
          },
        ],
      },

      // Rute audit log & pengaturan
      {
        path: "auditlog",
        element: (
          <RoleProtectedRoute requiredPermission="audit_log">
            <AuditLog />
          </RoleProtectedRoute>
        ),
      },
      {
        path: "settings",
        element: (
          <RoleProtectedRoute requiredPermission="settings">
            <Settings />
          </RoleProtectedRoute>
        ),
      },
    ],
  },

  // === PENANGANAN RUTE TIDAK DITEMUKAN (404) ===
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
