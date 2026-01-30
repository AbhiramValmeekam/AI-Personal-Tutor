import { convertTextToSpeech } from "./local-tts.mjs";
import { getPhonemes } from "./rhubarbLipSync.mjs";
import { readJsonTranscript, audioFileToBase64 } from "../utils/files.mjs";
import { generateTTSBase64 } from "./streaming-tts.mjs";
import fs from "fs";

const MAX_RETRIES = 10;
const RETRY_DELAY = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanTextForTTS = (text) => {
  if (!text) return "";
  let clean = text;

  // Remove markdown code fences and backticks
  clean = clean.replace(/```json/gi, '');
  clean = clean.replace(/```/g, '');
  clean = clean.replace(/`/g, '');

  // Remove escaped characters and backslashes
  clean = clean.replace(/\\"/g, '"');
  clean = clean.replace(/\\'/g, "'");
  clean = clean.replace(/\\n/g, ' ');
  clean = clean.replace(/\\t/g, ' ');
  clean = clean.replace(/\\r/g, ' ');
  clean = clean.replace(/\\/g, ''); // Remove ALL backslashes

  // Remove JSON structure characters globally
  clean = clean.replace(/\{|\}|\[|\]/g, ' ');

  // Remove JSON field names and quotes
  clean = clean.replace(/"messages"\s*:\s*/gi, '');
  clean = clean.replace(/"text"\s*:\s*/gi, '');
  clean = clean.replace(/"facialExpression"\s*:\s*"[^"]*"/gi, '');
  clean = clean.replace(/"animation"\s*:\s*"[^"]*"/gi, '');
  clean = clean.replace(/"/g, ''); // Remove all double quotes

  // Clean up multiple spaces and trim
  return clean.replace(/\s+/g, ' ').trim();
};

const lipSync = async (response, language = "english") => {
  // Extract messages from response, preserving other properties
  const { messages, ...otherProps } = response;

  console.log(`[LipSync] Starting lip sync for ${messages.length} messages in ${language}`);

  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;
      const wavFileName = `audios/message_${index}.wav`;

      console.log(`[LipSync] Processing message ${index} in ${language}`);

      const cleanText = cleanTextForTTS(message.text);
      console.log(`[LipSync] Cleaned text for TTS: "${cleanText}"`);

      const lang = language.toLowerCase();

      try {
        // For Telugu/Hindi, use streaming TTS
        if (lang === "telugu" || lang === "te" || lang === "hindi" || lang === "hi") {
          console.log(`[LipSync] USING STREAMING TTS FOR ${language.toUpperCase()}`);
          const base64Audio = await generateTTSBase64(cleanText, lang);

          if (!base64Audio || base64Audio.length === 0) {
            throw new Error('Generated base64 audio is empty');
          }

          message.audio = base64Audio;
          message.audioFormat = "mp3";

          const tempFile = `audios/message_${index}_temp.mp3`;
          fs.writeFileSync(tempFile, Buffer.from(base64Audio, 'base64'));
          message._tempAudioFile = tempFile;
        } else {
          // For English, use local TTS
          await convertTextToSpeech({ text: cleanText, fileName: wavFileName, language });
        }
      } catch (error) {
        console.error(`[LipSync] ❌ TTS failed for message ${index}:`, error.message);
        if (lang === "hindi" || lang === "hi" || lang === "telugu" || lang === "te") throw error;

        // Placeholder for English
        const placeholder = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00]);
        fs.writeFileSync(wavFileName, placeholder);
      }
    })
  );

  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;
      const wavFileName = `audios/message_${index}.wav`;
      const jsonFileName = `audios/message_${index}.json`;

      try {
        if (message.audio && message.audioFormat && message._tempAudioFile) {
          const tempFile = message._tempAudioFile;
          if (fs.existsSync(tempFile)) {
            console.log(`[LipSync] Processing temp audio file: ${tempFile}`);
            await getPhonemes({ message: index, language, audioFile: tempFile });
            const tempJsonFile = tempFile.replace(/\.(mp3|wav)$/, '.json');
            message.lipsync = await readJsonTranscript({ fileName: tempJsonFile });
            console.log(`[LipSync] ✅ Lip sync data loaded for message ${index}:`, message.lipsync ? `${message.lipsync.mouthCues?.length || 0} cues` : 'no data');
            setTimeout(() => { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); }, 5000);
          }
        } else {
          let audioFile = fs.existsSync(wavFileName) ? wavFileName : (fs.existsSync(fileName) ? fileName : null);
          let audioFormat = audioFile ? (audioFile.endsWith(".wav") ? "wav" : "mp3") : null;

          if (!audioFile) {
            audioFile = wavFileName;
            audioFormat = "wav";
            fs.writeFileSync(audioFile, Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x00, 0x80, 0x3e, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00]));
          }

          await getPhonemes({ message: index, language });
          message.lipsync = await readJsonTranscript({ fileName: jsonFileName });
          message.audio = await audioFileToBase64({ fileName: audioFile });
          message.audioFormat = audioFormat;
        }
      } catch (error) {
        console.error(`Error processing phonemes for message ${index}:`, error);
        if (!message.lipsync) message.lipsync = { mouthCues: [{ start: 0, end: 1, value: "X" }] };
      }
    })
  );

  return { ...otherProps, messages };
};

export { lipSync };