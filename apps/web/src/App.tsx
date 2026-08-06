import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminCategoryDetailPage } from "./pages/admin/AdminCategoryDetailPage";
import { AdminCategoryFormPage } from "./pages/admin/AdminCategoryFormPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminExpenseDetailPage } from "./pages/admin/AdminExpenseDetailPage";
import { AdminExpenseFormPage } from "./pages/admin/AdminExpenseFormPage";
import { AdminExpensesPage } from "./pages/admin/AdminExpensesPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminOrderDetailPage } from "./pages/admin/AdminOrderDetailPage";
import { AdminOrderFormPage } from "./pages/admin/AdminOrderFormPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminProductDetailPage } from "./pages/admin/AdminProductDetailPage";
import { AdminProductFormPage } from "./pages/admin/AdminProductFormPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminQRCodeDetailPage } from "./pages/admin/AdminQRCodeDetailPage";
import { AdminQRCodeFormPage } from "./pages/admin/AdminQRCodeFormPage";
import { AdminQRCodesPage } from "./pages/admin/AdminQRCodesPage";
import { AdminReviewDetailPage } from "./pages/admin/AdminReviewDetailPage";
import { AdminReviewFormPage } from "./pages/admin/AdminReviewFormPage";
import { AdminReviewsPage } from "./pages/admin/AdminReviewsPage";
import { CartPage } from "./pages/CartPage";
import { CatalogPage } from "./pages/CatalogPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { QRCodePage } from "./pages/QRCodePage";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/catalogo", element: <CatalogPage /> },
      { path: "/catalogo/:categorySlug", element: <CatalogPage /> },
      { path: "/producto/:slug", element: <ProductPage /> },
      { path: "/q/:token", element: <QRCodePage /> },
      { path: "/carrito", element: <CartPage /> },
      { path: "/pedido/:code", element: <ConfirmationPage /> },
      { path: "/contacto", element: <ContactPage /> },
      { path: "/admin/login", element: <AdminLoginPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "gastos", element: <AdminExpensesPage /> },
          { path: "gastos/nuevo", element: <AdminExpenseFormPage /> },
          { path: "gastos/:id", element: <AdminExpenseDetailPage /> },
          { path: "gastos/:id/editar", element: <AdminExpenseFormPage /> },
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
          { path: "qrs", element: <AdminQRCodesPage /> },
          { path: "qrs/nuevo", element: <AdminQRCodeFormPage /> },
          { path: "qrs/:id", element: <AdminQRCodeDetailPage /> },
          { path: "qrs/:id/editar", element: <AdminQRCodeFormPage /> },
          { path: "pedidos", element: <AdminOrdersPage /> },
          { path: "pedidos/nuevo", element: <AdminOrderFormPage /> },
          { path: "pedidos/:id", element: <AdminOrderDetailPage /> },
          { path: "pedidos/:id/editar", element: <AdminOrderDetailPage /> }
        ]
      }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
