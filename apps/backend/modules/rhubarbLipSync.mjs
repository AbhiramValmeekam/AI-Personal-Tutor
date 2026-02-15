import { execCommand } from "../utils/files.mjs";
import fs from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = resolve(__dirname, "..");

const getPhonemes = async ({ message, language = "english", audioFile = null }) => {
  try {
    const time = new Date().getTime();
    console.log(`[Rhubarb] Starting lip sync conversion for message ${message} (language: ${language})`);
    
    // Determine input audio file (MP3 or WAV) - use absolute paths
    let mp3File, wavFile, jsonFile;
    
    if (audioFile) {
      // If audioFile is provided (for temp files from streaming TTS)
      console.log(`[Rhubarb] Using provided audio file: ${audioFile}`);
      // Resolve to absolute path
      mp3File = resolve(audioFile);
      wavFile = resolve(audioFile.replace(/\.mp3$/, '.wav'));
      jsonFile = resolve(audioFile.replace(/\.(mp3|wav)$/, '.json'));
    } else {
      // Standard message files - resolve relative to backend directory
      mp3File = resolve(backendDir, `audios/message_${message}.mp3`);
      wavFile = resolve(backendDir, `audios/message_${message}.wav`);
      jsonFile = resolve(backendDir, `audios/message_${message}.json`);
    }
    
    // Check which audio file exists
    let inputAudioFile = null;
    if (fs.existsSync(wavFile)) {
      inputAudioFile = wavFile;
      console.log(`[Rhubarb] Using existing WAV file: ${wavFile}`);
    } else if (fs.existsSync(mp3File)) {
      inputAudioFile = mp3File;
      console.log(`[Rhubarb] Using MP3 file, will convert to WAV: ${mp3File}`);
    } else {
      console.warn(`[Rhubarb] No audio file found for message ${message} (checked ${mp3File} and ${wavFile})`);
      // Create placeholder lip sync data
      const placeholderData = {
        mouthCues: [
          { start: 0.0, end: 0.5, value: "A" },
          { start: 0.5, end: 1.0, value: "B" },
          { start: 1.0, end: 1.5, value: "C" }
        ]
      };
      fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      return;
    }
    
    // Check if ffmpeg is available
    try {
      await execCommand({ command: "ffmpeg -version" });
    } catch (ffmpegError) {
      console.warn("FFmpeg not found, skipping lip sync");
      // Create a simple placeholder JSON file with correct format
      const placeholderData = {
        mouthCues: [
          { start: 0.0, end: 0.5, value: "A" },
          { start: 0.5, end: 1.0, value: "B" },
          { start: 1.0, end: 1.5, value: "C" }
        ]
      };
      fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      return;
    }
    
    // Convert MP3 to WAV if needed (Rhubarb requires WAV format)
    // Use standard sample rate (16000 Hz) for compatibility
    // Ensure mono channel for optimal lip sync detection
    let finalWavFile = wavFile;
    
    if (inputAudioFile.endsWith('.mp3')) {
      try {
        console.log(`[Rhubarb] Converting MP3 to WAV: ${inputAudioFile} -> ${wavFile}`);
        // Convert MP3 to WAV with standard settings
        const mp3Path = resolve(inputAudioFile);
        const wavPath = resolve(wavFile);
        await execCommand({
          command: `ffmpeg -y -i "${mp3Path}" -ar 16000 -ac 1 "${wavPath}"`
        });
        console.log(`[Rhubarb] ✅ MP3 to WAV conversion done in ${new Date().getTime() - time}ms`);
        
        // Verify WAV file was created
        if (!fs.existsSync(wavFile)) {
          throw new Error(`WAV file was not created: ${wavFile}`);
        }
        
        // Use the converted WAV file
        finalWavFile = wavFile;
      } catch (conversionError) {
        console.error(`[Rhubarb] ❌ FFmpeg conversion failed:`, conversionError.message);
        // Create placeholder if conversion fails
        const placeholderData = {
          mouthCues: [
            { start: 0.0, end: 0.5, value: "A" },
            { start: 0.5, end: 1.0, value: "B" },
            { start: 1.0, end: 1.5, value: "C" }
          ]
        };
        fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
        return;
      }
    } else if (inputAudioFile.endsWith('.wav')) {
      finalWavFile = inputAudioFile;
    }
    
    // Ensure WAV file exists and is readable
    
    if (!fs.existsSync(finalWavFile)) {
      console.error(`[Rhubarb] ❌ WAV file does not exist: ${finalWavFile}`);
      const placeholderData = {
        mouthCues: [
          { start: 0.0, end: 0.5, value: "A" },
          { start: 0.5, end: 1.0, value: "B" },
          { start: 1.0, end: 1.5, value: "C" }
        ]
      };
      fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      return;
    }
    
    const wavStats = fs.statSync(finalWavFile);
    if (wavStats.size === 0) {
      console.error(`[Rhubarb] ❌ WAV file is empty: ${finalWavFile}`);
      const placeholderData = {
        mouthCues: [
          { start: 0.0, end: 0.5, value: "A" },
          { start: 0.5, end: 1.0, value: "B" },
          { start: 1.0, end: 1.5, value: "C" }
        ]
      };
      fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      return;
    }
    
    console.log(`[Rhubarb] ✅ WAV file ready: ${finalWavFile} (${wavStats.size} bytes)`);
    
    // Check if rhubarb is available (Windows uses .exe, Unix uses no extension)
    // Use absolute path to ensure it's found
    const rhubarbPath = process.platform === "win32" 
      ? join(backendDir, "bin", "rhubarb.exe")
      : join(backendDir, "bin", "rhubarb");
    
    console.log(`[Rhubarb] Checking Rhubarb at: ${rhubarbPath}`);
    console.log(`[Rhubarb] Rhubarb exists: ${fs.existsSync(rhubarbPath)}`);
    
    try {
      await execCommand({ command: `"${rhubarbPath}" --help` });
      console.log(`[Rhubarb] ✅ Rhubarb is available`);
    } catch (rhubarbError) {
      console.warn("Rhubarb not found, creating placeholder lip sync data");
      // Create a simple placeholder JSON file with correct format
      const audioStats = fs.statSync(wavFile);
      const audioDuration = audioStats.size / 44100; // Rough estimation
      
      // Create more varied and realistic mouth cues
      const vowels = ["A", "B", "C", "D", "E", "F"];
      const mouthCues = [];
      let currentTime = 0;
      const segmentDuration = Math.min(0.2, audioDuration / 10);
      
      while (currentTime < audioDuration && mouthCues.length < 20) {
        const vowel = vowels[Math.floor(Math.random() * vowels.length)];
        mouthCues.push({
          start: currentTime,
          end: Math.min(currentTime + segmentDuration, audioDuration),
          value: vowel
        });
        currentTime += segmentDuration;
      }
      
      const placeholderData = {
        mouthCues: mouthCues
      };
      fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      return;
    }
    
    // Generate lip sync data using Rhubarb
    // Based on reference implementation: https://github.com/asanchezyali/talking-avatar-with-ai
    // Rhubarb works with audio waveforms, so it's language-agnostic
    // Works for English, Hindi, Telugu, and any other language
    // Try presets mode first (more accurate), fallback to phonetic if it fails
    let rhubarbSuccess = false;
    let rhubarbError = null;
    
    // Try presets mode first
    try {
      const wavPath = resolve(finalWavFile);
      const jsonPath = resolve(jsonFile);
      const rhubarbCommandPresets = `"${rhubarbPath}" -f json -o "${jsonPath}" "${wavPath}" -r presets`;
      console.log(`[Rhubarb] Running command: ${rhubarbCommandPresets}`);
      
      await execCommand({
        command: rhubarbCommandPresets,
      });
      rhubarbSuccess = true;
      console.log(`[Rhubarb] ✅ Lip sync done with presets mode for ${language} in ${new Date().getTime() - time}ms`);
    } catch (presetsError) {
      console.warn(`[Rhubarb] Presets mode failed, trying phonetic mode:`, presetsError.message);
      rhubarbError = presetsError;
      
      // Fallback to phonetic mode
      try {
        const wavPath = resolve(finalWavFile);
        const jsonPath = resolve(jsonFile);
        const rhubarbCommandPhonetic = `"${rhubarbPath}" -f json -o "${jsonPath}" "${wavPath}" -r phonetic`;
        console.log(`[Rhubarb] Running phonetic command: ${rhubarbCommandPhonetic}`);
        
        await execCommand({
          command: rhubarbCommandPhonetic,
        });
        rhubarbSuccess = true;
        console.log(`[Rhubarb] ✅ Lip sync done with phonetic mode for ${language} in ${new Date().getTime() - time}ms`);
      } catch (phoneticError) {
        console.error(`[Rhubarb] ❌ Both presets and phonetic modes failed:`, phoneticError.message);
        throw phoneticError;
      }
    }
    
    // Verify the JSON file was created and has valid content
    if (!fs.existsSync(jsonFile)) {
      throw new Error(`Rhubarb did not create output file: ${jsonFile}`);
    }
    
    const fileStats = fs.statSync(jsonFile);
    if (fileStats.size === 0) {
      throw new Error(`Rhubarb created empty output file: ${jsonFile}`);
    }
    
    try {
      const lipSyncData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      if (lipSyncData.mouthCues && Array.isArray(lipSyncData.mouthCues) && lipSyncData.mouthCues.length > 0) {
        console.log(`✓ Generated ${lipSyncData.mouthCues.length} mouth cues for ${language}`);
        // Log first and last cue times for debugging
        const firstCue = lipSyncData.mouthCues[0];
        const lastCue = lipSyncData.mouthCues[lipSyncData.mouthCues.length - 1];
        console.log(`  First cue: ${firstCue.start}s - ${firstCue.end}s (${firstCue.value})`);
        console.log(`  Last cue: ${lastCue.start}s - ${lastCue.end}s (${lastCue.value})`);
      } else {
        console.warn(`⚠ Lip sync JSON created but has no mouthCues, creating placeholder`);
        // Create placeholder if no cues found
        const placeholderData = {
          mouthCues: [
            { start: 0.0, end: 0.5, value: "A" },
            { start: 0.5, end: 1.0, value: "B" },
            { start: 1.0, end: 1.5, value: "C" }
          ]
        };
        fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      }
    } catch (parseError) {
      console.error(`Error parsing lip sync JSON:`, parseError.message);
      throw parseError;
    }
  } catch (error) {
    console.error(`Error while getting phonemes for message ${message} (${language}):`, error);
    console.error(`Error stack:`, error.stack);
    // Create a simple placeholder JSON file as fallback with correct format
    try {
      const jsonFile = resolve(backendDir, `audios/message_${message}.json`);
      const placeholderData = {
        mouthCues: [
          { start: 0.0, end: 0.5, value: "A" },
          { start: 0.5, end: 1.0, value: "B" },
          { start: 1.0, end: 1.5, value: "C" }
        ]
      };
      fs.writeFileSync(jsonFile, JSON.stringify(placeholderData));
      console.log(`Created placeholder lip sync data for message ${message}`);
    } catch (writeError) {
      console.error(`Error creating placeholder lip sync data:`, writeError);
    }
    // Don't rethrow - we've created placeholder data as fallback
  }
};

export { getPhonemes };