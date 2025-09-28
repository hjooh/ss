// For use in server-side code (API routes, Server Components)
import { createClient } from '@supabase/supabase-js'

// This client is a singleton and uses the powerful service_role key
export const supabase = createClient(
    process.env.SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);