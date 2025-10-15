# Supabase Model Loading Setup

## Environment Variables Required

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project
4. Go to Settings > API
5. Copy the Project URL and anon/public key

## Model Storage Setup

1. In your Supabase dashboard, go to Storage
2. Create a bucket called `models` (if it doesn't exist)
3. Upload your GLB model files to the `models` bucket
4. Make sure the files are publicly accessible

## Model Files to Upload

Upload these files to your Supabase `models` bucket:
- `Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb`
- `Doly_3D__texture.glb`
- `Soldier.glb`
- `Generate_a_3D_environment_tree_texture.glb`
- `grond_plane_texture.glb`
- `Create_A_simple_flat_ground_texture.glb`

## How the System Works

The model loading system now has three tiers:

1. **Supabase First**: Tries to load models from your Supabase storage
2. **Local Fallback**: If Supabase fails, tries local `/public/models/` files
3. **Primitive Fallback**: If both fail, uses primitive 3D shapes

This ensures your game always works, even if models fail to load!

## Testing

Once you've set up the environment variables and uploaded models to Supabase:

1. Restart your development server
2. Check the browser console for model loading messages
3. You should see "Successfully loaded [model] model from Supabase" messages
