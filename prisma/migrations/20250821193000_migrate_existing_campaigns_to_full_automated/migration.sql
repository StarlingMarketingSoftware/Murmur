-- Update existing campaigns with old default blocks to use full_automated
UPDATE "Campaign" 
SET 
    "hybridBlockPrompts" = '[{"id": "full_automated", "type": "full_automated", "value": ""}]'::jsonb,
    "hybridAvailableBlocks" = ARRAY['full_automated', 'introduction', 'research', 'action', 'text']::"HybridBlock"[]
WHERE 
    "hybridBlockPrompts"::text = '[{"id":"introduction","type":"introduction","value":""},{"id":"research","type":"research","value":""},{"id":"action","type":"action","value":""}]'
    OR "hybridBlockPrompts"::text = '[{"id": "introduction", "type": "introduction", "value": ""}, {"id": "research", "type": "research", "value": ""}, {"id": "action", "type": "action", "value": ""}]';
