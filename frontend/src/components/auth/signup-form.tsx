import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
// 1. IMPORT ICONS
import { CheckCircle2, Eye, EyeOff } from "lucide-react"


export function SignupForm() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // 2. NEW STATE for Password Visibility
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // State for success message
  const [createdUserId, setCreatedUserId] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("https://investment-backend-54qm.onrender.com/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: fullName, 
          email: email, 
          password: password 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
             setError(data.detail[0].msg)
        } else {
             setError(data.detail || "Signup failed")
        }
      } else {
        if (data.user_id) {
            setCreatedUserId(data.user_id)
        } else {
            alert("Account created! Please login.")
            navigate("/login")
        }
      }
    } catch (err) {
      setError("Network error. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  // Success View
  if (createdUserId) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md text-center border-green-200 bg-green-50/50">
                <CardHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-green-800">Account Created!</CardTitle>
                    <CardDescription className="text-green-700">
                        Your registration was successful.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Your User ID</p>
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-4xl font-extrabold text-gray-800">{createdUserId}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Please memorize or save this ID.</p>
                    </div>

                    <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        onClick={() => navigate("/login")}
                    >
                        Proceed to Login
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  // Normal Form View
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Enter your information to start investing</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              {/* 3. UPDATED PASSWORD FIELD */}
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"} // Dynamic Type
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10" // Add padding to right so text doesn't hide behind icon
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {/* 4. UPDATED CONFIRM PASSWORD FIELD */}
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"} // Dynamic Type
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {error && <FieldDescription className="text-red-500 font-medium mt-2">{error}</FieldDescription>}

              <Field className="mt-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
                <FieldDescription className="px-6 text-center mt-2">
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-600 hover:underline">
                    Sign in
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
