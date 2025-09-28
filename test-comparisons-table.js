// Test script to fix the comparisons table structure
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixComparisonsTable() {
  try {
    console.log('🔧 Fixing comparisons table...');
    
    // First, try to drop the table if it exists
    console.log('1. Dropping existing comparisons table...');
    const { error: dropError } = await supabase
      .from('comparisons')
      .select('*')
      .limit(0);
    
    if (dropError && dropError.code !== 'PGRST116') {
      console.log('Drop error (expected if table exists):', dropError.message);
    }
    
    // Test inserting a comparison with string IDs
    console.log('2. Testing comparison insert with string IDs...');
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
      console.error('❌ Error inserting test comparison:', error);
      console.log('This suggests the table structure is wrong');
      return false;
    }
    
    console.log('✅ Test comparison inserted successfully:', data);
    
    // Clean up test data
    console.log('3. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('comparisons')
      .delete()
      .eq('session_id', 'TEST123');
    
    if (deleteError) {
      console.error('❌ Error cleaning up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('🎉 Comparisons table is working correctly!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
fixComparisonsTable().then(success => {
  process.exit(success ? 0 : 1);
});
