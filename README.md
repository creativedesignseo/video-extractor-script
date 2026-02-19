# Video Extractor Script

Este proyecto contiene un script de Node.js diseñado para facilitar la extracción de audio y video de YouTube, con capacidades de recorte automático (audio y video) y **masterización profesional** de audio.

## 📋 Requisitos

Para que este script funcione correctamente, necesitas tener en tu sistema:

1.  **Node.js**: Entorno de ejecución para JavaScript.
2.  **yt-dlp**: Herramienta de línea de comandos para descargar videos. Debe estar accesible en el sistema o en la carpeta del proyecto.
3.  **ffmpeg**: Herramienta para procesar audio y video (necesaria para convertir a MP3, recortar y masterizar).

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
El script te mostrará una lista de los formatos disponibles para que elijas (flechas Arriba/Abajo y Enter).
El archivo se guardará automáticamente en la carpeta `Video completo`.

### 2. Descargar solo Audio (MP3) y Recortar/Masterizar

Para extraer solo el audio y tener opciones de procesamiento:

```bash
node video-extractor.js "URL_DEL_VIDEO" --audio
```

### 3. Menú Interactivo

Si ejecutas el script sin argumentos, se abrirá un menú con todas las opciones:

```bash
node video-extractor.js
```

### 4. Funciones Específicas

*   **Recortar Audio**: `node video-extractor.js --recortar`
*   **Masterizar Audio**: `node video-extractor.js --masterizar`
*   **Recortar Video**: Usa la opción **5** del menú interactivo.

---

### Funcionalidades:

*   **Descarga de Vide**: Obtiene el video en formato MP4 (Video + Audio) en alta calidad. **¡Nuevo!** Ahora puedes elegir el formato y calidad exactos.
*   **Recorte de Video**: **¡Nuevo!** Recorta cualquier video descargado (tiempo de inicio y duración) y guárdalo en `Video cut` sin perder calidad.
*   **Descarga de Audio**: Extrae el audio en formato MP3 de alta calidad en la carpeta `Audio completo`.
*   **Recorte de Audio**: Permite seleccionar un fragmento (tiempo de inicio y duración) y guardarlo en `Audio cut`.
*   **Masterización Profesional**: Mejora la calidad de cualquier audio en `Audio completo` aplicando:
    *   **Filtro Paso Alto**: Elimina frecuencias graves indeseadas (ruido sordo).
    *   **Compresión Dinámica**: Nivela el volumen para que todo el audio sea claro.
    *   **Normalización (Loudness)**: Ajusta el volumen final al estándar profesional (-14 LUFS).
    *   Los archivos mejorados se guardan en `Audio masterizado`.

## 📂 Estructura de Carpetas

El script creará automáticamente estas carpetas si no existen:

*   `Video completo/`: Almacena los videos descargados.
*   `Video cut/`: Almacena los videos recortados.
*   `Audio completo/`: Almacena los audios originales.
*   `Audio cut/`: Almacena los fragmentos recortados.
*   `Audio masterizado/`: Almacena los audios procesados y mejorados.

## 📝 Notas

*   Este script está diseñado para uso personal y educativo.
*   Asegúrate de respetar los derechos de autor de los videos que descargues.
