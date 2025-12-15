import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { withTimeout, TimeoutError } from "@/lib/asyncUtils";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  // Validation schema for signup with strict password requirements
  const signupSchema = z.object({
    email: z.string().email(t('invalidEmail')),
    password: z.string()
      .min(8, t('passwordMinLength'))
      .regex(/[A-Z]/, t('passwordUppercase'))
      .regex(/[0-9]/, t('passwordNumber'))
      .regex(/[^A-Za-z0-9]/, t('passwordSpecial')),
    fullName: z.string().min(2, t('nameMinLength')).optional(),
  });

  // Simpler validation for login - just email and non-empty password
  const loginSchema = z.object({
    email: z.string().email(t('invalidEmail')),
    password: z.string().min(1, t('passwordRequired', 'Password is required')),
  });

  useEffect(() => {
    // Check if user is coming from password reset email
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (searchParams.get('reset') === 'true' && session) {
        setIsSettingNewPassword(true);
      }
    };
    checkSession();
  }, [searchParams]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar términos y condiciones
    if (!acceptTerms) {
      toast.error(t('mustAcceptTerms'));
      return;
    }
    
    setLoading(true);

    try {
      const validated = signupSchema.parse(formData);

      const signUpRes = await withTimeout(
        supabase.auth.signUp({
          email: validated.email,
          password: validated.password,
          options: {
            data: {
              full_name: formData.fullName,
              subscribed_newsletter: subscribeNewsletter,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        }),
        15000,
        t('signUp', 'Crear cuenta')
      );

      const { data: signUpData, error } = signUpRes;

      if (error) throw error;
      // Si el usuario quiere suscribirse al newsletter, añadirlo a la tabla
      if (subscribeNewsletter && signUpData.user) {
        await supabase.from("email_subscribers").insert({
          email: validated.email,
          name: formData.fullName || null,
          user_id: signUpData.user.id,
          status: "subscribed",
          subscribed_at: new Date().toISOString()
        });
      }
      
      toast.success(t('accountCreated'));
      navigate("/");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || t('errorCreatingAccount'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = loginSchema.parse(formData);

      const signInRes = await withTimeout(
        supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        }),
        15000,
        t('signIn', 'Iniciar sesión')
      );

      const { error } = signInRes;

      if (error) throw error;
      toast.success(t('welcomeBack'));
      navigate("/");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || t('errorSigningIn'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!resetEmail) {
        toast.error(t('enterEmail'));
        return;
      }

      const resetRes = await withTimeout(
        supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        }),
        15000,
        t('resetPassword', 'Recuperar contraseña')
      );

      const { error } = resetRes;

      if (error) throw error;
      toast.success(t('resetEmailSent'));
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email de recuperación");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!newPassword || newPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        return;
      }

      const updateRes = await withTimeout(
        supabase.auth.updateUser({
          password: newPassword
        }),
        15000,
        t('setNewPassword', 'Actualizar contraseña')
      );

      const { error } = updateRes;

      if (error) throw error;
      toast.success(t('passwordUpdated'));
      setIsSettingNewPassword(false);
      setNewPassword("");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 py-6 sm:py-12 px-3 sm:px-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl text-center">
            {isSettingNewPassword 
              ? t('setNewPassword')
              : showResetPassword 
                ? t('resetPassword')
                : t('signIn')}
          </CardTitle>
          <CardDescription className="text-center text-sm">
            {isSettingNewPassword 
              ? t('newPassword')
              : showResetPassword 
                ? t('enterEmail')
                : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isSettingNewPassword ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t('passwordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-11 sm:h-10"
                />
              </div>
              <Button type="submit" className="w-full h-11 sm:h-10" disabled={loading}>
                {loading ? t('loading', { ns: 'common' }) : t('updatePassword')}
              </Button>
            </form>
          ) : showResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t('email')}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-11 sm:h-10"
                />
              </div>
              <Button type="submit" className="w-full h-11 sm:h-10" disabled={loading}>
                {loading ? t('loading', { ns: 'common' }) : t('sendResetLink')}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 sm:h-10" 
                onClick={() => setShowResetPassword(false)}
              >
                {t('backToSignIn')}
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-10 sm:h-9">
                <TabsTrigger value="signin" className="text-sm">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">{t('signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-sm">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm h-auto py-0"
                    onClick={() => setShowResetPassword(true)}
                  >
                    {t('forgotPassword')}
                  </Button>
                  <Button type="submit" className="w-full h-11 sm:h-10" disabled={loading}>
                    {loading ? t('loading', { ns: 'common' }) : t('signInButton')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm">{t('fullName')}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t('fullNamePlaceholder')}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-11 sm:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="h-11 sm:h-10"
                    />
                  </div>
                  
                  {/* Checkbox para suscripción al newsletter */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="subscribe-newsletter"
                      checked={subscribeNewsletter}
                      onCheckedChange={(checked) => setSubscribeNewsletter(checked === true)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <Label 
                      htmlFor="subscribe-newsletter" 
                      className="text-sm font-normal cursor-pointer leading-relaxed"
                    >
                      {t('subscribeNewsletter')}
                    </Label>
                  </div>
                  
                  {/* Checkbox para términos y condiciones */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                      required
                      className="mt-0.5 flex-shrink-0"
                    />
                    <Label 
                      htmlFor="accept-terms" 
                      className="text-sm font-normal cursor-pointer leading-relaxed"
                    >
                      {t('acceptTermsPrefix')}{' '}
                      <Link to="/legal/terms" className="text-primary underline hover:text-primary/80">
                        {t('termsAndConditions')}
                      </Link>
                      {' '}{t('acceptTermsAnd')}{' '}
                      <Link to="/legal/privacy" className="text-primary underline hover:text-primary/80">
                        {t('privacyPolicy')}
                      </Link>
                    </Label>
                  </div>
                  
                  <Button type="submit" className="w-full h-11 sm:h-10" disabled={loading || !acceptTerms}>
                    {loading ? t('loading', { ns: 'common' }) : t('signUpButton')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
