"""
Blender Script: Rename Morph Targets
=====================================

If your model has morph targets with different names (e.g., from Ready Player Me),
this script helps rename them to match your system's requirements.

How to use:
1. Open Blender
2. Import your model
3. Select the head mesh
4. Open Scripting workspace
5. Modify the name_mapping dictionary below to match your model
6. Run the script (Alt+P)
"""

import bpy

# Get the active object
obj = bpy.context.active_object

if obj is None or obj.type != 'MESH' or not obj.data.shape_keys:
    print("Error: Please select a mesh with shape keys")
else:
    # Mapping from your model's names to required names
    # Modify this based on your model's actual morph target names
    name_mapping = {
        # Example: If your model uses "ARKit_viseme_PP" instead of "viseme_PP"
        # 'ARKit_viseme_PP': 'viseme_PP',
        # 'ARKit_viseme_kk': 'viseme_kk',
        # etc.
        
        # Ready Player Me often uses these names:
        # 'mouthClosed': 'viseme_PP',
        # 'jawOpen': 'jawOpen',  # This one might already match
        # etc.
    }
    
    if not name_mapping:
        print("No name mapping defined.")
        print("\nCurrent shape keys in your model:")
        for key in obj.data.shape_keys.key_blocks:
            print(f"  - {key.name}")
        print("\nPlease modify the name_mapping dictionary in this script")
        print("to match your model's morph target names.")
    else:
        print("Renaming morph targets...")
        for old_name, new_name in name_mapping.items():
            if old_name in obj.data.shape_keys.key_blocks:
                # Rename the shape key
                obj.data.shape_keys.key_blocks[old_name].name = new_name
                print(f"  Renamed: {old_name} → {new_name}")
            else:
                print(f"  Warning: {old_name} not found")
        
        print("\n✅ Renaming complete!")
        print("\nNote: If some morph targets are missing, you'll need to create them manually.")

