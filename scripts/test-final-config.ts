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

// Simulate the createModelConfig function
const createModelConfig = (supabasePath: string, localPath: string, config: any, isProduction: boolean = false) => {
  const supabaseUrl = getSupabaseUrl(supabasePath);
  
  return {
    ...config,
    supabasePath: supabaseUrl,
    localPath,
    // In production, always use Supabase URL. In development, use local path
    path: isProduction ? supabaseUrl : localPath,
    fallback: 'primitive'
  };
};

console.log('🧪 Testing final model configuration...');
console.log('');

const testCases = [
  {
    name: 'Player Model',
    supabasePath: "Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb",
    localPath: "/models/Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb"
  },
  {
    name: 'Doll Model',
    supabasePath: "Doly_3D__texture.glb",
    localPath: "/models/Doly_3D__texture.glb"
  },
  {
    name: 'Soldier Model',
    supabasePath: "Soldier.glb",
    localPath: "/models/Soldier.glb"
  }
];

testCases.forEach(test => {
  const devConfig = createModelConfig(test.supabasePath, test.localPath, {}, false);
  const prodConfig = createModelConfig(test.supabasePath, test.localPath, {}, true);
  
  console.log(`📁 ${test.name}:`);
  console.log(`   Development path: ${devConfig.path}`);
  console.log(`   Production path:  ${prodConfig.path}`);
  console.log('');
});

console.log('✅ Final configuration test complete!');
console.log('🎯 In production, all models will use Supabase URLs directly from config');
console.log('🔗 No more complex path resolution needed - config handles it automatically');
