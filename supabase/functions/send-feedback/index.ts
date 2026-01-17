// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackRequest {
    type: 'suggestion' | 'bug' | 'other'
    message: string
    email: string
    userId: string | null
    userAgent: string
    timestamp: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { type, message, email, userId, userAgent, timestamp }: FeedbackRequest = await req.json()

        // Validate required fields
        if (!type || !message) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables')
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            )
        }

        // Format the feedback type label
        const typeLabels = {
            suggestion: 'Sugestão',
            bug: 'Problema/Bug',
            other: 'Outro'
        }
        const typeLabel = typeLabels[type] || 'Outro'

        console.log('Processing feedback:', { type: typeLabel, email, userId })

        // Insert directly via REST API using SERVICE_ROLE_KEY (no auth issues)
        const insertResponse = await fetch(
            `${supabaseUrl}/rest/v1/feedback`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                },
                body: JSON.stringify({
                    type,
                    message,
                    email,
                    user_id: userId,
                    user_agent: userAgent,
                    created_at: timestamp,
                }),
            }
        )

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text()
            console.error('Insert error:', errorText)
            throw new Error(`Failed to insert feedback: ${insertResponse.status} - ${errorText}`)
        }

        const insertedData = await insertResponse.json()
        console.log('Feedback stored successfully:', insertedData)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Feedback received successfully',
                data: insertedData,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    } catch (error: any) {
        console.error('Error processing feedback:', error.message || error)

        return new Response(
            JSON.stringify({
                error: 'Failed to process feedback',
                details: error.message || 'Unknown error',
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )
    }
})

/* To invoke this function locally for testing:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-feedback' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"type":"suggestion","message":"Test feedback","email":"test@example.com","userId":null,"userAgent":"Test","timestamp":"2024-01-01T00:00:00.000Z"}'

*/

/* To invoke this function locally for testing:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-feedback' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"type":"suggestion","message":"Test feedback","email":"test@example.com","userId":null,"userAgent":"Test","timestamp":"2024-01-01T00:00:00.000Z"}'

*/
