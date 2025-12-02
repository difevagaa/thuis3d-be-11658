import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { i18nToast } from "@/lib/i18nToast";
import { z } from "zod";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  // Validation schema with translated errors
  const authSchema = z.object({
    email: z.string().email(t('invalidEmail')),
    password: z.string()
      .min(8, t('passwordMinLength'))
      .regex(/[A-Z]/, t('passwordUppercase'))
      .regex(/[0-9]/, t('passwordNumber'))
      .regex(/[^A-Za-z0-9]/, t('passwordSpecial')),
    fullName: z.string().min(2, t('nameMinLength')).optional(),
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
    setLoading(true);

    try {
      const validated = authSchema.parse(formData);
      
      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      
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
      const validated = authSchema.pick({ email: true, password: true }).parse(formData);
      
      // Create timeout promise (15 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 15000);
      });

      // Race between sign in and timeout
      const signInPromise = supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      const { error } = await Promise.race([
        signInPromise,
        timeoutPromise
      ]) as any;

      if (error) throw error;
      
      toast.success(t('welcomeBack'));
      navigate("/");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error.message === 'Connection timeout') {
        toast.error(t('connectionTimeout', { defaultValue: 'Tiempo de espera agotado. Por favor, verifica tu conexión e intenta de nuevo.' }));
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

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

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
        i18nToast.error("error.passwordMinLength");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

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
    <div className="min-h-screen flex items-center justify-center bg-muted/50 py-12 px-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isSettingNewPassword 
              ? t('setNewPassword')
              : showResetPassword 
                ? t('resetPassword')
                : t('signIn')}
          </CardTitle>
          <CardDescription className="text-center">
            {isSettingNewPassword 
              ? t('newPassword')
              : showResetPassword 
                ? t('enterEmail')
                : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('loading', { ns: 'common' }) : t('sendResetLink')}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => setShowResetPassword(false)}
              >
                {t('backToSignIn')}
              </Button>
            </form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={() => setShowResetPassword(true)}
                  >
                    {t('forgotPassword')}
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('loading', { ns: 'common' }) : t('signInButton')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('fullName')}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t('fullNamePlaceholder')}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('passwordPlaceholder')}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
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
