import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Globe } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language || 'en');
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
    
    // Validar términos y condiciones - verificar explícitamente
    if (!acceptTerms || acceptTerms === false) {
      toast.error(t('mustAcceptTerms'));
      return;
    }
    
    setLoading(true);

    try {
      const validated = authSchema.parse(formData);
      
      // Sanitizar nombre antes de guardar - más robusto
      const sanitizedFullName = formData.fullName
        .trim()
        .replace(/[<>'"\\\/]/g, '') // Remover caracteres peligrosos
        .substring(0, 100); // Limitar longitud
      
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: sanitizedFullName,
            subscribed_newsletter: subscribeNewsletter,
            preferred_language: preferredLanguage,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // Update the profile with preferred language
      if (signUpData.user) {
        await supabase.from('profiles').update({ 
          preferred_language: preferredLanguage 
        }).eq('id', signUpData.user.id);
      }
      
      // Si el usuario quiere suscribirse al newsletter, añadirlo a la tabla
      if (subscribeNewsletter && signUpData.user) {
        // Validar email antes de insertar
        const emailSchema = z.string().email();
        const validatedEmail = emailSchema.parse(validated.email);
        
        await supabase.from("email_subscribers").insert({
          email: validatedEmail,
          name: sanitizedFullName || null,
          user_id: signUpData.user.id,
          status: "subscribed",
          subscribed_at: new Date().toISOString()
        });
      }
      
      toast.success(t('accountCreated'));
      navigate("/");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error((error as { message: string }).message || t('errorCreatingAccount'));
      } else {
        toast.error(t('errorCreatingAccount'));
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
      
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;
      
      toast.success(t('welcomeBack'));
      navigate("/");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error((error as { message: string }).message || t('errorSigningIn'));
      } else {
        toast.error(t('errorSigningIn'));
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

      // Validar formato de email
      const emailSchema = z.string().email(t('invalidEmail'));
      const validatedEmail = emailSchema.parse(resetEmail);

      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast.success(t('resetEmailSent'));
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error((error as { message: string }).message || t('errorSendingResetEmail'));
      } else {
        toast.error(t('errorSendingResetEmail'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar contraseña con el mismo esquema que signup (8 caracteres mínimo)
      const passwordSchema = z.string()
        .min(8, t('passwordMinLength'))
        .regex(/[A-Z]/, t('passwordUppercase'))
        .regex(/[0-9]/, t('passwordNumber'))
        .regex(/[^A-Za-z0-9]/, t('passwordSpecial'));
      
      const validated = passwordSchema.parse(newPassword);

      const { error } = await supabase.auth.updateUser({
        password: validated
      });

      if (error) throw error;

      toast.success(t('passwordUpdated'));
      setIsSettingNewPassword(false);
      setNewPassword("");
      navigate("/");
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error && typeof error === 'object' && 'message' in error) {
        toast.error((error as { message: string }).message || t('errorUpdatingPassword'));
      } else {
        toast.error(t('errorUpdatingPassword'));
      }
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
                   
                   {/* Language preference selector */}
                   <div className="space-y-2">
                     <Label htmlFor="preferred-language" className="flex items-center gap-2">
                       <Globe className="h-4 w-4" />
                       {t('preferredLanguage')}
                     </Label>
                     <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                       <SelectTrigger id="preferred-language">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="en">🇬🇧 English</SelectItem>
                         <SelectItem value="es">🇪🇸 Español</SelectItem>
                         <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                       </SelectContent>
                     </Select>
                     <p className="text-xs text-muted-foreground">{t('languageHint')}</p>
                   </div>

                   {/* Checkbox para suscripción al newsletter */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="subscribe-newsletter"
                      checked={subscribeNewsletter}
                      onCheckedChange={(checked) => setSubscribeNewsletter(checked === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <Label 
                      htmlFor="subscribe-newsletter" 
                      className="text-sm font-normal cursor-pointer leading-relaxed flex-1"
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
                      className="mt-0.5 shrink-0"
                    />
                    <Label 
                      htmlFor="accept-terms" 
                      className="text-sm font-normal cursor-pointer leading-relaxed flex-1"
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
                  
                  <Button type="submit" className="w-full" disabled={loading || !acceptTerms}>
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
