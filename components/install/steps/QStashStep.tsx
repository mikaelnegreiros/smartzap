'use client';

import { useState, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { StepCard } from '../StepCard';
import { ServiceIcon } from '../ServiceIcon';
import { TokenInput } from '../TokenInput';
import { ValidatingOverlay } from '../ValidatingOverlay';
import { SuccessCheckmark } from '../SuccessCheckmark';

interface QStashStepProps {
  onComplete: (data: {
    token: string;
    url?: string;
    qstashCurrentSigningKey?: string;
    qstashNextSigningKey?: string;
  }) => void;
}

/**
 * Step 4: Coleta do QStash Token.
 *
 * O token é validado fazendo uma request à API do QStash.
 * Formato: JWT (3 partes separadas por .) ou prefixo qstash_
 */
export function QStashStep({ onComplete }: QStashStepProps) {
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('https://qstash.upstash.io');
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States para keys (opcionais, mas capturadas no paste)
  const [currentSigningKey, setCurrentSigningKey] = useState('');
  const [nextSigningKey, setNextSigningKey] = useState('');

  const handleBulkPaste = useCallback((text: string) => {
    // Regex para capturar chaves típicas de .env
    const urlMatch = text.match(/QSTASH_URL=["']?([^"'\n]+)["']?/);
    const tokenMatch = text.match(/QSTASH_TOKEN=["']?([^"'\n]+)["']?/);
    const currentKeyMatch = text.match(/QSTASH_CURRENT_SIGNING_KEY=["']?([^"'\n]+)["']?/);
    const nextKeyMatch = text.match(/QSTASH_NEXT_SIGNING_KEY=["']?([^"'\n]+)["']?/);

    let parsed = false;

    if (urlMatch) {
      setUrl(urlMatch[1]);
      parsed = true;
    }

    if (tokenMatch) {
      setToken(tokenMatch[1]);
      parsed = true;
    }

    if (currentKeyMatch) setCurrentSigningKey(currentKeyMatch[1]);
    if (nextKeyMatch) setNextSigningKey(nextKeyMatch[1]);

    if (parsed) {
      // Pequeno feedback visual ou limpar erro
      setError(null);
      // Opcional: Auto-submit se tiver token
      if (tokenMatch && tokenMatch[1].length >= 30) {
        // Deixa o usuário conferir ou auto-submit?
        // Vamos deixar o user dar enter para confirmar
      }
    }
  }, []);

  // Valida formato do QStash token
  // Pode ser: base64 JSON (eyJ...), JWT (3 partes com .), ou prefixo qstash_
  const isValidToken = (t: string): boolean => {
    const trimmed = t.trim();
    return (
      trimmed.startsWith('eyJ') ||  // Base64 JSON (formato atual do QStash)
      trimmed.split('.').length === 3 ||  // JWT format
      trimmed.startsWith('qstash_')  // Prefixo alternativo
    );
  };

  const handleValidate = useCallback(async () => {
    if (!isValidToken(token)) {
      setError('Token QStash inválido');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      // Valida token via API
      const res = await fetch('/api/installer/qstash/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          url: url.trim() || 'https://qstash.upstash.io'
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Token QStash inválido');
      }

      setSuccess(true);
    } catch (err) {
      // Se API não existir ainda, valida só o formato
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setSuccess(true);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao validar');
      }
    } finally {
      setValidating(false);
    }
  }, [token]);

  const handleSuccessComplete = () => {
    onComplete({
      token: token.trim(),
      url: url.trim(),
      qstashCurrentSigningKey: currentSigningKey.trim(),
      qstashNextSigningKey: nextSigningKey.trim(),
    });
  };

  // Show success state
  if (success) {
    return (
      <StepCard glowColor="orange">
        <SuccessCheckmark
          message="QStash configurado!"
          onComplete={handleSuccessComplete}
        />
      </StepCard>
    );
  }

  return (
    <StepCard glowColor="orange" className="relative">
      <ValidatingOverlay
        isVisible={validating}
        message="Verificando QStash..."
        subMessage="Validando token"
      />

      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <ServiceIcon service="qstash" size="lg" />

        {/* Title */}
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">
          Configure filas de mensagens
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Token do Upstash QStash
        </p>

        {/* Instruções */}
        <div className="w-full mt-4 p-3 rounded-lg bg-zinc-800/50 text-left space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Como obter:</p>
          <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
            <li>Crie uma conta gratuita no <a href="https://console.upstash.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Upstash</a></li>
            <li>Clique em <strong className="text-zinc-300">QStash</strong> no menu lateral</li>
            <li>Copie o <strong className="text-zinc-300">QSTASH_TOKEN</strong> na aba Details</li>
          </ol>
        </div>

        {/* URL Input */}
        <div className="w-full mt-6">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
            QStash URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="https://qstash.upstash.io"
            className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-sm font-mono"
            disabled={validating || success}
          />
        </div>

        {/* Token Input */}
        <div className="w-full mt-4">
          <TokenInput
            label="QStash Token"
            value={token}
            onChange={(v) => {
              setToken(v);
              setError(null);
            }}
            placeholder="eyJVc2VySUQi... ou qstash_..."
            minLength={30}
            autoSubmitLength={80} // Reduzir para capturar tokens menores mas ainda seguros
            onAutoSubmit={handleValidate}
            accentColor="orange"
            showCharCount={false}
            validating={validating}
            success={success}
            error={error || undefined}
            onCustomPaste={handleBulkPaste}
          />
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {/* Help link */}
        <a
          href="https://console.upstash.com/qstash"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-400 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Onde encontrar no console Upstash?
        </a>
      </div>
    </StepCard>
  );
}
