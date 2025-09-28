// Script to fix the comparisons table structure
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTableStructure() {
  try {
    console.log('🔧 Fixing comparisons table structure...');
    
    // Drop the existing table
    console.log('1. Dropping existing comparisons table...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS comparisons CASCADE;'
    });
    
    if (dropError) {
      console.log('Drop error (might be expected):', dropError.message);
    }
    
    // Create the table with correct structure
    console.log('2. Creating comparisons table with correct structure...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE comparisons (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id TEXT NOT NULL,
          winning_apartment_id TEXT NOT NULL,
          losing_apartment_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (createError) {
      console.error('❌ Error creating table:', createError);
      return false;
    }
    
    console.log('✅ Table created successfully');
    
    // Test inserting data
    console.log('3. Testing data insertion...');
    const testData = {
      session_id: 'TEST123',
      winning_apartment_id: 'apt-1',
      losing_apartment_id: 'apt-2'
    };
    
    const { data, error } = await supabase
      .from('comparisons')
      .insert([testData])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error inserting test data:', error);
      return false;
    }
    
    console.log('✅ Test data inserted successfully:', data);
    
    // Clean up
    const { error: deleteError } = await supabase
      .from('comparisons')
      .delete()
      .eq('session_id', 'TEST123');
    
    if (deleteError) {
      console.log('Warning: Could not clean up test data:', deleteError.message);
    }
    
    console.log('🎉 Comparisons table is now working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    return false;
  }
}

fixTableStructure().then(success => {
  process.exit(success ? 0 : 1);
});

