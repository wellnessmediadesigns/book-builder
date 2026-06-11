-- Switch the default fallback to Cerebras for setups that never configured a
-- custom fallback (no fallback key set). Intentional fallbacks are left alone.
UPDATE "Settings"
SET "fallbackProvider" = 'cerebras', "fallbackModel" = 'llama-3.3-70b'
WHERE "fallbackProvider" = 'groq' AND "fallbackApiKey" = '';
