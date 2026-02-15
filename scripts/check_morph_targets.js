/**
 * Morph Targets Checker Script
 * 
 * This script helps you verify if your GLB model has all required morph targets.
 * Run this in Node.js after installing gltf-transform:
 * npm install -g @gltf-transform/cli
 * 
 * Or use the online version at: https://gltf.report/
 */

// This is a reference script - you can use it to check your model
// For actual checking, use gltf-transform CLI or online tools

const requiredVisemes = [
  'viseme_PP',
  'viseme_kk',
  'viseme_I',
  'viseme_AA',
  'viseme_O',
  'viseme_U',
  'viseme_FF',
  'viseme_TH',
  'viseme_sil',
  'viseme_DD',
  'viseme_CH',
  'viseme_SS',
  'viseme_nn',
  'viseme_RR',
  'viseme_aa',
  'viseme_E'
];

const requiredFacialExpressions = [
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'mouthSmile',
  'browInnerUp',
  'jawOpen',
  'mouthOpen'
];

console.log('Required Visemes:', requiredVisemes);
console.log('Required Facial Expressions:', requiredFacialExpressions);
console.log('\nTo check your model:');
console.log('1. Use gltf-transform: npx @gltf-transform/cli inspect your-model.glb');
console.log('2. Or use online tool: https://gltf.report/');
console.log('3. Or import into Blender and check Shape Keys panel');

