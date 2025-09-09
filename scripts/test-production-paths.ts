import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const MODELS_BUCKET = 'models';

// Helper function to get Supabase storage URL
const getSupabaseUrl = (path: string) => {
  const { data } = supabase.storage.from(MODELS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Simulate the getBestModelPath function
const getBestModelPath = (supabaseUrl: string, localPath: string, isProduction: boolean = false): string => {
  // In production, prefer Supabase URL as default
  // In development, prefer local path
  return isProduction ? supabaseUrl : localPath;
};

console.log('🧪 Testing production vs development path selection...');
console.log('');

const testCases = [
  {
    name: 'Player Model',
    supabasePath: getSupabaseUrl("Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb"),
    localPath: "/models/Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb"
  },
  {
    name: 'Doll Model',
    supabasePath: getSupabaseUrl("Doly_3D__texture.glb"),
    localPath: "/models/Doly_3D__texture.glb"
  }
];

testCases.forEach(test => {
  console.log(`📁 ${test.name}:`);
  console.log(`   Development: ${getBestModelPath(test.supabasePath, test.localPath, false)}`);
  console.log(`   Production:  ${getBestModelPath(test.supabasePath, test.localPath, true)}`);
  console.log('');
});

console.log('✅ Path selection test complete!');
console.log('🎯 In production, the game will use Supabase URLs instead of local paths');
