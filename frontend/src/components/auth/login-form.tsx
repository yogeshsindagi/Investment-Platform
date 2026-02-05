import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"

export function LoginForm() {
  const navigate = useNavigate()
  
  // State for inputs
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const BASE_URL = "https://investment-backend-54qm.onrender.com"

    try {
      // 1. Send Login Request
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            identifier: identifier, 
            password: password 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || "Login failed")
      } else {
        console.log("Login successful:", data)

        // 2. SAFETY CHECK: Ensure we actually got a token
        if (!data.access_token) {
            console.error("CRITICAL: Missing access_token in response", data)
            setError("System error: Login succeeded but no token received.")
            return 
        }

        // 3. Save Credentials to Local Storage
        localStorage.setItem("token", data.access_token)
        
        // Save User ID (Prefer ID from backend, fallback to input)
        const finalUserId = data.user_id || data.id || identifier
        localStorage.setItem("user_id", finalUserId)

        // 4. Redirect to Portfolio
        navigate("/portfolio")
      }
    } catch (err) {
      console.error(err)
      setError("Network error. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your User ID or Email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="identifier">User ID or Email</FieldLabel>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text" 
                  placeholder="Enter your User ID or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                </div>
              </Field>

              {error && <FieldDescription className="text-red-500 font-medium mt-2">{error}</FieldDescription>}

              <Field>
                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </Field>

              <Field>
                <FieldDescription className="text-center mt-4">
                  Don&apos;t have an account?{" "}
                  <Link to="/signup" className="text-blue-600 hover:underline">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}