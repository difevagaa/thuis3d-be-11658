import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, FileText, Receipt } from "lucide-react";
import UserSearchSelector from "@/components/admin/UserSearchSelector";
import { RichTextEditor } from "@/components/RichTextEditor";
import { logger } from "@/lib/logger";

export default function CreateQuote() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  const [quoteData, setQuoteData] = useState({
    user_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Bélgica",
    quote_type: "Archivo 3D",
    description: "",
    estimated_price: "",
    quantity: 1,
    status_id: "",
    material_id: "",
    color_id: "",
    tax_enabled: true,
    additional_notes: ""
  });
  const [quantityInput, setQuantityInput] = useState("1");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusesRes, materialsRes, colorsRes] = await Promise.all([
        supabase.from("quote_statuses").select("*").order("name"),
        supabase.from("materials").select("*").is("deleted_at", null).order("name"),
        supabase.from("colors").select("*").is("deleted_at", null).order("name")
      ]);

      if (statusesRes.error) throw statusesRes.error;
      if (materialsRes.error) throw materialsRes.error;
      if (colorsRes.error) throw colorsRes.error;

      setStatuses(statusesRes.data || []);
      setMaterials(materialsRes.data || []);
      setColors(colorsRes.data || []);
      
      // Set default status to "Pendiente"
      const pendingStatus = statusesRes.data?.find(s => s.name === "Pendiente");
      if (pendingStatus) {
        setQuoteData(prev => ({ ...prev, status_id: pendingStatus.id }));
      }
    } catch (error: any) {
      logger.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      if (error || !data) {
        toast.error("Error al cargar datos del usuario");
        return;
      }
      
      setSelectedUser(data);
      setQuoteData(prev => ({
        ...prev,
        user_id: userId,
        customer_name: data.full_name || "",
        customer_email: data.email || "",
        customer_phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        postal_code: data.postal_code || "",
        country: data.country || "Bélgica"
      }));
    } catch (error: any) {
      logger.error("Error loading user data:", error);
      toast.error("Error al cargar datos del usuario");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.name.endsWith('.stl') || 
                         file.type.startsWith('image/');
      if (!isValidType) {
        toast.error(`${file.name}: Solo se permiten archivos STL o imágenes`);
      }
      return isValidType;
    });
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (value: string) => {
    setQuantityInput(value);
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setQuoteData(prev => ({ ...prev, quantity: parsed }));
    }
  };

  const handleQuantityBlur = () => {
    const parsed = parseInt(quantityInput, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setQuoteData(prev => ({ ...prev, quantity: 1 }));
      setQuantityInput("1");
      return;
    }
    setQuoteData(prev => ({ ...prev, quantity: parsed }));
    setQuantityInput(String(parsed));
  };

  const uploadFilesToStorage = async (quoteId: string): Promise<string[]> => {
    const uploadedPaths: string[] = [];
    
    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
      const filePath = `${quoteId}/${fileName}`;

      const { error } = await supabase.storage
        .from('quote-files')
        .upload(filePath, file);

      if (error) {
        logger.error('Error uploading file:', error);
        throw error;
      }

      uploadedPaths.push(filePath);
    }

    return uploadedPaths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!isNewClient && !quoteData.user_id) {
      toast.error("Selecciona un usuario o marca como nuevo cliente");
      return;
    }

    if (isNewClient) {
      if (!quoteData.customer_name || !quoteData.customer_email) {
        toast.error("Nombre y email son obligatorios para nuevos clientes");
        return;
      }
    }

    if (!quoteData.description) {
      toast.error("La descripción del proyecto es obligatoria");
      return;
    }

    if (!quoteData.estimated_price || parseFloat(quoteData.estimated_price) <= 0) {
      toast.error("El precio estimado debe ser mayor a 0");
      return;
    }

    if (!quoteData.status_id) {
      toast.error("Selecciona un estado");
      return;
    }

    setLoading(true);

    try {
      // Create quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          user_id: isNewClient ? null : quoteData.user_id,
          customer_name: quoteData.customer_name,
          customer_email: quoteData.customer_email,
          customer_phone: quoteData.customer_phone || null,
          address: quoteData.address || null,
          city: quoteData.city || null,
          postal_code: quoteData.postal_code || null,
          country: quoteData.country,
          quote_type: quoteData.quote_type,
          description: quoteData.description,
          estimated_price: parseFloat(quoteData.estimated_price),
          quantity: quoteData.quantity,
          status_id: quoteData.status_id,
          material_id: quoteData.material_id || null,
          color_id: quoteData.color_id || null,
          tax_enabled: quoteData.tax_enabled,
          additional_notes: quoteData.additional_notes || null
        } as any)
        .select()
        .single();

      if (quoteError) throw quoteError;

      logger.log('Quote created:', newQuote);

      // Upload files if any
      if (uploadedFiles.length > 0) {
        const filePaths = await uploadFilesToStorage(newQuote.id);
        
        // Update quote with file paths
        const { error: updateError } = await supabase
          .from("quotes")
          .update({ 
            service_attachments: filePaths,
            file_storage_path: filePaths[0] // Set first file as main file
          } as any)
          .eq("id", newQuote.id);

        if (updateError) {
          logger.error('Error updating quote with files:', updateError);
        }
      }

      // Send notification to client
      const statusName = statuses.find(s => s.id === quoteData.status_id)?.name || "Pendiente";
      
      try {
        await supabase.functions.invoke('send-quote-email', {
          body: {
            quote_id: newQuote.id,
            customer_name: quoteData.customer_name,
            customer_email: quoteData.customer_email,
            status_name: statusName
          }
        });
        
        logger.log('Notification email sent to customer');
      } catch (emailError) {
        logger.error('Error sending notification email:', emailError);
        // Don't fail the whole operation if email fails
      }

      // Create notification in database if user exists
      if (quoteData.user_id) {
        try {
          await supabase
            .from("notifications")
            .insert({
              user_id: quoteData.user_id,
              title: "Nueva Cotización Creada",
              message: `Se ha creado una nueva cotización para ti. Estado: ${statusName}`,
              type: "quote",
              link: `/usuario/cotizaciones/${newQuote.id}`
            });
        } catch (notifError) {
          logger.error('Error creating notification:', notifError);
        }
      }

      toast.success("Cotización creada exitosamente");
      navigate(`/admin/cotizaciones/${newQuote.id}`);
    } catch (error: any) {
      logger.error("Error creating quote:", error);
      toast.error(`Error al crear cotización: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cotizaciones")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Crear Cotización Manual</h1>
          <p className="text-muted-foreground">
            Crea una cotización personalizada para un cliente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>
              Selecciona un cliente existente o ingresa datos de un nuevo cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                id="new-client"
                checked={isNewClient}
                onCheckedChange={setIsNewClient}
              />
              <Label htmlFor="new-client">Cliente nuevo (sin cuenta)</Label>
            </div>

            {!isNewClient ? (
              <UserSearchSelector
                value={quoteData.user_id}
                onValueChange={loadUserData}
                label="Seleccionar Cliente"
                placeholder="Buscar cliente registrado..."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nombre Completo *</Label>
                  <Input
                    id="customer_name"
                    value={quoteData.customer_name}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Juan Pérez"
                    required={isNewClient}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={quoteData.customer_email}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, customer_email: e.target.value }))}
                    placeholder="juan@ejemplo.com"
                    required={isNewClient}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Teléfono</Label>
                  <Input
                    id="customer_phone"
                    value={quoteData.customer_phone}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="+32 123 456 789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={quoteData.address}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Calle Principal 123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={quoteData.city}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Bruselas"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">Código Postal</Label>
                  <Input
                    id="postal_code"
                    value={quoteData.postal_code}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={quoteData.country}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Bélgica"
                  />
                </div>
              </div>
            )}

            {selectedUser && !isNewClient && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                {selectedUser.phone && (
                  <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalles del Proyecto
            </CardTitle>
            <CardDescription>
              Describe el proyecto y adjunta archivos necesarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote_type">Tipo de Cotización</Label>
              <Select
                value={quoteData.quote_type}
                onValueChange={(value) => setQuoteData(prev => ({ ...prev, quote_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Archivo 3D">Archivo 3D</SelectItem>
                  <SelectItem value="Servicio">Servicio</SelectItem>
                  <SelectItem value="Diseño">Diseño</SelectItem>
                  <SelectItem value="Reparación">Reparación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción del Proyecto *</Label>
              <RichTextEditor
                value={quoteData.description}
                onChange={(value) => setQuoteData(prev => ({ ...prev, description: value }))}
                placeholder="Describe detalladamente el proyecto, requisitos especiales, etc..."
                className="min-h-[200px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="files">Archivos Adjuntos (STL o Imágenes)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="files"
                  type="file"
                  multiple
                  accept=".stl,image/*"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button type="button" size="icon" variant="outline">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Notas Adicionales</Label>
              <RichTextEditor
                value={quoteData.additional_notes}
                onChange={(value) => setQuoteData(prev => ({ ...prev, additional_notes: value }))}
                placeholder="Notas internas, instrucciones especiales..."
                className="min-h-[150px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material_id">Material</Label>
                <Select
                  value={quoteData.material_id}
                  onValueChange={(value) => setQuoteData(prev => ({ ...prev, material_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color_id">Color</Label>
                <Select
                  value={quoteData.color_id}
                  onValueChange={(value) => setQuoteData(prev => ({ ...prev, color_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colors.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.hex_code }}
                          />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantityInput}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  onBlur={handleQuantityBlur}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Precio y Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_price">Precio Estimado (€) *</Label>
                <Input
                  id="estimated_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quoteData.estimated_price}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, estimated_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_id">Estado *</Label>
                <Select
                  value={quoteData.status_id}
                  onValueChange={(value) => setQuoteData(prev => ({ ...prev, status_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <Label htmlFor="tax_enabled" className="text-base font-semibold">
                  Aplicar IVA
                </Label>
                <p className="text-sm text-muted-foreground">
                  Define si se cobrará IVA al generar la factura
                </p>
              </div>
              <Switch
                id="tax_enabled"
                checked={quoteData.tax_enabled}
                onCheckedChange={(checked) => setQuoteData(prev => ({ ...prev, tax_enabled: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/cotizaciones")}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear Cotización"}
          </Button>
        </div>
      </form>
    </div>
  );
}
