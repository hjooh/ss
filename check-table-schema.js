// Script to check the current table schema and provide fix instructions
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
  try {
    console.log('🔍 Checking comparisons table schema...');
    
    // Try to get table information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'comparisons')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('❌ Error checking table schema:', error);
      console.log('\n📋 Manual Fix Instructions:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Run this SQL:');
      console.log(`
        DROP TABLE IF EXISTS comparisons CASCADE;
        
        CREATE TABLE comparisons (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id TEXT NOT NULL,
          winning_apartment_id TEXT NOT NULL,
          losing_apartment_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_comparisons_session_id ON comparisons(session_id);
        CREATE INDEX idx_comparisons_winning_apartment_id ON comparisons(winning_apartment_id);
        CREATE INDEX idx_comparisons_losing_apartment_id ON comparisons(losing_apartment_id);
        
        ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Anyone can view comparisons" 
          ON comparisons FOR SELECT 
          USING (true);
          
        CREATE POLICY "Anyone can insert comparisons" 
          ON comparisons FOR INSERT 
          WITH CHECK (true);
      `);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('📊 Current table schema:');
      data.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if apartment ID columns are UUID instead of TEXT
      const winningCol = data.find(col => col.column_name === 'winning_apartment_id');
      const losingCol = data.find(col => col.column_name === 'losing_apartment_id');
      
      if (winningCol && winningCol.data_type === 'uuid') {
        console.log('\n❌ Problem found: winning_apartment_id is UUID but should be TEXT');
        console.log('❌ Problem found: losing_apartment_id is UUID but should be TEXT');
        console.log('\n📋 Fix Instructions:');
        console.log('Run this SQL in your Supabase SQL Editor:');
        console.log(`
          ALTER TABLE comparisons 
          ALTER COLUMN winning_apartment_id TYPE TEXT,
          ALTER COLUMN losing_apartment_id TYPE TEXT;
        `);
        return false;
      }
      
      console.log('✅ Table schema looks correct');
    } else {
      console.log('❌ Table does not exist or no columns found');
      console.log('\n📋 Create the table with this SQL:');
      console.log(`
        CREATE TABLE comparisons (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          session_id TEXT NOT NULL,
          winning_apartment_id TEXT NOT NULL,
          losing_apartment_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    return false;
  }
}

checkTableSchema().then(success => {
  if (!success) {
    console.log('\n🔧 After fixing the table, restart your server and try again.');
  }
  process.exit(success ? 0 : 1);
});
