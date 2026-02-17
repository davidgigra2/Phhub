-- Create a new active vote for testing Operator Flow (Corrected)
WITH new_vote AS (
  INSERT INTO public.votes (title, description, status)
  VALUES (
    'Test Operator Flow Fresh', 
    'Votación para verificar el flujo de operador con usuarios limpios.', 
    'OPEN' -- Using 'OPEN' directly as status check constraint allows 'OPEN'
  )
  RETURNING id
)
INSERT INTO public.vote_options (vote_id, label, order_index)
SELECT id, 'Aprobar', 1 FROM new_vote
UNION ALL
SELECT id, 'Rechazar', 2 FROM new_vote;
