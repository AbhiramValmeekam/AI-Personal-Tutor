# Avatar Creation Guide for Adam Project

## Required Features for Your Avatar

### 1. **Format**
- **File Format**: GLB (preferred) or GLTF
- **Location**: `apps/frontend/public/models/avatar.glb`

### 2. **Morph Targets (Blend Shapes) - CRITICAL**

Your avatar MUST have these viseme morph targets for lip sync:

#### Required Visemes (for lip sync):
- `viseme_PP` - Closed mouth (P, B, M sounds)
- `viseme_kk` - K, G sounds
- `viseme_I` - I, Y sounds
- `viseme_AA` - A, O sounds
- `viseme_O` - O, W sounds
- `viseme_U` - U, OO sounds
- `viseme_FF` - F, V sounds
- `viseme_TH` - TH sounds
- `viseme_sil` - Silence/rest position
- `viseme_DD` - D, T, N sounds
- `viseme_CH` - CH, SH, J sounds
- `viseme_SS` - S, Z sounds
- `viseme_nn` - N sounds
- `viseme_RR` - R sounds
- `viseme_aa` - A sounds
- `viseme_E` - E sounds

#### Required Facial Expression Morph Targets:
- `eyeBlinkLeft` - Left eye blink
- `eyeBlinkRight` - Right eye blink
- `mouthSmile` - Smile
- `browInnerUp` - Raised eyebrows
- `browDownLeft` / `browDownRight` - Frown
- `jawOpen` - Open jaw
- `mouthOpen` - Open mouth
- And many more (see `apps/frontend/src/constants/morphTargets.js`)

### 3. **Node Structure**

Your model should have these mesh nodes (or you'll need to update the code):
- `Wolf3D_Head` - Main head mesh (with morph targets)
- `EyeLeft` - Left eye mesh
- `EyeRight` - Right eye mesh
- `Wolf3D_Body` - Body mesh
- `Wolf3D_Outfit_Top` - Top clothing
- `Wolf3D_Outfit_Bottom` - Bottom clothing
- `Hips` - Root bone for animations

**Note**: If your model uses different names, you'll need to update `Avatar.jsx` lines 456-520.

### 4. **Animations**

Your avatar needs a skeleton/armature for animations:
- `Idle` - Idle animation (required)
- `TalkingOne` - Talking animation
- `TalkingTwo` - Alternative talking animation
- Other animations (happy, sad, etc.)

Animations should be in: `apps/frontend/public/models/animations.glb`

### 5. **Skeleton/Rigging**

- Must have a humanoid skeleton
- Compatible with standard animation formats
- Root bone should be at the hips

## Step-by-Step: Using Ready Player Me (Easiest Method)

### Step 1: Create Avatar
1. Go to https://readyplayer.me
2. Click "Create Avatar"
3. Choose "Full Body" option
4. Upload a selfie OR customize from scratch
5. Customize appearance, clothing, etc.

### Step 2: Export
1. Click "Download" button
2. Select "GLB" format
3. Choose "Full Body" option
4. Download the file

### Step 3: Prepare for Your System
1. Rename the downloaded file to `avatar.glb`
2. Place it in: `apps/frontend/public/models/avatar.glb`
3. Replace the existing file

### Step 4: Test Compatibility
1. Start your frontend server
2. Check browser console for errors
3. Test lip sync functionality
4. If morph targets don't match, you may need to:
   - Update `visemesMapping.js` to match your model's morph target names
   - Or rename morph targets in your 3D software

## Step-by-Step: Using Blender (Advanced)

### Step 1: Create/Import Base Model
1. Create or import a character model
2. Ensure it has proper topology for facial animation

### Step 2: Add ARKit Blend Shapes
1. Select the head mesh
2. Go to Shape Keys (Blender) or Blend Shapes (other software)
3. Create shape keys matching the required viseme names:
   - `viseme_PP`, `viseme_kk`, `viseme_I`, etc.
4. Sculpt each viseme shape to match the sound

### Step 3: Add Facial Expression Blend Shapes
1. Create additional shape keys:
   - `eyeBlinkLeft`, `eyeBlinkRight`
   - `mouthSmile`, `browInnerUp`, etc.

### Step 4: Rig the Model
1. Add an armature (skeleton)
2. Weight paint the mesh to bones
3. Ensure root bone is at hips

### Step 5: Export
1. File → Export → glTF 2.0
2. Select "glTF Binary (.glb)"
3. Check "Selected Objects" if needed
4. Export to `apps/frontend/public/models/avatar.glb`

## Converting VRM to GLB (for VRoid Studio)

### Option 1: Using Blender
1. Import VRM addon for Blender
2. Import your VRM file
3. Export as GLB

### Option 2: Online Converter
1. Use https://vrm.dev/en/convert/
2. Upload VRM file
3. Download as GLB

## Testing Your Avatar

### 1. Check Morph Targets
Open browser console and look for:
- Morph target warnings
- Missing viseme errors

### 2. Test Lip Sync
1. Send a message to the avatar
2. Watch if mouth moves correctly
3. Check console for viseme mapping errors

### 3. Test Animations
1. Verify "Idle" animation plays
2. Test "TalkingOne" animation
3. Check if animations loop correctly

### 4. Update Code if Needed

If your model uses different node names, update `Avatar.jsx`:

```javascript
// Find lines 456-520 and update node references
<skinnedMesh
  name="YourHeadName"  // Change from "Wolf3D_Head"
  geometry={nodes.YourHeadName.geometry}
  // ... etc
/>
```

If your morph targets have different names, update:
- `apps/frontend/src/constants/visemesMapping.js`
- `apps/frontend/src/constants/morphTargets.js`

## Troubleshooting

### Problem: Lip sync not working
**Solution**: Check if viseme morph targets exist and are named correctly

### Problem: Animations not playing
**Solution**: Ensure skeleton is compatible and animations are in separate GLB file

### Problem: Model not loading
**Solution**: Check file path, format (must be GLB), and file size

### Problem: Morph targets not found
**Solution**: Verify morph target names match exactly (case-sensitive)

## Recommended Tools

1. **Ready Player Me** - Easiest, free, web-based
2. **VRoid Studio** - Free, anime-style, desktop app
3. **Blender** - Free, professional, full control
4. **Character Creator 4** - Paid, professional, ARKit support
5. **Mixamo** - Free, for animations only

## Quick Start Checklist

- [ ] Avatar model in GLB format
- [ ] All required viseme morph targets present
- [ ] Facial expression morph targets (eye blinks, etc.)
- [ ] Skeleton/armature for animations
- [ ] Idle animation working
- [ ] File placed in `apps/frontend/public/models/avatar.glb`
- [ ] Tested in browser
- [ ] Lip sync working
- [ ] Animations playing correctly

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify morph target names match exactly
3. Ensure GLB file is valid (try opening in Blender)
4. Check file size (should be reasonable, not too large)
5. Verify node structure matches expected names

