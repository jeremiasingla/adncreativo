# Inferencia semántica expansiva

Documentación del flujo de generación de creativos (ángulos de venta, prompts de imagen, especificaciones visuales), la capa de percepción y tokenización visual, y la regla de idioma aplicada en todos los prompts.

---

## Capa de Percepción y Tokenización Visual

El pipeline que lleva de una idea o ángulo de venta a una especificación JSON para modelos de difusión (Midjourney, FLUX, etc.) se apoya en una capa conceptual de “percepción” y tokenización visual, más un mapeo espacial rígido y una heurística de ingeniería de prompts.

### 1. Percepción y tokenización visual

La imagen (o la escena que se va a generar) se trata como si pasara por un encoder visual (tipo CLIP o Vision Transformer). No solo se “ven” objetos, sino que se extraen descriptores de bajo nivel:

- **Distribución de frecuencias**: Para determinar nitidez y ruido → se traduce en `image_quality` en `technical_analysis`.
- **Vectores de color**: Centroides cromáticos en espacio HEX para definir la paleta dominante (cuando se usa; el schema actual no incluye `aesthetic_dna` en la salida, pero la heurística puede usarlos internamente).
- **Análisis de bordes y profundidad**: Para inferir si se usó lente gran angular (distorsión en bordes) o teleobjetivo (compresión de planos) → `camera_lens` en `technical_analysis`.

### 2. Mapeo espacial (sistema de grilla 3×3)

Para evitar inconsistencias espaciales típicas de las LLM, se usa una **matriz de coordenadas rígida (A1–C3)**:

- El canvas se divide en **9 sectores** (A1–A3 fila superior, B1–B3 central, C1–C3 inferior).
- Cada entidad detectada o definida se asigna a una **celda concreta** (`grid_location`, p. ej. `[B2]`, `[B1, B3, A2]`).
- Así los elementos no “flotan” sin contexto y, al reconstruir la imagen, el modelo generador sabe dónde colocar el **anchor point** de cada objeto.

Esto se refleja en el JSON en `composition_grid` (A1_A3_Upper_Third, B1_B3_Middle_Third, C1_C3_Lower_Third) y en `entities[].grid_location`.

### 3. Heurística de ingeniería de prompts (DNA estético)

Aquí se traduce “lo que se ve” (o lo que se quiere lograr) en “lo que un modelo de difusión necesita oír”:

- **Inferencia de medium**: Si se detectan grano de película y aberración cromática → salida tipo `"35mm Film"`. Si superficies lisas y polígonos → `"Digital Render"`. En el schema: `technical_analysis.medium`.
- **Pesos de prominencia**: Se asigna `prominence_weight` (0.0–1.0) según el área que ocupa el objeto y su contraste con el fondo, indicando al modelo cuál es el **sujeto principal** (`entities[].prominence_weight`).

### 4. Estructuración y serialización (JSON)

Toda esta metadata se mapea a un **esquema JSON estricto**. Motivos:

- **Interoperabilidad**: Fácil de parsear por otros agentes o scripts.
- **Densidad de información**: Se evita prosa innecesaria; se concentra en pares clave–valor que forman la “receta” visual.
- **Constraint enforcement**: Obliga a no alucinar: si existe el campo `camera_lens`, debe haber evidencia visual (real o inferida) para rellenarlo.

Schema: `meta_parameters`, `technical_analysis` (incl. `depth_of_field` cuando sea relevante), `aesthetic_dna` (cuando sea relevante: art_style_reference, dominant_colors_hex, key_visual_tokens, mood), `composition_grid`, `entities` (incl. `action_pose` cuando sea relevante), `generative_reconstruction` (midjourney_prompt, dalle_flux_natural_prompt). Se añaden/usan aesthetic_dna, depth_of_field y action_pose cuando aportan valor a la receta visual.

---

## Up-sampling semántico

Cuando el modelo recibe una frase o idea, debe actuar como **director de fotografía** y expandirla en cuatro dimensiones antes de rellenar el JSON.

### 1. Las cuatro dimensiones de expansión

| Dimensión | Pregunta clave | Ejemplo ("estresado") |
|-----------|----------------|------------------------|
| **Contexto narrativo** | ¿Qué rodea al sujeto? | Cables, tazas de café, pantallas con errores. |
| **Atmósfera técnica** | ¿Qué luz transmite la emoción? | Luces frías de monitores, sombras duras, alto contraste. |
| **Configuración de cámara** | ¿Qué lente refuerza la sensación? | 35mm para ver el desorden alrededor (sentir atrapado). |
| **Cromatismo** | ¿Qué colores refuerzan la idea? | Azules fríos (tecnología), rojos (alerta/error). |

### 2. Parámetros técnicos críticos (diccionario interno)

Para que el JSON sea útil para un modelo de difusión, no se puede ser vago. El modelo debe usar un "diccionario" interno de estilos:

| Campo | Qué tener en cuenta |
|-------|----------------------|
| **Medium** | Define si es "Digital Render" (Unreal Engine 5) o "Film Photography". Cambia radicalmente las texturas. → `technical_analysis.medium` |
| **Lighting** | Términos concretos: Rembrandt lighting, Volumetric fog, Cyberpunk neon-noir. → `technical_analysis.lighting_type` |
| **Grid (3×3)** | Obligatorio: sujeto principal en [B2] (centro) o [B1]/[B3] (regla de tercios). → `entities[].grid_location` |
| **Weighting** | Valores altos (0.8+) a lo que define la escena; bajos (0.3) a detalles de atmósfera. → `entities[].prominence_weight` |

### 3. Estructura del system prompt (configuración de la API)

Para obtener el formato JSON exacto, el **System Message** debe ser restrictivo:

- **System Role**: "Eres un Visual Architect JSON. Tu tarea es recibir una idea simple y devolver un objeto JSON estructurado siguiendo el esquema IMG-2-JSON-V3. No hables, solo genera JSON."
- **Instrucciones de lógica**:
  - **Analiza la emoción**: Si la idea es "triste" → paletas de azules y lentes con poca profundidad de campo (f/1.8). Si es "estrés" → 35mm, luces frías, alto contraste.
  - **Composición**: Distribuir los elementos en la grilla 3×3 (A1–C3).
  - **Generación de prompts**: Traducir toda la metadata técnica en un prompt final para Midjourney (con --ar, --v 6.0) y otro descriptivo para Flux/DALL·E.

### 4. Ejemplo de flujo de generación

**Input del usuario**: "Un astronauta perdido en un jardín de flores gigantes".

Lógica interna que debe disparar el JSON:

- **Estilo / mood**: "Surrealismo botánico", "Dreamy core" (se refleja en medium y en los prompts).
- **Colores**: #FF00FF (magenta), #00FF00 (verde ácido) — si se usan referencias cromáticas; en el schema actual van implícitos en la descripción o en el prompt final.
- **Cámara**: "Wide Angle" para captar la escala de las flores. → `technical_analysis.camera_lens`
- **Entities**:
  - obj_01: Astronauta en [C2] (pequeño, mirando hacia arriba). prominence_weight alto.
  - obj_02: Flores gigantes en [A1, A2, A3] (envolviendo la escena). prominence_weight medio/alto.

### 5. Cómo "coser" el prompt final (generative_reconstruction)

En `generative_reconstruction` se concatena la metadata en dos formatos:

- **Midjourney**:  
  `[Medium] + [Subject] + [Environment] + [Lighting] + [Technical Tags] + --ar [Ratio] --v 6.0 --style raw`

- **Flux / DALL·E**:  
  Narrativa natural que explique la **relación física** entre elementos:  
  *"The astronaut stands small in the bottom center, looking up at towering bioluminescent flowers that fill the upper frame..."*

El modelo (o la función que construye el prompt) debe tomar los campos del JSON y ensamblarlos según estas reglas para que el generador de imágenes reciba una “receta” clara y reproducible.

---

## Regla de idioma (obligatoria)

- **Prompts internos en inglés**: Todas las instrucciones del sistema y los mensajes de usuario hacia el LLM están redactados en inglés (Sales angles, Creative image prompt / art director, Visual Architect IMG-2-JSON-V3, expandIdeaToVisualSpec, expandAngleToVisualSpec).
- **Contenido final de anuncios en idioma de la web**: El texto visible en los anuncios (headlines, hooks, copy en imágenes) debe estar siempre en el **idioma principal de la web**, nunca en otro idioma.
- **Fallback de idioma**: Si no se especifica idioma, se usa **es-AR** (español Argentina).
- **Prohibición**: No mostrar texto de anuncios (headlines, hooks, descripciones visibles) en un idioma distinto al idioma objetivo (contentLanguage).

### Dónde se aplica

| Componente | System / user | Copy visible (title, description, hook, headline) | Visual / técnico |
|-----------|----------------|---------------------------------------------------|------------------|
| Sales angles | Inglés | contentLanguage | visual siempre en inglés |
| Creative image prompt (art director) | Inglés | contentLanguage; regla explícita de idioma del copy | — |
| Visual Architect (IMG-2-JSON-V3) | System en inglés; ejemplos de mood en inglés | "Target content language" en user message | Inglés |
| expandIdeaToVisualSpec | User message en inglés | contentLanguage (options.contentLanguage o options.branding) | — |
| expandAngleToVisualSpec | User message en inglés | headline = hook (ya en idioma correcto); "do not translate" | Inglés |

### Helper y uso en controller

- **getContentLanguage(brandingOrLang)** en `llm.service.js`: devuelve `branding.language` o el string recibido; si falta, `"es-AR"`.
- En el controller, en todas las llamadas a `generateHeadlines`, `generateSalesAngles` y `generateCreativeImagePrompt` se pasa `contentLanguage: branding?.language || "es-AR"` y `branding` cuando aplica.
- Al crear workspace, el branding normalizado guarda `language: llmRefined?.language ?? branding?.language ?? "es-AR"` (fallback es-AR, no "es").
