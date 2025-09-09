# Supabase Storage Migration Guide

This guide explains how to migrate your 3D game models from local files to Supabase storage while maintaining backward compatibility.

## 🚀 Quick Start

### 1. Set up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from the project settings
3. Copy `env.example` to `.env.local` and fill in your credentials:

```bash
cp env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Upload Models to Supabase

Run the upload script to upload all your GLB models:

```bash
npm run upload-models
```

This will:
- Create a `game-models` bucket in your Supabase storage
- Upload all `.glb` files from `public/models/` to Supabase
- Set proper permissions for public access

### 3. Test the Migration

Start the development server:

```bash
npm run dev
```

The game will now:
- ✅ Try to load models from Supabase first
- ✅ Fallback to local files if Supabase fails
- ✅ Show primitive shapes if both fail
- ✅ Never break the game experience

## 🔧 How It Works

### Model Loading Strategy

The migration uses a **progressive enhancement** approach:

1. **Primary**: Load from Supabase storage
2. **Fallback**: Load from local files
3. **Safety**: Show primitive 3D shapes

### Key Components

#### `src/lib/supabase.ts`
- Supabase client configuration
- Helper functions for generating storage URLs

#### `src/game/config/models.ts`
- Enhanced model configuration with both Supabase and local paths
- Automatic URL generation for Supabase storage

#### `src/game/utils/modelPreloader.ts`
- Smart preloader that tries Supabase first, then local
- Caching system to avoid re-downloading
- Error handling and fallback logic

#### `scripts/upload-models.ts`
- Automated script to upload all models to Supabase
- Creates storage bucket with proper permissions
- Handles file validation and error reporting

## 📁 File Structure

```
src/
├── lib/
│   └── supabase.ts              # Supabase configuration
├── game/
│   ├── config/
│   │   └── models.ts            # Enhanced model config
│   ├── utils/
│   │   └── modelPreloader.ts    # Smart preloader
│   └── components/              # Updated components
└── scripts/
    └── upload-models.ts         # Upload script
```

## 🎯 Benefits

- **Zero Downtime**: Game continues working with local files
- **Progressive Enhancement**: Gradually moves to Supabase
- **Error Resilience**: Multiple fallback layers
- **Performance**: Models cached after first load
- **Easy Rollback**: Can switch back to local files instantly

## 🔄 Migration Process

### Phase 1: Setup (Current)
- ✅ Install Supabase client
- ✅ Create configuration files
- ✅ Update model loading system
- ✅ Add fallback mechanisms

### Phase 2: Upload Models
```bash
npm run upload-models
```

### Phase 3: Test & Verify
- Test with Supabase models
- Verify fallback works
- Check performance

### Phase 4: Optional Cleanup
- Remove local model files (optional)
- Update CDN settings
- Monitor performance

## 🛠️ Troubleshooting

### Models Not Loading from Supabase

1. Check your `.env.local` file has correct credentials
2. Verify the `game-models` bucket exists in Supabase
3. Check browser console for error messages
4. Ensure models are publicly accessible

### Upload Script Fails

1. Verify Supabase credentials are correct
2. Check file permissions in `public/models/`
3. Ensure GLB files are valid
4. Check Supabase storage quotas

### Game Breaks After Migration

The system is designed to never break:
- If Supabase fails → falls back to local files
- If local files fail → shows primitive shapes
- Game continues to function

## 🔧 Advanced Configuration

### Custom Storage Bucket

To use a different bucket name, update `src/lib/supabase.ts`:

```typescript
export const MODELS_BUCKET = 'your-custom-bucket-name';
```

### Custom Model Paths

Update `src/game/config/models.ts` to add new models:

```typescript
newModel: createModelConfig(
  "your-model.glb",           // Supabase path
  "/models/your-model.glb",   // Local path
  { scale: 1.0, position: [0, 0, 0], rotation: [0, 0, 0] }
)
```

### Environment-Specific URLs

You can use different Supabase projects for different environments:

```env
# .env.local (development)
VITE_SUPABASE_URL=https://dev-project.supabase.co

# .env.production (production)
VITE_SUPABASE_URL=https://prod-project.supabase.co
```

## 📊 Monitoring

Check the browser console for loading status:

- `✅ Model loaded from Supabase: player` - Success from Supabase
- `✅ Fallback to local: player` - Using local fallback
- `❌ Both Supabase and local failed: player` - Using primitive shapes

## 🎉 Success!

Once migration is complete, you'll have:

- Models served from Supabase storage
- Automatic fallback to local files
- Improved loading performance
- Better scalability
- Zero downtime migration

The game will work exactly as before, but with the added benefits of cloud storage!
