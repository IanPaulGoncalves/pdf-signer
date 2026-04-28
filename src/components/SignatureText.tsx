import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Type, Download, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/hooks/useTheme';

interface SignatureTextProps {
  onSignatureCreate: (dataUrl: string) => void;
  existingSignature?: string | null;
}

const SIGNATURE_FONTS = [
  { name: 'Cursive Elegante', value: 'Dancing Script' },
  { name: 'Manuscrito', value: 'Caveat' },
  { name: 'Clássica', value: 'Great Vibes' },
  { name: 'Sofisticada', value: 'Pacifico' },
  { name: 'Formal', value: 'Satisfy' },
];

const SIGNATURE_COLORS = [
  { name: 'Azul', value: '#1a365d' },
  { name: 'Preto', value: '#1a1a2e' },
  { name: 'Azul Escuro', value: '#2563eb' },
];

export const SignatureText: React.FC<SignatureTextProps> = ({
  onSignatureCreate,
  existingSignature,
}) => {
  const [text, setText] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].value);
  const [selectedColor, setSelectedColor] = useState(SIGNATURE_COLORS[0].value);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { effectiveTheme } = useTheme();

  // Load Google Fonts
  useEffect(() => {
    const fontLinks = SIGNATURE_FONTS.map(font =>
      `family=${font.value.replace(' ', '+')}`
    ).join('&');

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${fontLinks}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    link.onload = () => {
      // Give fonts time to render
      setTimeout(() => setFontsLoaded(true), 100);
    };

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Generate signature image
  const generateSignature = () => {
    if (!text.trim() || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 200;

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font
    ctx.font = `64px "${selectedFont}", cursive`;
    ctx.fillStyle = selectedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Get data URL
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureCreate(dataUrl);
  };

  const downloadSignature = useCallback(() => {
    if (!text.trim() || !fontsLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 150;

    // Fill with white background for download
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set font
    ctx.font = `64px "${selectedFont}", cursive`;
    ctx.fillStyle = selectedColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Download the image
    const link = document.createElement('a');
    link.download = `assinatura-${text.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [text, selectedFont, selectedColor, fontsLoaded]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Type className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Digite sua assinatura</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signature-text">Seu nome ou assinatura</Label>
          <Input
            id="signature-text"
            placeholder="Digite seu nome..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="text-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Estilo da fonte</Label>
            <Select value={selectedFont} onValueChange={setSelectedFont}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNATURE_FONTS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: `"${font.value}", cursive` }}>
                      {font.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <Select value={selectedColor} onValueChange={setSelectedColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNATURE_COLORS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Preview */}
      {text && (
        <div className={`border-2 border-dashed border-border rounded-lg p-6 ${effectiveTheme === 'dark' ? 'bg-white' : 'bg-card'
          }`}>
          <p className="text-xs text-muted-foreground mb-2 text-center">Prévia:</p>
          <div
            className="text-4xl text-center py-4"
            style={{
              fontFamily: `"${selectedFont}", cursive`,
              color: selectedColor,
            }}
          >
            {text}
          </div>
        </div>
      )}

      {/* Hidden canvas for generating image */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={generateSignature}
              disabled={!text.trim() || !fontsLoaded}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Usar assinatura
            </Button>
          </TooltipTrigger>
          <TooltipContent>Gerar e usar esta assinatura textual nos documentos</TooltipContent>
        </Tooltip>

        {text.trim() && fontsLoaded && (
          <Button
            variant="outline"
            onClick={downloadSignature}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar assinatura (.png)
          </Button>
        )}
      </div>

      {existingSignature && (
        <div className="p-3 bg-success/10 rounded-lg border border-success/30">
          <p className="text-sm text-success font-medium">✓ Assinatura salva</p>
        </div>
      )}
    </div>
  );
};
