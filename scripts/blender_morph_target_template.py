"""
Blender Script: Quick Morph Target Creation Template
=====================================================

This script helps you quickly create all required morph targets in Blender.

How to use:
1. Open Blender
2. Import your avatar model
3. Select the head mesh
4. Open Scripting workspace
5. Paste this script
6. Modify the viseme shapes as needed
7. Run the script (Alt+P)

Note: This is a template - you'll need to manually sculpt each viseme shape.
This script just creates the shape keys with correct names.
"""

import bpy

# Get the active object (your head mesh)
obj = bpy.context.active_object

if obj is None or obj.type != 'MESH':
    print("Error: Please select the head mesh object")
else:
    # Ensure we're in Object Mode
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Create basis shape key if it doesn't exist
    if not obj.data.shape_keys:
        obj.shape_key_add(name="Basis")
        print("Created Basis shape key")
    
    # Required visemes
    visemes = [
        'viseme_PP',      # Closed mouth (P, B, M)
        'viseme_kk',     # K, G sounds
        'viseme_I',      # I, Y sounds
        'viseme_AA',     # A, O sounds
        'viseme_O',      # O, W sounds
        'viseme_U',      # U, OO sounds
        'viseme_FF',     # F, V sounds
        'viseme_TH',     # TH sounds
        'viseme_sil',    # Silence
        'viseme_DD',     # D, T, N sounds
        'viseme_CH',     # CH, SH, J sounds
        'viseme_SS',     # S, Z sounds
        'viseme_nn',     # N sounds
        'viseme_RR',     # R sounds
        'viseme_aa',     # A sounds
        'viseme_E',      # E sounds
    ]
    
    # Required facial expressions
    facial_expressions = [
        'eyeBlinkLeft',
        'eyeBlinkRight',
        'mouthSmile',
        'browInnerUp',
        'jawOpen',
        'mouthOpen',
        'mouthClose',
        'browDownLeft',
        'browDownRight',
        'eyeSquintLeft',
        'eyeSquintRight',
    ]
    
    # Create all viseme shape keys
    print("\nCreating viseme shape keys...")
    for viseme in visemes:
        if viseme not in obj.data.shape_keys.key_blocks:
            obj.shape_key_add(name=viseme)
            print(f"  Created: {viseme}")
        else:
            print(f"  Already exists: {viseme}")
    
    # Create facial expression shape keys
    print("\nCreating facial expression shape keys...")
    for expr in facial_expressions:
        if expr not in obj.data.shape_keys.key_blocks:
            obj.shape_key_add(name=expr)
            print(f"  Created: {expr}")
        else:
            print(f"  Already exists: {expr}")
    
    print("\n✅ Shape keys created!")
    print("\nNext steps:")
    print("1. Select each shape key in the Shape Keys panel")
    print("2. Switch to Edit Mode")
    print("3. Sculpt the mesh to match the viseme/expression")
    print("4. Switch back to Object Mode")
    print("5. Set value to 0.0 (will be animated in code)")
    print("\nTip: Use Proportional Editing (O) for smooth transitions")

