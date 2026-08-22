import { useState } from "react";
import { useLogin, useRegister } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { z } from "zod";
import { Loader2, ShieldCheck, User, Users, Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://ewura-hub-api.onrender.com";

// Schema for Login (accept username or email)
const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Forgot Password Schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email address is required"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// Forgot Password Tab Component
function ForgotPasswordTab({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [step, setStep] = useState<"request" | "reset" | "sent">("request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const forgotForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onForgotPassword(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send reset email");
      }

      setEmail(values.email);
      setStep("sent");
      toast({ title: "Email sent", description: "Check your email for the reset token." });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process request", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: resetToken, newPassword }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reset password");
      }

      toast({ title: "Success", description: "Password reset successfully! You can now log in." });
      setStep("request");
      forgotForm.reset();
      setResetToken("");
      setNewPassword("");
      setTimeout(() => setActiveTab("login"), 1500);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reset password", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {step === "request" ? (
        <Form {...forgotForm}>
          <form onSubmit={forgotForm.handleSubmit(onForgotPassword)} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900">Enter your email address and we'll send you a reset token to recover your password.</p>
            </div>
            <FormField
              control={forgotForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" type="email" className="h-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Email"
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              className="w-full h-12"
              onClick={() => setActiveTab("login")}
            >
              Back to Login
            </Button>
          </form>
        </Form>
      ) : step === "sent" ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900 font-medium mb-2">✓ Email sent successfully!</p>
            <p className="text-sm text-green-800">We've sent a password reset token to <strong>{email}</strong></p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>💡 Tip:</strong> If you don't see the email, please check your <strong>Spam</strong> or <strong>Junk</strong> folder. The email may take a few moments to arrive.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Enter the token and create a new password:</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Reset Token</label>
                <Input 
                  placeholder="Paste the token from your email" 
                  className="h-12 mt-1"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">New Password</label>
                <div className="relative mt-1">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter new password" 
                    className="h-12 pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Button 
            type="button"
            onClick={onResetPassword}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>

          <Button 
            type="button" 
            variant="outline"
            className="w-full h-12"
            onClick={() => {
              setStep("request");
              setResetToken("");
              setNewPassword("");
              forgotForm.reset();
            }}
          >
            Start Over
          </Button>
        </div>
      ) : null}
    </>
  );
}

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: register, isPending: isRegisterPending } = useRegister();
  const [, setLocation] = useLocation();
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Login Form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  // Register Form
  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", email: "", password: "", role: "user" },
  });

  function onLogin(values: LoginFormValues) {
    login(values);
  }

  function onRegister(values: InsertUser) {
    register(values);
  }

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* Left Panel - Hero/Branding */}
      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1535132011086-b8818f016104?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        {/* Descriptive comment: Abstract technological landscape background representing connection */}
        
        <div className="relative z-10 text-white max-w-xl">
          <div className="mb-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span className="font-medium text-sm">Official Data Reseller Hub</span>
          </div>
          
          <h1 className="text-5xl font-bold font-display mb-6 leading-tight">
            Connect Ghana with <span className="text-accent">Premium Data</span>
          </h1>
          <p className="text-lg text-white/80 leading-relaxed mb-8">
            Access the best data bundles across all networks at wholesale prices. 
            Join our network of trusted agents and smart users today.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <h3 className="font-bold text-xl mb-1">Fast Delivery</h3>
              <p className="text-sm text-white/60">Automated systems ensure you get your data in seconds.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <h3 className="font-bold text-xl mb-1">Secure Wallet</h3>
              <p className="text-sm text-white/60">Your funds are protected with enterprise-grade security.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8 bg-card border border-border rounded-[2rem] p-8 shadow-xl">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold font-display text-primary">Welcome to EwuraDataHub</h2>
            <p className="text-muted-foreground mt-2">Sign in to manage your account or get started today.</p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-10 gap-1">
              <TabsTrigger value="login" className="text-xs sm:text-sm">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-xs sm:text-sm">Sign Up</TabsTrigger>
              <TabsTrigger value="forgot" className="text-xs sm:text-sm">Reset</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-in fade-in slide-in-from-left-4 duration-300">
              <Card className="border-none bg-transparent shadow-none">
                <CardContent className="p-0">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username or Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username or email" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showLoginPassword ? "text" : "password"} 
                                  placeholder="••••••••" 
                                  className="h-12 pr-10" 
                                  {...field} 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showLoginPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                  ) : (
                                    <Eye className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveTab("forgot")}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                        disabled={isLoginPending}
                      >
                        {isLoginPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="border-none bg-transparent shadow-none">
                <CardContent className="p-0">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="you@example.com" type="email" className="h-12" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="0241234567" className="h-12" maxLength={10} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary" />
                                    <span>Regular User (Buy Data)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="agent">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-accent" />
                                    <span>Agent (Resell Data)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showRegisterPassword ? "text" : "password"} 
                                  placeholder="Create a password" 
                                  className="h-12 pr-10" 
                                  {...field} 
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showRegisterPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                  ) : (
                                    <Eye className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={isRegisterPending}
                      >
                         {isRegisterPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forgot" className="animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="border-none bg-transparent shadow-none">
                <CardContent className="p-0">
                  <ForgotPasswordTab setActiveTab={setActiveTab} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
