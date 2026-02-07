/**
 * Video Extractor Script
 * ----------------------
 * Este script permite extraer audio de videos de YouTube y opcionalmente recortarlo.
 * 
 * Requisitos:
 * - Node.js
 * - yt-dlp (ejecutable en la misma carpeta o en el PATH)
 * - ffmpeg (ejecutable en la misma carpeta o en el PATH)
 * 
 * Uso:
 * node video-extractor.js "URL_VIDEO" [--audio]
 * 
 * Autor: Generado por Antigravity
 * Fecha: 07/02/2026
 */

const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Path to the downloaded yt-dlp.exe
const ytDlpPath = path.resolve(__dirname, 'yt-dlp.exe');

// Output directories
const fullAudioDir = path.resolve(__dirname, 'Audio completo');
const cutAudioDir = path.resolve(__dirname, 'Audio cut');

// Ensure directories exist
if (!fs.existsSync(fullAudioDir)) fs.mkdirSync(fullAudioDir, { recursive: true });
if (!fs.existsSync(cutAudioDir)) fs.mkdirSync(cutAudioDir, { recursive: true });

const args = process.argv.slice(2);
const videoUrl = args.find(arg => arg.startsWith('http'));
const isAudioOnly = args.includes('--audio');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseFloat(timeStr);
}

// Function to download full audio
function downloadFullAudio(url) {
    return new Promise((resolve, reject) => {
        console.log('\nDescargando audio completo...');
        
        // We use --print filename to Capture the filename
        // But we also need to download.
        // We can use --exec to print the filename after download, or just capture stdout if we use -o
        // Simpler: Use -o with a fixed template and capture the filename that yt-dlp reports, 
        // OR rely on yt-dlp printing "[ExtractAudio] Destination: ..."
        
        const ytArgs = [
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--ffmpeg-location', ffmpegPath,
            '--no-playlist', // Disable playlist
            '--force-keyframes-at-cuts',
            '--restrict-filenames', // Restrict filenames to ASCII
            '-o', `${fullAudioDir}/%(title)s.%(ext)s`,
            url
        ];

        const child = spawn(ytDlpPath, ytArgs);
        let outputFilename = null;

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                console.log(line); // Forward stdout to user
                // Try to catch the destination filename
                // Pattern: [ExtractAudio] Destination: ... or [download] Destination: ...
                if (line.includes('[ExtractAudio] Destination:')) {
                    outputFilename = line.split('Destination: ')[1].trim();
                } else if (line.includes('Destination:') && !outputFilename) {
                     // Fallback
                     const parts = line.split('Destination: ');
                     if (parts.length > 1) outputFilename = parts[1].trim();
                }
                // Already downloaded check
                if (line.includes('has already been downloaded')) {
                    const parts = line.split('download] ')[1].trim().split(' has already')[0];
                    outputFilename = parts;
                }
            });
        });

        child.stderr.on('data', (data) => console.error(data.toString()));

        child.on('close', (code) => {
            if (code === 0) {
                // If we didn't capture filename (e.g. ffmpeg output messed it up), we might need to search or assume.
                // But for now let's hope we caught it. 
                // Wait, if outputFilename is relative, join with fullAudioDir? 
                // yt-dlp output path usually is what we passed in -o.
                
                // If -o was absolute, yt-dlp reports absolute.
                resolve(outputFilename);
            } else {
               reject(new Error(`yt-dlp exited with code ${code}`));
            }
        });
    });
}

// Function to cut audio using ffmpeg
function cutAudio(inputFile, start, duration) {
    return new Promise((resolve, reject) => {
         // Input file might be just filename if yt-dlp executed in CWD but we pointed -o to subdir?
         // If we passed absolute path to -o, it should be absolute.
         // Let's ensure we have the full path.
         
         let fullPathInput = inputFile;
         if (!path.isAbsolute(inputFile)) {
             // If yt-dlp returned relative path to CWD
             fullPathInput = path.resolve(process.cwd(), inputFile);
         }

         const filename = path.basename(fullPathInput);
         const outputFile = path.join(cutAudioDir, `CUT_${filename}`);

         console.log(`\nRecortando: ${start}s + ${duration}s`);
         console.log(`Origen: ${fullPathInput}`);
         console.log(`Destino: ${outputFile}`);

         const ffmpegArgs = [
             '-i', fullPathInput,
             '-ss', start.toString(),
             '-t', duration.toString(),
             '-c', 'copy', // Copy codec (fast, no re-encode)
             '-y', // Overwrite
             outputFile
         ];

         const child = spawn(ffmpegPath, ffmpegArgs);

         child.stderr.on('data', (data) => {
             // ffmpeg prints to stderr
             console.error(data.toString()); 
         });

         child.on('close', (code) => {
             if (code === 0) {
                 resolve(outputFile);
             } else {
                 reject(new Error(`ffmpeg exited with code ${code}`));
             }
         });
    });
}

async function main() {
    if (!fs.existsSync(ytDlpPath)) {
        console.error('Error: yt-dlp.exe no encontrado.');
        process.exit(1);
    }

    if (!videoUrl) {
        console.error('Uso: node video-extractor.js "URL" [--audio]');
        process.exit(1);
    }

    if (isAudioOnly) {
         try {
             // 1. Download Full
             const downloadedFile = await downloadFullAudio(videoUrl);
             
             if (!downloadedFile) {
                 console.error('No se pudo determinar el archivo descargado. Revisa la carpeta "Audio completo".');
                 process.exit(1);
             }

             console.log(`\nAudio completo guardado en: ${downloadedFile}`);

             // 2. Ask for cut
             const answer = await askQuestion('\n¿Quieres recortar este audio? (s/n): ');
             
             if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
                 const startInput = await askQuestion('¿Tiempo de inicio? (ej: 00:01:30 o 90): ');
                 const durationInput = await askQuestion('¿Duración a recortar? (ej: 30): ');
                 
                 const startSeconds = parseTimeToSeconds(startInput);
                 const durationSeconds = parseTimeToSeconds(durationInput);
                 
                 await cutAudio(downloadedFile, startSeconds, durationSeconds);
                 console.log(`\n¡Recorte guardado en la carpeta "Audio cut"!`);
             }
             
         } catch (err) {
             console.error('Error:', err.message);
         } finally {
             rl.close();
         }

    } else {
        // Video logic (unchanged for now, or just direct link)
        console.log('Modo video no modificado (usa --audio para descargar mp3).');
        rl.close();
    }
}

main();
