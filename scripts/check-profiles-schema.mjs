import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntplczcmhvfkijjxavdl.supabase.co';
const supabaseKey = 'REDACTED_SERVICE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking profiles table schema...\n');

// Get a sample profile to see all columns
const { data: sample, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else if (sample && sample.length > 0) {
  console.log('Current profile columns:');
  console.log(Object.keys(sample[0]).join(', '));
  console.log('\n\nSample profile:');
  console.log(sample[0]);
}

console.log('\n\n===========================================');
console.log('NEEDED COLUMNS for free agent signup:');
console.log('===========================================');
const needed = {
  'existing': ['id', 'email', 'full_name', 'jersey_number', 'position'],
  'missing': ['skill_level', 'availability', 'phone', 'city', 'province']
};

console.log('\n✅ Should already exist:');
needed.existing.forEach(col => console.log(`   - ${col}`));

console.log('\n❓ Need to add:');
needed.missing.forEach(col => console.log(`   - ${col}`));

process.exit(0);
