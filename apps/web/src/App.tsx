import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
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
          { path: "productos", element: <AdminProductsPage /> },
          { path: "pedidos", element: <AdminOrdersPage /> },
          { path: "ajustes", element: <AdminSettingsPage /> }
        ]
      }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
