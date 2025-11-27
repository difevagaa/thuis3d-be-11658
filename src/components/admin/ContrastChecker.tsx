import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { getContrastInfo, ContrastInfo } from '@/utils/contrastChecker';

interface ContrastCheckerProps {
  foreground: string;
  background: string;
  label?: string;
}

export function ContrastChecker({ foreground, background, label }: ContrastCheckerProps) {
  const [info, setInfo] = useState<ContrastInfo | null>(null);

  useEffect(() => {
    const contrastInfo = getContrastInfo(foreground, background);
    setInfo(contrastInfo);
  }, [foreground, background]);

  if (!info) {
    return (
      <div className="p-4 border rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">No se pudo calcular el contraste</p>
      </div>
    );
  }

  const ratioFormatted = info.ratio.toFixed(2);
  const isGood = info.passAA;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      {label && <p className="font-medium text-sm">{label}</p>}
      
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded border-2" 
          style={{ 
            backgroundColor: background.startsWith('#') ? background : `hsl(${background})`,
            color: foreground.startsWith('#') ? foreground : `hsl(${foreground})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold'
          }}
        >
          Aa
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {isGood ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
            <span className="font-semibold">Ratio: {ratioFormatted}:1</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {info.passAAA && (
              <Badge variant="default" className="bg-green-600">AAA</Badge>
            )}
            {info.passAA && (
              <Badge variant="default" className="bg-blue-600">AA</Badge>
            )}
            {!info.passAA && info.ratio >= 3 && (
              <Badge variant="secondary">Solo texto grande</Badge>
            )}
            {!info.passAA && info.ratio < 3 && (
              <Badge variant="destructive">Insuficiente</Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">{info.recommendation}</p>
        </div>
      </div>
    </div>
  );
}

export function InteractiveContrastChecker() {
  const [foreground, setForeground] = useState('#000000');
  const [background, setBackground] = useState('#FFFFFF');
  const [info, setInfo] = useState<ContrastInfo | null>(null);

  useEffect(() => {
    const contrastInfo = getContrastInfo(foreground, background);
    setInfo(contrastInfo);
  }, [foreground, background]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificador de Contraste WCAG</CardTitle>
        <CardDescription>
          Comprueba si tus combinaciones de colores cumplen con las pautas de accesibilidad WCAG 2.1
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Color del Texto (Foreground)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color del Fondo (Background)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        </div>

        {info && (
          <div className="space-y-4">
            <div 
              className="p-8 rounded-lg border-2 text-center"
              style={{ 
                backgroundColor: background,
                color: foreground
              }}
            >
              <h2 className="text-2xl font-bold mb-2">Título de Ejemplo</h2>
              <p className="text-base">Este es un texto de ejemplo para visualizar el contraste.</p>
              <p className="text-sm mt-2">Texto pequeño para verificar legibilidad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Ratio de Contraste</h3>
                <p className="text-3xl font-bold">{info.ratio.toFixed(2)}:1</p>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Cumplimiento WCAG</h3>
                <div className="space-y-1">
                  {info.passAAA ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">AAA - Excelente</span>
                    </div>
                  ) : info.passAA ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">AA - Bueno</span>
                    </div>
                  ) : info.ratio >= 3 ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Solo texto grande</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Insuficiente</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Guía de Requisitos WCAG</h3>
              <ul className="text-sm space-y-1">
                <li>✅ <strong>AAA Texto Normal:</strong> 7:1 o superior (excelente accesibilidad)</li>
                <li>✅ <strong>AA Texto Normal:</strong> 4.5:1 o superior (mínimo recomendado)</li>
                <li>✅ <strong>AA Texto Grande:</strong> 3:1 o superior (18pt+ o 14pt+ negrita)</li>
                <li>❌ <strong>Insuficiente:</strong> Menor a 3:1 (no accesible)</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
