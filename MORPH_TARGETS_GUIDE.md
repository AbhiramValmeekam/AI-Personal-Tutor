# Morph Targets Creation Guide

## What Are Morph Targets?

Morph targets (also called blend shapes) are pre-sculpted variations of your 3D model's mesh. They allow you to smoothly transition between different shapes (like different mouth positions for lip sync).

## Required Morph Targets for Your Avatar

### Visemes (Lip Sync - CRITICAL)
These are the mouth shapes needed for lip sync:

1. **viseme_PP** - Closed mouth (P, B, M sounds)
   - Shape: Lips pressed together, mouth closed
   
2. **viseme_kk** - K, G sounds
   - Shape: Back of tongue raised, mouth slightly open
   
3. **viseme_I** - I, Y sounds
   - Shape: Mouth slightly open, corners pulled back
   
4. **viseme_AA** - A, O sounds
   - Shape: Mouth open wide, jaw dropped
   
5. **viseme_O** - O, W sounds
   - Shape: Mouth rounded, lips forward
   
6. **viseme_U** - U, OO sounds
   - Shape: Mouth very rounded, lips very forward
   
7. **viseme_FF** - F, V sounds
   - Shape: Lower lip touching upper teeth, mouth slightly open
   
8. **viseme_TH** - TH sounds
   - Shape: Tongue between teeth, mouth slightly open
   
9. **viseme_sil** - Silence/Rest
   - Shape: Neutral, relaxed mouth position
   
10. **viseme_DD** - D, T, N sounds
    - Shape: Tongue touching roof of mouth
   
11. **viseme_CH** - CH, SH, J sounds
    - Shape: Lips forward, mouth slightly open
   
12. **viseme_SS** - S, Z sounds
    - Shape: Teeth together, slight smile
   
13. **viseme_nn** - N sounds
    - Shape: Tongue touching roof, mouth closed
   
14. **viseme_RR** - R sounds
    - Shape: Tongue curled back
   
15. **viseme_aa** - A sounds
    - Shape: Mouth open, jaw down
   
16. **viseme_E** - E sounds
    - Shape: Mouth open, corners pulled back

### Facial Expression Morph Targets

#### Eyes (Required)
- **eyeBlinkLeft** - Left eye closed
- **eyeBlinkRight** - Right eye closed
- **eyeSquintLeft** - Left eye squinted
- **eyeSquintRight** - Right eye squinted
- **eyeWideLeft** - Left eye wide open
- **eyeWideRight** - Right eye wide open
- **eyeLookDownLeft/Right** - Eyes looking down
- **eyeLookUpLeft/Right** - Eyes looking up
- **eyeLookInLeft/Right** - Eyes looking inward
- **eyeLookOutLeft/Right** - Eyes looking outward

#### Mouth (Required)
- **mouthOpen** - Mouth open
- **mouthClose** - Mouth closed
- **mouthSmile** - Full smile
- **mouthSmileLeft/Right** - Half smile
- **mouthFrownLeft/Right** - Frown
- **mouthPucker** - Kissing/puckered lips
- **mouthFunnel** - Funnel shape
- **mouthStretchLeft/Right** - Stretched mouth
- **mouthDimpleLeft/Right** - Dimples
- **mouthPressLeft/Right** - Pressed lips
- **mouthUpperUpLeft/Right** - Upper lip raised
- **mouthLowerDownLeft/Right** - Lower lip down
- **mouthRollLower/Upper** - Rolled lips
- **tongueOut** - Tongue sticking out

#### Brows (Required)
- **browInnerUp** - Inner brows raised
- **browOuterUpLeft/Right** - Outer brows raised
- **browDownLeft/Right** - Brows lowered

#### Jaw (Required)
- **jawOpen** - Jaw open
- **jawForward** - Jaw forward
- **jawLeft** - Jaw left
- **jawRight** - Jaw right

#### Other (Optional but Recommended)
- **cheekPuff** - Puffed cheeks
- **cheekSquintLeft/Right** - Squinted cheeks
- **noseSneerLeft/Right** - Nose sneer
- **mouthShrugLower/Upper** - Mouth shrug

## How to Create Morph Targets in Blender

### Step 1: Prepare Your Base Model
1. Import your avatar model into Blender
2. Select the head mesh
3. Ensure it's in Object Mode

### Step 2: Create Base Shape Key
1. Select the head mesh
2. Go to **Object Data Properties** (green triangle icon)
3. Click **Shape Keys** tab
4. Click **+** button to add a shape key
5. Name it **"Basis"** (this is your base shape)
6. Set value to **1.0**

### Step 3: Create Each Viseme
For each viseme (viseme_PP, viseme_kk, etc.):

1. Click **+** button to add new shape key
2. Name it exactly: **"viseme_PP"** (use exact name from list)
3. Click on the shape key to edit it
4. Switch to **Edit Mode** (Tab key)
5. Sculpt the mouth to match the viseme shape:
   - Use **Grab** tool (G) to move vertices
   - Use **Proportional Editing** (O) for smooth transitions
   - Use **Sculpt Mode** for detailed work
6. Switch back to **Object Mode**
7. Set value to **0.0** (we'll animate it in code)

### Step 4: Create Facial Expression Morph Targets
Repeat Step 3 for each facial expression:
- eyeBlinkLeft, eyeBlinkRight
- mouthSmile, browInnerUp
- etc.

### Step 5: Test Morph Targets
1. In Shape Keys panel, adjust the value slider (0.0 to 1.0)
2. Watch the mesh deform
3. Refine the shape if needed

### Step 6: Export
1. File → Export → glTF 2.0
2. Select **glTF Binary (.glb)**
3. Check **"Include Shape Keys"** or **"Include Morph Targets"**
4. Export to your models folder

## Quick Reference: Viseme Shapes

### viseme_PP (Closed Mouth)
- Lips pressed together
- No opening
- Slight tension in lips

### viseme_kk (K, G)
- Back of tongue raised
- Mouth slightly open
- Jaw slightly dropped

### viseme_I (I, Y)
- Mouth corners pulled back
- Slight opening
- Tongue raised in middle

### viseme_AA (A, O)
- Mouth open wide
- Jaw dropped
- Tongue flat

### viseme_O (O, W)
- Lips rounded forward
- Mouth opening circular
- Jaw slightly forward

### viseme_U (U, OO)
- Lips very rounded
- Very forward
- Small opening

### viseme_FF (F, V)
- Lower lip touches upper teeth
- Mouth slightly open
- Upper lip slightly raised

### viseme_TH (TH)
- Tongue between teeth
- Mouth slightly open
- Lips relaxed

## Using Ready Player Me Models

Ready Player Me avatars already include ARKit blend shapes, which are compatible with your system. The morph target names might be slightly different, so you may need to:

1. Export your Ready Player Me avatar
2. Import into Blender
3. Check existing shape key names
4. Rename them to match your system's requirements
5. Add any missing morph targets
6. Re-export

## Using Character Creator 4

Character Creator 4 has built-in ARKit blend shape support:

1. Create your character
2. Go to **Facial** tab
3. Enable **ARKit Blend Shapes**
4. The software will automatically create all required morph targets
5. Export as GLB with morph targets included

## Testing Your Morph Targets

### In Blender
1. Use Shape Keys panel to test each morph target
2. Animate between 0.0 and 1.0 to see transitions
3. Ensure smooth transitions between shapes

### In Your Application
1. Place model in `apps/frontend/public/models/avatar.glb`
2. Start your frontend server
3. Open browser console
4. Look for morph target warnings
5. Test lip sync functionality

## Common Issues & Solutions

### Problem: Morph targets not working
**Solution**: 
- Check if shape keys are exported (enable "Include Shape Keys" in export)
- Verify morph target names match exactly (case-sensitive)
- Ensure morph targets are on the correct mesh (head mesh)

### Problem: Smooth transitions not working
**Solution**:
- Ensure base mesh has good topology
- Use proportional editing when sculpting
- Avoid extreme deformations
- Keep vertex count reasonable

### Problem: Morph targets too extreme
**Solution**:
- Reduce the deformation amount
- Use subtle changes
- Test with value 0.5 first, then adjust

### Problem: Missing morph targets
**Solution**:
- Check which ones are missing in browser console
- Create them in Blender
- Re-export model

## Quick Checklist

- [ ] Base model imported
- [ ] Basis shape key created
- [ ] All 16 visemes created with correct names
- [ ] Eye blink morph targets created
- [ ] Facial expression morph targets created
- [ ] All morph targets tested in Blender
- [ ] Model exported as GLB with shape keys included
- [ ] Model tested in application
- [ ] Lip sync working correctly

## Tools & Resources

1. **Blender** - Free, best for creating morph targets
2. **Character Creator 4** - Paid, automatic ARKit support
3. **Ready Player Me** - Free, includes morph targets
4. **ARKit Reference** - Apple's ARKit blend shape documentation

## Need Help?

If you're stuck:
1. Check browser console for specific morph target errors
2. Verify morph target names match exactly
3. Test each morph target individually in Blender
4. Ensure proper export settings

