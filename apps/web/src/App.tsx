import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminCategoryDetailPage } from "./pages/admin/AdminCategoryDetailPage";
import { AdminCategoryFormPage } from "./pages/admin/AdminCategoryFormPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminProductDetailPage } from "./pages/admin/AdminProductDetailPage";
import { AdminProductFormPage } from "./pages/admin/AdminProductFormPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminReviewDetailPage } from "./pages/admin/AdminReviewDetailPage";
import { AdminReviewFormPage } from "./pages/admin/AdminReviewFormPage";
import { AdminReviewsPage } from "./pages/admin/AdminReviewsPage";
import { CartPage } from "./pages/CartPage";
import { CatalogPage } from "./pages/CatalogPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/catalogo", element: <CatalogPage /> },
      { path: "/catalogo/:categorySlug", element: <CatalogPage /> },
      { path: "/producto/:slug", element: <ProductPage /> },
      { path: "/carrito", element: <CartPage /> },
      { path: "/pedido/:code", element: <ConfirmationPage /> },
      { path: "/contacto", element: <ContactPage /> },
      { path: "/admin/login", element: <AdminLoginPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "categorias", element: <AdminCategoriesPage /> },
          { path: "categorias/nuevo", element: <AdminCategoryFormPage /> },
          { path: "categorias/:id", element: <AdminCategoryDetailPage /> },
          { path: "categorias/:id/editar", element: <AdminCategoryFormPage /> },
          { path: "resenas", element: <AdminReviewsPage /> },
          { path: "resenas/nuevo", element: <AdminReviewFormPage /> },
          { path: "resenas/:id", element: <AdminReviewDetailPage /> },
          { path: "resenas/:id/editar", element: <AdminReviewFormPage /> },
          { path: "productos", element: <AdminProductsPage /> },
          { path: "productos/nuevo", element: <AdminProductFormPage /> },
          { path: "productos/:id", element: <AdminProductDetailPage /> },
          { path: "productos/:id/editar", element: <AdminProductFormPage /> },
          { path: "pedidos", element: <Navigate to="/admin" replace /> }
        ]
      }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
