# 3D Models for Red Light, Green Light Game

This directory contains all the 3D models used in the game.

## Supported Formats
- **GLB** (recommended) - Binary glTF format, most efficient
- **GLTF** - Text-based glTF format
- **FBX** - Autodesk format (requires conversion)
- **OBJ** - Wavefront format (requires conversion)

## Model Requirements

### Player Character (`player.glb`)
- **Scale**: Should be roughly 2 units tall
- **Origin**: Centered at bottom (feet)
- **Facing**: Forward (positive Z direction)
- **Polygons**: Keep under 10,000 for web performance
- **Textures**: Use PBR materials if possible
- **Animations**: Idle, walk, run (optional)

### Doll Character (`doll.glb`)
- **Scale**: Should be roughly 4 units tall
- **Origin**: Centered at bottom (base)
- **Facing**: Forward (positive Z direction)
- **Polygons**: Keep under 15,000 for web performance
- **Textures**: Use PBR materials if possible
- **Animations**: Turn left/right for light changes

## File Naming Convention
- Use lowercase with underscores: `player_character.glb`
- Keep names descriptive but short
- Include version if needed: `player_v2.glb`

## Performance Guidelines
- **Total model size**: Keep under 5MB per model
- **Texture resolution**: 1024x1024 or 2048x2048 max
- **LOD levels**: Include multiple detail levels if possible
- **Compression**: Use Draco compression for geometry

## Adding New Models

1. Place your GLB file in this directory
2. Update the model path in `src/game/config/models.ts`
3. Test the model loads correctly
4. Adjust scale and position as needed

## Troubleshooting

### Model Not Loading
- Check file path is correct
- Ensure file is actually a valid GLB
- Check browser console for errors
- Verify file size isn't too large

### Model Too Big/Small
- Adjust scale in the model config
- Or modify the model in your 3D software
- Use the `scale` property in the config

### Model in Wrong Position
- Check the origin point in your 3D software
- Adjust position in the model config
- Ensure model faces the correct direction

## Recommended 3D Software
- **Blender** (free) - Export as GLB
- **Maya** - Export as FBX, convert to GLB
- **3ds Max** - Export as FBX, convert to GLB
- **Cinema 4D** - Export as FBX, convert to GLB

## Online Resources
- [Sketchfab](https://sketchfab.com) - Free and paid models
- [TurboSquid](https://turbosquid.com) - Professional models
- [CGTrader](https://cgtrader.com) - Various 3D models
- [Free3D](https://free3d.com) - Free models
