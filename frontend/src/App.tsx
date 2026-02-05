import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { PortfolioDashboard } from "@/components/dashboard/portfolio" 
import { MarketPage } from "@/components/dashboard/market"
import { Chatbot } from "@/components/chatbot/chatbot" 

// Layout wrapper for Dashboard pages only
const DashboardLayout = () => {
  return (
    <>
      <Outlet />
      <Chatbot />
    </>
  )
}

const router = createBrowserRouter([
  // --- Public Routes ---
  { path: "/", element: <LoginForm /> },
  { path: "/login", element: <LoginForm /> },
  { path: "/signup", element: <SignupForm /> },

  // --- Dashboard Routes (With Chatbot) ---
  {
    // This 'element' property applies the layout to all 'children'
    element: <DashboardLayout />,
    children: [
      { path: "/portfolio", element: <PortfolioDashboard /> },
      { path: "/market", element: <MarketPage /> },
    ]
  }
])

export default function App() {
  return <RouterProvider router={router} />
}