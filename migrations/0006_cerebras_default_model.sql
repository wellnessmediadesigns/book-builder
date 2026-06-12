-- gpt-oss-120b is the most reliable Cerebras free-tier model; switch the
-- auto-assigned default (llama-3.3-70b) over to it. Deliberate model choices
-- (anything else) are preserved.
UPDATE "Settings"
SET "fallbackModel" = 'gpt-oss-120b'
WHERE "fallbackProvider" = 'cerebras' AND "fallbackModel" = 'llama-3.3-70b';
