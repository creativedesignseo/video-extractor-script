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
 * 
 * CHANGELOG:
 * 19/02/2026:
 * - Added "Video cut" functionality (Option 5).
 * - Added Interactive Video Format Selection (Arrow Keys) during full video download (Option 1).
 * - Added "Video para compartir" conversion (Option 6) for WhatsApp compatibility (H.264/AAC).
 */

const { exec, spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Path to the downloaded yt-dlp.exe
const ytDlpPath = path.resolve(__dirname, 'yt-dlp.exe');

// Output directories
const fullAudioDir = path.resolve(__dirname, 'Audio completo');
const cutAudioDir = path.resolve(__dirname, 'Audio cut');
const masteredAudioDir = path.resolve(__dirname, 'Audio masterizado');
const fullVideoDir = path.resolve(__dirname, 'Video completo');
const cutVideoDir = path.resolve(__dirname, 'Video cut');
const shareVideoDir = path.resolve(__dirname, 'Video para compartir');

// Ensure directories exist
if (!fs.existsSync(fullAudioDir)) fs.mkdirSync(fullAudioDir, { recursive: true });
if (!fs.existsSync(cutAudioDir)) fs.mkdirSync(cutAudioDir, { recursive: true });
if (!fs.existsSync(masteredAudioDir)) fs.mkdirSync(masteredAudioDir, { recursive: true });
if (!fs.existsSync(fullVideoDir)) fs.mkdirSync(fullVideoDir, { recursive: true });
if (!fs.existsSync(cutVideoDir)) fs.mkdirSync(cutVideoDir, { recursive: true });
if (!fs.existsSync(shareVideoDir)) fs.mkdirSync(shareVideoDir, { recursive: true });

const args = process.argv.slice(2);
const videoUrl = args.find(arg => arg.startsWith('http'));
const isAudioOnly = args.includes('--audio');
const isTrimMode = args.includes('--recortar') || args.includes('--trim');
const isMasterMode = args.includes('--masterizar') || args.includes('--master');
const specifiedFile = args.find(arg => !arg.startsWith('http') && !arg.startsWith('--') && arg.endsWith('.mp3'));

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
                if (line.includes('[ExtractAudio] Destination:')) {
                    outputFilename = line.split('Destination: ')[1].trim();
                } else if (line.includes('Destination:') && !outputFilename) {
                     const parts = line.split('Destination: ');
                     if (parts.length > 1) outputFilename = parts[1].trim();
                }
                if (line.includes('has already been downloaded')) {
                    const parts = line.split('download] ')[1].trim().split(' has already')[0];
                    outputFilename = parts;
                }
            });
        });

        child.stderr.on('data', (data) => console.error(data.toString()));

        child.on('close', (code) => {
            if (code === 0) {
                resolve(outputFilename);
            } else {
               reject(new Error(`yt-dlp salio con codigo ${code}`));
            }
        });
    });
}

// Function to select video format interactively
function selectVideoFormat(url) {
    return new Promise((resolve, reject) => {
        console.log('\nObteniendo formatos disponibles...');
        
        const ytArgs = ['-F', url];
        const child = spawn(ytDlpPath, ytArgs);
        let output = '';

        child.stdout.on('data', (data) => { output += data.toString(); });
        
        child.on('close', async (code) => {
            if (code !== 0) {
                console.error('No se pudieron obtener los formatos, se usará la mejor calidad por defecto.');
                return resolve(null);
            }

            const lines = output.split('\n');
            const formats = [];
            
            // Parse yt-dlp output
            lines.forEach(line => {
                // Regex to capture format info. Standard yt-dlp -F output:
                // ID  EXT   RESOLUTION FPS CH |   FILESIZE   TBR PROTO | VCODEC           VBR ACODEC      ABR ASR MORE INFO
                // 137 mp4   1920x1080   24    |  54.61MiB 1188k https | avc1.640028   1188k video only          1080p, mp4_dash
                const match = line.match(/^(\d+)\s+(\w+)\s+(\d+x\d+|audio only|images)\s+/);
                if (match) {
                    const formatCode = match[1];
                    const ext = match[2];
                    const resolution = match[3];
                    // Keep the full line for display context, but maybe clean it up a bit
                    formats.push({
                        code: formatCode,
                        text: line.trim(),
                        display: `[${ext.toUpperCase()}] ${resolution} - ${line.substring(line.indexOf('|') + 1).trim()}`
                    });
                }
            });

            if (formats.length === 0) {
                console.log('No se encontraron formatos específicos parseables. Usando mejor calidad.');
                return resolve(null);
            }

            // Reverse to show best quality (usually at bottom) first? Or keep yt-dlp order (worst to best)?
            // yt-dlp lists worst to best usually. Let's reverse it so best is at top for easier access?
            // Actually, let's keep it as is or specific preference? Creating a list.
            // Let's reverse so high quality is at the top of our menu if we scroll down, or bottom?
            // "Best" is usually at the bottom of the CLI output. Let's reverse formats array so "Best" is top.
            formats.reverse();
            
            // Add "Best Automatic" option at the very top
            formats.unshift({ code: null, display: '⭐ MEJOR CALIDAD AUTOMÁTICA (Recomendado)' });

            // Interactive Selection Logic
            let selectedIndex = 0;
            const pageSize = 10; // Show 10 items at a time

            // Prepare stdin for raw mode
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            stdin.setEncoding('utf8');

            function render() {
                // Move cursor up to overwrite previous list
                // We need to clear only the lines we wrote.
                // A simple way in raw CLI without curses is hard to do perfectly dynamic.
                // Instead of fully dynamic overwrite which is buggy on some shells without libs,
                // let's just print the instruction once and reprint the current selection line?
                // No, standard is to clear screen or redraw list.
                // Let's try a simple re-render of N lines.
                
                console.clear(); // Too aggressive, might clear history.
                // Better: navigate cursor.
                // Since this is a simple script, 'console.clear()' is acceptable user experience for a menu 
                // but might lose context of previous logs.
                // Let's use a simple distinct render:
                
                // Clear console to show menu clearly (User asked for a box/menu)
                process.stdout.write('\x1B[2J\x1B[0f'); 
                console.log('\n--- SELECCIONA EL FORMATO (Usa flechas ↑/↓ y Enter) ---');
                
                const start = Math.max(0, selectedIndex - Math.floor(pageSize / 2));
                const end = Math.min(formats.length, start + pageSize);
                
                for (let i = start; i < end; i++) {
                    const item = formats[i];
                    if (i === selectedIndex) {
                        console.log(`\x1b[36m> ${item.display}\x1b[0m`); // Cyan color for selection
                    } else {
                        console.log(`  ${item.display}`);
                    }
                }
                console.log(`\n(Mostrando ${start + 1}-${end} de ${formats.length})`);
            }

            render();

            const keyPressHandler = (key) => {
                const keyStr = key.toString();
                
                // ctrl+c
                if (keyStr === '\u0003') {
                    process.exit();
                }

                // Up (Windows might send different codes, checking standard ANSI)
                // Often \u001b[A or just \u001bOH or scan codes.
                // Extended check for arrow keys.
                if (keyStr === '\u001b[A' || keyStr === 'w') { 
                    selectedIndex = Math.max(0, selectedIndex - 1);
                    render();
                }
                // Down
                else if (keyStr === '\u001b[B' || keyStr === 's') {
                    selectedIndex = Math.min(formats.length - 1, selectedIndex + 1);
                    render();
                }
                // Enter
                else if (keyStr === '\r' || keyStr === '\n') {
                    stdin.removeListener('data', keyPressHandler);
                    stdin.setRawMode(false);
                    // DO NOT PAUSE! readline needs it running.
                    // stdin.pause(); 
                    
                    console.log('\nSeleccionado: ' + formats[selectedIndex].display);
                    resolve(formats[selectedIndex].code);
                }
            };

            stdin.on('data', keyPressHandler);
        });
    });
}

// Function to cut audio using ffmpeg
function cutAudio(inputFile, start, duration) {
    return new Promise((resolve, reject) => {
         let fullPathInput = inputFile;
         if (!path.isAbsolute(inputFile)) {
             fullPathInput = path.resolve(process.cwd(), inputFile);
         }

         const filename = path.basename(fullPathInput);
         const outputFile = path.join(cutAudioDir, `RECORTADO_${filename}`);

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
             console.error(data.toString()); 
         });

         child.on('close', (code) => {
             if (code === 0) {
                 resolve(outputFile);
             } else {
                 reject(new Error(`ffmpeg salio con codigo ${code}`));
             }
         });
    });
}

// Function to cut video using ffmpeg
function cutVideo(inputFile, start, duration) {
    return new Promise((resolve, reject) => {
         let fullPathInput = inputFile;
         if (!path.isAbsolute(inputFile)) {
             fullPathInput = path.resolve(process.cwd(), inputFile);
         }

         const filename = path.basename(fullPathInput);
         const outputFile = path.join(cutVideoDir, `RECORTADO_${filename}`);

         console.log(`\nRecortando Video: ${start}s + ${duration}s`);
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
             // console.error(data.toString()); // Verbose
         });

         child.on('close', (code) => {
             if (code === 0) {
                 resolve(outputFile);
             } else {
                 reject(new Error(`ffmpeg salio con codigo ${code}`));
             }
         });
    });
}

// ========== COMPRESSION PRESETS ==========
const COMPRESSION_PRESETS = [
    {
        name: '📱 WhatsApp Optimizado',
        description: 'Máxima compresión, ideal para enviar por WhatsApp (límite ~64 MB)',
        crf: 28,
        preset: 'medium',
        audioBitrate: '96k',
        mbPerMinute: 3.5, // estimated MB per minute of video
        maxflags: '-vf scale=\'min(1280,iw)\':\'min(720,ih)\':force_original_aspect_ratio=decrease'
    },
    {
        name: '📤 Redes Sociales',
        description: 'Buen balance calidad/tamaño para Instagram, Facebook, Telegram',
        crf: 23,
        preset: 'medium',
        audioBitrate: '128k',
        mbPerMinute: 7,
        maxflags: null
    },
    {
        name: '🎬 Alta Calidad',
        description: 'Calidad casi sin pérdida, para archivar o editar después',
        crf: 18,
        preset: 'slow',
        audioBitrate: '192k',
        mbPerMinute: 22,
        maxflags: null
    }
];

// Get video duration using ffmpeg -i (parses Duration from stderr)
function getVideoDuration(filePath) {
    return new Promise((resolve) => {
        const args = ['-i', filePath];
        const child = spawn(ffmpegPath, args);
        let stderrOutput = '';
        
        child.stdout.on('data', () => {}); // ignore stdout
        child.stderr.on('data', (data) => { stderrOutput += data.toString(); });
        
        child.on('error', () => {
            // ffmpeg not found or other spawn error
            resolve(0);
        });
        
        child.on('close', () => {
            // ffmpeg -i always exits with code 1 (no output file), but we still get Duration
            const match = stderrOutput.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (match) {
                const hours = parseFloat(match[1]);
                const minutes = parseFloat(match[2]);
                const seconds = parseFloat(match[3]);
                resolve((hours * 3600) + (minutes * 60) + seconds);
            } else {
                resolve(0); // Fallback: estimation will be skipped
            }
        });
    });
}

// Estimate output file size in MB
function estimateFileSize(durationSeconds, preset) {
    const durationMinutes = durationSeconds / 60;
    return (durationMinutes * preset.mbPerMinute).toFixed(1);
}

// Function to convert video to compatible format (H.264/AAC) with preset
function convertToCompatibleFormat(inputFile, selectedPreset = COMPRESSION_PRESETS[0]) {
    return new Promise((resolve, reject) => {
        let fullPathInput = inputFile;
        if (!path.isAbsolute(inputFile)) {
            fullPathInput = path.resolve(process.cwd(), inputFile);
        }

        const filename = path.basename(fullPathInput, path.extname(fullPathInput));
        const outputFile = path.join(shareVideoDir, `${filename}_COMPARTIR.mp4`);

        console.log(`\nConvirtiendo video para compatibilidad...`);
        console.log(`Preset: ${selectedPreset.name}`);
        console.log(`Origen: ${fullPathInput}`);
        console.log(`Destino: ${outputFile}`);
        console.log(`Config: H.264 CRF ${selectedPreset.crf} | AAC ${selectedPreset.audioBitrate} | Preset: ${selectedPreset.preset}`);

        const ffmpegArgs = ['-i', fullPathInput];

        // Add scale filter for WhatsApp (720p max)
        if (selectedPreset.maxflags) {
            ffmpegArgs.push('-vf', `scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease`);
        }

        ffmpegArgs.push(
            '-c:v', 'libx264',
            '-preset', selectedPreset.preset,
            '-crf', String(selectedPreset.crf),
            '-c:a', 'aac',
            '-b:a', selectedPreset.audioBitrate,
            '-movflags', '+faststart',
            '-y',
            outputFile
        );

        // Progress Bar Implementation
        let totalDuration = 0;
        
        const child = spawn(ffmpegPath, ffmpegArgs);

        child.stderr.on('data', (data) => {
            const output = data.toString();
            
            if (!totalDuration) {
                const durationMatch = output.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durationMatch) {
                    const hours = parseFloat(durationMatch[1]);
                    const minutes = parseFloat(durationMatch[2]);
                    const seconds = parseFloat(durationMatch[3]);
                    totalDuration = (hours * 3600) + (minutes * 60) + seconds;
                }
            }

            const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
            if (timeMatch && totalDuration > 0) {
                const hours = parseFloat(timeMatch[1]);
                const minutes = parseFloat(timeMatch[2]);
                const seconds = parseFloat(timeMatch[3]);
                const currentTime = (hours * 3600) + (minutes * 60) + seconds;
                
                const percent = Math.min(100, Math.round((currentTime / totalDuration) * 100));
                process.stdout.write(`\rProcesando: ${percent}% completado...`);
            }
        });

        child.on('close', (code) => {
            process.stdout.write('\n');
            if (code === 0) {
                // Show actual output file size
                try {
                    const stats = fs.statSync(outputFile);
                    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
                    console.log(`📦 Tamaño final: ${sizeMB} MB`);
                } catch(e) { /* ignore */ }
                resolve(outputFile);
            } else {
                reject(new Error(`ffmpeg conversión falló con código ${code}`));
            }
        });
    });
}

// Helper: Show preset selection menu with estimated file sizes
async function selectCompressionPreset(videoFilePath) {
    // Try to get duration for estimation
    const duration = await getVideoDuration(videoFilePath);
    const durationMin = (duration / 60).toFixed(1);

    console.log('\n--- Selecciona Calidad de Compresión ---');
    if (duration > 0) {
        console.log(`Duración del video: ${durationMin} min\n`);
    }

    COMPRESSION_PRESETS.forEach((preset, index) => {
        let sizeInfo = '';
        if (duration > 0) {
            const estimated = estimateFileSize(duration, preset);
            sizeInfo = ` (~${estimated} MB)`;
        }
        console.log(`${index + 1}. ${preset.name}${sizeInfo}`);
        console.log(`   ${preset.description}`);
    });

    const presetChoice = await askQuestion('\nSelecciona preset (1-3): ');
    const presetIndex = parseInt(presetChoice) - 1;

    if (isNaN(presetIndex) || presetIndex < 0 || presetIndex >= COMPRESSION_PRESETS.length) {
        console.log('Selección inválida. Usando WhatsApp Optimizado por defecto.');
        return COMPRESSION_PRESETS[0];
    }

    const selected = COMPRESSION_PRESETS[presetIndex];

    // Warning if WhatsApp preset and estimated size > 64 MB
    if (presetIndex === 0 && duration > 0) {
        const estimated = parseFloat(estimateFileSize(duration, selected));
        if (estimated > 64) {
            console.log(`\n⚠️  Atención: El tamaño estimado (${estimated} MB) supera el límite de WhatsApp (64 MB).`);
            console.log('   Considera recortar el video primero para reducir la duración.');
            const proceed = await askQuestion('¿Continuar de todas formas? (s/n): ');
            if (proceed.toLowerCase() !== 's') {
                return null; // Signal to abort
            }
        }
    }

    return selected;
}

// Function to handle conversion mode
async function handleConversionMode() {
    try {
        console.log('\n--- Convertir Video para Compartir ---');
        console.log('1. Desde carpeta "Video cut" (Recortes)');
        console.log('2. Desde carpeta "Video completo" (Originales)');
        
        const sourceChoice = await askQuestion('Selecciona origen (1-2): ');
        let sourceDir = cutVideoDir;
        
        if (sourceChoice === '2') sourceDir = fullVideoDir;
        
        const files = fs.readdirSync(sourceDir).filter(f => f.match(/\.(mp4|mkv|webm|mov)$/i));
            
        if (files.length === 0) {
            console.log('No se encontraron videos en la carpeta seleccionada.');
            return;
        }

        files.forEach((file, index) => {
            console.log(`${index + 1}. ${file}`);
        });

        const selection = await askQuestion('\nSelecciona el número del video: ');
        const selectedIndex = parseInt(selection) - 1;

        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= files.length) {
            console.error('Selección inválida.');
            return;
        }

        const targetFile = path.join(sourceDir, files[selectedIndex]);

        // Show preset selection with estimated sizes
        const selectedPreset = await selectCompressionPreset(targetFile);
        if (!selectedPreset) {
            console.log('Conversión cancelada.');
            return;
        }

        const outputFile = await convertToCompatibleFormat(targetFile, selectedPreset);
        console.log(`\n✅ Video convertido exitosamente: ${outputFile}`);
        console.log('Este archivo es compatible con WhatsApp y redes sociales.');

    } catch (err) {
        console.error('Error en conversión:', err.message);
    } finally {
        rl.close();
    }
}

// Function to master audio using ffmpeg filters
function masterizarAudio(inputFile) {
    return new Promise((resolve, reject) => {
        let fullPathInput = inputFile;
        if (!path.isAbsolute(inputFile)) {
            fullPathInput = path.resolve(process.cwd(), inputFile);
        }

        const filename = path.basename(fullPathInput);
        const outputFile = path.join(masteredAudioDir, `MASTER_${filename}`);

        console.log('\nIniciando Masterización Profesional...');
        console.log('Aplicando: EQ + Compresión Dinámica + Normalización de Volumen (-14 LUFS)');
        console.log(`Origen: ${fullPathInput}`);
        console.log(`Destino: ${outputFile}`);

        // Filter chain:
        // 1. highpass=f=30: Remove very low rumble
        // 2. dynaudnorm=f=150:g=15: Dynamic audio normalization (compression/leveling) without distortion
        // 3. loudnorm=I=-14:TP=-1:LRA=11: Loudness normalization to standard streaming levels
        const filterChain = 'highpass=f=30, dynaudnorm=f=150:g=15, loudnorm=I=-14:TP=-1:LRA=11';

        const ffmpegArgs = [
            '-i', fullPathInput,
            '-af', filterChain,
            '-c:a', 'libmp3lame',
            '-q:a', '2', // High quality VBR MP3 (approx 190-250kbps)
            '-y', // Overwrite
            outputFile
        ];

        const child = spawn(ffmpegPath, ffmpegArgs);

        child.stderr.on('data', (data) => {
            // ffmpeg prints progress to stderr, helpful to see but maybe too verbose for "mastering..."
            // console.error(data.toString()); 
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('¡Masterización completada!');
                resolve(outputFile);
            } else {
                reject(new Error(`ffmpeg salio con codigo ${code}`));
            }
        });
    });
}


// Function to handle trim logic separately
async function handleTrimMode() {
    try {
        let targetFile = specifiedFile;

        // If no file specified, list files in 'Audio completo'
        if (!targetFile) {
            const files = fs.readdirSync(fullAudioDir).filter(f => f.endsWith('.mp3'));
            
            if (files.length === 0) {
                console.log('No se encontraron archivos .mp3 en la carpeta "Audio completo".');
                return;
            }

            console.log('\nArchivos disponibles para recortar:');
            files.forEach((file, index) => {
                console.log(`${index + 1}. ${file}`);
            });

            const selection = await askQuestion('\nSelecciona el número del archivo que quieres recortar: ');
            const selectedIndex = parseInt(selection) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= files.length) {
                console.error('Selección inválida.');
                return;
            }

            targetFile = path.join(fullAudioDir, files[selectedIndex]);
        } else {
            if (!fs.existsSync(targetFile)) {
                const potentialPath = path.join(fullAudioDir, targetFile);
                if (fs.existsSync(potentialPath)) {
                    targetFile = potentialPath;
                } else {
                    console.error(`El archivo "${targetFile}" no existe.`);
                    return;
                }
            }
        }

        console.log(`\nArchivo seleccionado: ${targetFile}`);
        
        const startInput = await askQuestion('¿Tiempo de inicio? (ej: 00:01:30 o 90): ');
        const durationInput = await askQuestion('¿Duración a recortar en segundos? (ej: 30): ');
        
        const startSeconds = parseTimeToSeconds(startInput);
        const durationSeconds = parseTimeToSeconds(durationInput);
        
        if (isNaN(startSeconds) || isNaN(durationSeconds)) {
             console.error('Tiempos inválidos.');
             return;
        }

        const outputFile = await cutAudio(targetFile, startSeconds, durationSeconds);
        console.log(`\n¡Recorte guardado exitosamente en: ${outputFile}`);

    } catch (err) {
        console.error('Error al recortar:', err.message);
    } finally {
        rl.close();
    }
}

// Function to handle master logic separately
async function handleMasterMode() {
    try {
        let targetFile = specifiedFile;

        if (!targetFile) {
            const files = fs.readdirSync(fullAudioDir).filter(f => f.endsWith('.mp3'));
            
            if (files.length === 0) {
                console.log('No se encontraron archivos .mp3 en la carpeta "Audio completo".');
                return;
            }

            console.log('\nArchivos disponibles para masterizar:');
            files.forEach((file, index) => {
                console.log(`${index + 1}. ${file}`);
            });

            const selection = await askQuestion('\nSelecciona el número del archivo que quieres masterizar: ');
            const selectedIndex = parseInt(selection) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= files.length) {
                console.error('Selección inválida.');
                return;
            }

            targetFile = path.join(fullAudioDir, files[selectedIndex]);
        } else {
             if (!fs.existsSync(targetFile)) {
                const potentialPath = path.join(fullAudioDir, targetFile);
                if (fs.existsSync(potentialPath)) {
                    targetFile = potentialPath;
                } else {
                    console.error(`El archivo "${targetFile}" no existe.`);
                    return;
                }
            }
        }

        console.log(`\nArchivo seleccionado para masterizar: ${targetFile}`);
        const outputFile = await masterizarAudio(targetFile);
        console.log(`\n¡Audio Masterizado guardado exitosamente en: ${outputFile}`);

    } catch (err) {
        console.error('Error al masterizar:', err.message);
    } finally {
        rl.close();
    }
}

// Function to handle video trim logic
async function handleTrimVideoMode(preSelectedFile = null) {
    try {
        let targetFile = preSelectedFile || specifiedFile;

        // If no file specified, list files in 'Video completo'
        if (!targetFile) {
            const files = fs.readdirSync(fullVideoDir).filter(f => f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm'));
            
            if (files.length === 0) {
                console.log('No se encontraron videos en la carpeta "Video completo".');
                return;
            }

            console.log('\nVideos disponibles para recortar:');
            files.forEach((file, index) => {
                console.log(`${index + 1}. ${file}`);
            });

            const selection = await askQuestion('\nSelecciona el número del video que quieres recortar: ');
            const selectedIndex = parseInt(selection) - 1;

            if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= files.length) {
                console.error('Selección inválida.');
                return;
            }

            targetFile = path.join(fullVideoDir, files[selectedIndex]);
        } else {
            if (!fs.existsSync(targetFile)) {
                const potentialPath = path.join(fullVideoDir, targetFile);
                if (fs.existsSync(potentialPath)) {
                    targetFile = potentialPath;
                } else {
                    console.error(`El archivo "${targetFile}" no existe.`);
                    return;
                }
            }
        }

        console.log(`\nVideo seleccionado: ${targetFile}`);
        
        const startInput = await askQuestion('¿Tiempo de inicio? (ej: 00:01:30 o 90): ');
        const durationInput = await askQuestion('¿Duración a recortar en segundos? (ej: 30): ');
        
        const startSeconds = parseTimeToSeconds(startInput);
        const durationSeconds = parseTimeToSeconds(durationInput);
        
        if (isNaN(startSeconds) || isNaN(durationSeconds)) {
             console.error('Tiempos inválidos.');
             return;
        }

        const outputFile = await cutVideo(targetFile, startSeconds, durationSeconds);
        console.log(`\n¡Video Recortado guardado exitosamente en: ${outputFile}`);

        // Ask for conversion immediately
        const convert = await askQuestion('\n¿Quieres convertir este recorte para COMPARTIR (WhatsApp/Redes)? (s/n): ');
        if (convert.toLowerCase() === 's') {
            try {
                const selectedPreset = await selectCompressionPreset(outputFile);
                if (selectedPreset) {
                    const convertedFile = await convertToCompatibleFormat(outputFile, selectedPreset);
                    console.log(`\n✅ Video listo para compartir: ${convertedFile}`);
                } else {
                    console.log('Conversión cancelada.');
                }
            } catch (e) {
                console.error('Error al convertir:', e.message);
            }
        }

    } catch (err) {
        console.error('Error al recortar video:', err.message);
    } finally {
        rl.close();
    }
}


// Function to download full video
function downloadFullVideo(url, formatCode = null) {
    return new Promise((resolve, reject) => {
        console.log('\nDescargando video completo...');
        
        let formatArg = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        if (formatCode) {
            formatArg = `${formatCode}+bestaudio/best`; // Try to merge with audio if video-only stream is selected, or just use code
            // Simplification: just pass the code. If it's video-only, yt-dlp might warn.
            // Better strategy: formatCode+bestaudio/formatCode
            formatArg = `${formatCode}+bestaudio/${formatCode}`;
        }

        const ytArgs = [
            '-f', formatArg,
            '--merge-output-format', 'mp4',
            '--ffmpeg-location', ffmpegPath,
            '--no-playlist', 
            '--restrict-filenames', 
            '-o', `${fullVideoDir}/%(title)s.%(ext)s`,
            url
        ];

        const child = spawn(ytDlpPath, ytArgs);
        let outputFilename = null;

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                console.log(line); 
                if (line.includes('[Merger] Merging formats into')) {
                    outputFilename = line.split('Merging formats into "')[1].trim().replace('"', '');
                } else if (line.includes('[download] Destination:') && !outputFilename) {
                    outputFilename = line.split('Destination: ')[1].trim();
                } else if (line.includes('has already been downloaded')) {
                    const parts = line.split('download] ')[1].trim().split(' has already')[0];
                    outputFilename = parts;
                }
            });
        });

        child.stderr.on('data', (data) => console.error(data.toString()));

        child.on('close', (code) => {
            if (code === 0) {
                resolve(outputFilename);
            } else {
                reject(new Error(`yt-dlp salio con codigo ${code}`));
            }
        });
    });
}

async function main() {
    if (!fs.existsSync(ytDlpPath)) {
        console.error('Error: yt-dlp.exe no encontrado.');
        process.exit(1);
    }

    if (isTrimMode) {
        await handleTrimMode();
        return;
    }

    if (isMasterMode) {
        await handleMasterMode();
        return;
    }

    if (!videoUrl) {
        // Interactive menu if no args provided
        console.log('\n--- Video Extractor & Audio Master ---');
        console.log('1. Descargar Video Completo');
        console.log('2. Descargar Audio Completo');
        console.log('3. Recortar Audio Existente');
        console.log('4. Masterizar Audio Existente (EQ + Normalización)');
        console.log('5. Recortar Video Existente');
        console.log('6. Convertir Video para Compartir (WhatsApp/Compatible)');
        
        const choice = await askQuestion('\nSelecciona una opción (1-6): ');
        
        if (choice === '1') {
             const url = await askQuestion('Ingresa la URL del video: ');
             if (!url) return rl.close();
             
             // Ask for format selection
             const formatCode = await selectVideoFormat(url);

             try {
                const downloadedFile = await downloadFullVideo(url, formatCode);
                if (downloadedFile) console.log(`\nVideo completo guardado en: ${downloadedFile}`);
             } catch (err) { console.error(err.message); } finally { rl.close(); }
        } else if (choice === '2') {
             const url = await askQuestion('Ingresa la URL del video: ');
             if (!url) return rl.close();
             try {
                 const downloadedFile = await downloadFullAudio(url);
                 if (downloadedFile) {
                    console.log(`\nAudio completo guardado en: ${downloadedFile}`);
                    // Ask for next steps
                    const nextStep = await askQuestion('\n¿Qué quieres hacer ahora? (r: recortar, m: masterizar, n: nada): ');
                    if (nextStep.toLowerCase() === 'r') {
                         await handleTrimMode(); // This might need refactoring to pass the file directly but handleTrimMode uses global var specifiedFile or asks.
                         // For simplicity, let's just tell user to use menu or CLI for now, OR better yet, set specifiedFile?
                         // Re-architecting quickly: handleTrimMode reads global. Let's just exit and let user choose option 3 or 4.
                         console.log('Usa la opción 3 o 4 del menú principal para procesar el archivo.');
                    } else if (nextStep.toLowerCase() === 'm') {
                         console.log('Usa la opción 4 del menú principal para masterizar.');
                    }
                 }
             } catch (err) { console.error(err.message); } finally { rl.close(); }
        } else if (choice === '3') {
            await handleTrimMode();
        } else if (choice === '4') {
            await handleMasterMode();
        } else if (choice === '5') {
            await handleTrimVideoMode();
        } else if (choice === '6') {
            await handleConversionMode();
        } else {
            console.log('Opción inválida.');
            rl.close();
        }
        return;
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

             // 2. Ask for cut or master
             const answer = await askQuestion('\n¿Quieres procesar este audio? (r: recortar, m: masterizar, n: nada): ');
             
             if (answer.toLowerCase() === 'r') {
                 const startInput = await askQuestion('¿Tiempo de inicio? (ej: 00:01:30 o 90): ');
                 const durationInput = await askQuestion('¿Duración a recortar? (ej: 30): ');
                 
                 const startSeconds = parseTimeToSeconds(startInput);
                 const durationSeconds = parseTimeToSeconds(durationInput);
                 
                 await cutAudio(downloadedFile, startSeconds, durationSeconds);
                 console.log(`\n¡Recorte guardado en la carpeta "Audio cut"!`);

             } else if (answer.toLowerCase() === 'm') {
                await masterizarAudio(downloadedFile);
                console.log(`\n¡Audio Masterizado guardado en la carpeta "Audio masterizado"!`);
             }
             
         } catch (err) {
             console.error('Error:', err.message);
         } finally {
             rl.close();
         }

    } else {
        try {
            // Ask for format selection even when URL is passed as arg
            const formatCode = await selectVideoFormat(videoUrl);

            const downloadedFile = await downloadFullVideo(videoUrl, formatCode);
            
            if (!downloadedFile) {
                console.error('No se pudo determinar el archivo descargado. Revisa la carpeta "Video completo".');
                process.exit(1);
            }

            console.log(`\nVideo completo guardado en: ${downloadedFile}`);

            // Post-download menu
            const nextStep = await askQuestion('\n¿Qué quieres hacer ahora? (r: recortar, c: convertir para compartir, n: salir): ');
            if (nextStep.toLowerCase() === 'r') {
                await handleTrimVideoMode(downloadedFile);
            } else if (nextStep.toLowerCase() === 'c') {
                try {
                    const selectedPreset = await selectCompressionPreset(downloadedFile);
                    if (selectedPreset) {
                        const convertedFile = await convertToCompatibleFormat(downloadedFile, selectedPreset);
                        console.log(`\n✅ Video convertido exitosamente: ${convertedFile}`);
                    } else {
                        console.log('Conversión cancelada.');
                    }
                } catch (e) {
                    console.error('Error al convertir:', e.message);
                }
            }
            
        } catch (err) {
            console.error('Error:', err.message);
        } finally {
            rl.close();
        }
    }
}

main();
