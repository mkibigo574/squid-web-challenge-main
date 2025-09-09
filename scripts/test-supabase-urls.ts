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

// Test script to verify Supabase URLs are generated correctly
console.log('🧪 Testing Supabase URL generation...');
console.log('');

const testFiles = [
  'Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb',
  'Doly_3D__texture.glb',
  'Soldier.glb',
  'Player_Running_withSkin.glb',
  'Animation_falling_down_withSkin.glb',
  'grond_plane_texture.glb',
  'Create_A_simple_flat_ground_texture.glb'
];

testFiles.forEach(file => {
  const url = getSupabaseUrl(file);
  console.log(`📁 ${file}`);
  console.log(`🔗 ${url}`);
  console.log('');
});

console.log('✅ URL generation test complete!');
console.log('🌐 Open your browser to http://localhost:8080 to test the game');
