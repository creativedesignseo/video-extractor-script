# Video Extractor Script

Este proyecto contiene un script de Node.js diseñado para facilitar la extracción de audio de videos de YouTube, con capacidades de recorte automático.

## 📋 Requisitos

Para que este script funcione correctamente, necesitas tener en tu sistema:

1.  **Node.js**: Entorno de ejecución para JavaScript.
2.  **yt-dlp**: Herramienta de línea de comandos para descargar videos. Debe estar accesible en el sistema o en la carpeta del proyecto.
3.  **ffmpeg**: Herramienta para procesar audio y video (necesaria para convertir a MP3 y recortar).

## 🚀 Instalación

1.  Clona este repositorio o descarga los archivos.
2.  Abre una terminal en la carpeta del proyecto.
3.  Instala las dependencias de Node.js:
    ```bash
    npm install
    ```

## 🛠️ Uso
 
### 1. Descargar Video Completo (MP4)

Para descargar el video en la mejor calidad disponible:

```bash
node video-extractor.js "URL_DEL_VIDEO"
```
El archivo se guardará automáticamente en la carpeta `Video completo`.

### 2. Descargar solo Audio (MP3) y Recortar

Para extraer solo el audio y tener la opción de recortarlo:

```bash
node video-extractor.js "URL_DEL_VIDEO" --audio
```

### 3. Recortar Audio Existente

Si ya tienes archivos de audio descargados en la carpeta `Audio completo` y quieres recortarlos:

```bash
node video-extractor.js --recortar
```

*   El script listará los archivos disponibles.
*   Selecciona el número del archivo que deseas recortar.
*   Ingresa el tiempo de inicio y la duración.
*   El fragmento recortado se guardará en `Audio cut`.

### Funcionalidades:

*   **Descarga de Video**: Obtiene el video en formato MP4 (Video + Audio) en alta calidad.
*   **Descarga de Audio**: Extrae el audio en formato MP3 de alta calidad en la carpeta `Audio completo`.
*   **Limpieza de Nombres**: Los archivos se guardan con nombres simplificados (sin tildes ni caracteres especiales) para evitar problemas de compatibilidad.
*   **Recorte Opcional (Solo Audio)**: Al finalizar la descarga de audio, el script te preguntará si deseas recortar un fragmento.
    *   Si respondes **'s'** (sí), te pedirá:
        *   Tiempo de inicio (ej: `00:01:30` o `90` segundos).
        *   Duración del fragmento (ej: `30` segundos).
    *   El fragmento recortado se guardará en la carpeta `Audio cut`.
*   **Listas de Reproducción**: El script ignora automáticamente las listas de reproducción y solo descarga el video individual de la URL.

## 📂 Estructura de Carpetas

El script creará automáticamente estas carpetas si no existen:

*   `Video completo/`: Almacena los videos descargados en formato MP4.
*   `Audio completo/`: Almacena los audios completos descargados en formato MP3.
*   `Audio cut/`: Almacena los fragmentos de audio recortados.

## 📝 Notas

*   Este script está diseñado para uso personal y educativo.
*   Asegúrate de respetar los derechos de autor de los videos que descargues.
