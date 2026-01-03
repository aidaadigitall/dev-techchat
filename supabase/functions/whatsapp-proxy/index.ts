import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Fix: Declare Deno namespace to resolve TypeScript errors in non-Deno environments
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate User Session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // 2. Get User Company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.company_id) throw new Error('Company not found')

    // 3. Environment Configs (Evolution API)
    const EVO_URL = Deno.env.get('EVOLUTION_API_URL')
    const EVO_KEY = Deno.env.get('EVOLUTION_API_KEY')

    if (!EVO_URL || !EVO_KEY) {
      throw new Error('Server misconfiguration: Missing Evolution credentials')
    }

    const { action, payload } = await req.json()
    let result = {}

    // --- Action Handlers ---

    if (action === 'create_instance') {
        const instanceName = `tenant_${profile.company_id.split('-')[0]}_${Date.now().toString(36)}`
        
        // Call Evolution
        const response = await fetch(`${EVO_URL}/instance/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVO_KEY },
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            })
        })
        const data = await response.json()
        
        if (data.status === 403 || data.error) throw new Error(data.message || 'Failed to create instance')

        // Save to DB
        const { data: conn, error: dbError } = await supabaseClient
            .from('whatsapp_connections')
            .insert({
                company_id: profile.company_id,
                name: payload.name,
                instance_name: instanceName,
                status: 'created'
            })
            .select()
            .single()
        
        if (dbError) throw dbError
        result = conn
    }

    else if (action === 'connect') {
        const { instanceName, dbId } = payload
        
        // Call Evolution to Connect/Get QR
        const response = await fetch(`${EVO_URL}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': EVO_KEY }
        })
        const data = await response.json() // Usually returns base64 or object

        // Update DB with QR (so frontend can see it via Realtime)
        const qrCode = data.base64 || data.qrcode?.base64
        
        if (qrCode) {
            await supabaseClient
                .from('whatsapp_connections')
                .update({ qr_code: qrCode, status: 'qr_ready' })
                .eq('id', dbId)
                .eq('company_id', profile.company_id)
        }
        
        result = { success: true }
    }

    else if (action === 'delete') {
        const { instanceName, dbId } = payload
        
        // Delete from Evolution
        await fetch(`${EVO_URL}/instance/delete/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': EVO_KEY }
        })

        // Delete from DB
        await supabaseClient
            .from('whatsapp_connections')
            .delete()
            .eq('id', dbId)
            .eq('company_id', profile.company_id)

        result = { success: true }
    }

    else if (action === 'logout') {
        const { instanceName, dbId } = payload
        await fetch(`${EVO_URL}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': EVO_KEY }
        })
        
        await supabaseClient
            .from('whatsapp_connections')
            .update({ status: 'disconnected', qr_code: null })
            .eq('id', dbId)

        result = { success: true }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})