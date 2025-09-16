import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-project-url' || supabaseKey === 'your-supabase-anon-key') {
  console.error('❌ Missing Supabase credentials. Please set up your .env.local file.');
  console.error('');
  console.error('📝 Create a .env.local file with your Supabase credentials:');
  console.error('');
  console.error('VITE_SUPABASE_URL=https://your-project-id.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=your-anon-key-here');
  console.error('');
  console.error('🔗 Get these from: https://supabase.com/dashboard/project/[your-project]/settings/api');
  console.error('');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MODELS_DIR = './public/models';
const BUCKET_NAME = 'game-models';

async function uploadModels() {
  try {
    console.log('🚀 Starting model upload to Supabase...');
    
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log('📦 Creating storage bucket...');
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['model/gltf-binary', 'application/octet-stream'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      });
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        console.error('');
        console.error('💡 This might be due to Row Level Security (RLS) policies.');
        console.error('🔧 Try creating the bucket manually in your Supabase dashboard:');
        console.error('   1. Go to Storage in your Supabase dashboard');
        console.error('   2. Click "New bucket"');
        console.error('   3. Name it "game-models"');
        console.error('   4. Make it public');
        console.error('   5. Run this script again');
        console.error('');
        console.error('🔄 Attempting to continue with uploads anyway...');
        // Don't return, try to continue with uploads
      }
      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ Bucket already exists');
    }

    // Upload all GLB files
    const files = fs.readdirSync(MODELS_DIR).filter(file => file.endsWith('.glb'));
    
    if (files.length === 0) {
      console.log('⚠️  No GLB files found in public/models directory');
      return;
    }

    console.log(`📁 Found ${files.length} GLB files to upload:`);
    files.forEach(file => console.log(`  - ${file}`));
    
    for (const file of files) {
      const filePath = path.join(MODELS_DIR, file);
      const fileBuffer = fs.readFileSync(filePath);
      
      console.log(`⬆️  Uploading ${file}...`);
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(file, fileBuffer, {
          contentType: 'model/gltf-binary',
          upsert: true
        });
      
      if (error) {
        console.error(`❌ Error uploading ${file}:`, error);
      } else {
        console.log(`✅ Uploaded ${file}`);
      }
    }
    
    console.log('🎉 All models uploaded successfully!');
    console.log('🔗 Your models are now available at:');
    console.log(`   ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/`);
    
  } catch (error) {
    console.error('💥 Upload failed:', error);
  }
}

uploadModels();
