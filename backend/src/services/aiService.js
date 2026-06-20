const path = require('path');
const OpenAI = require('openai');
const { ESLint } = require('eslint');
const ChatMessage = require('../models/chatMessage');
const fileService = require('./fileService');
const processManager = require('./processManager');

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const MODELS = {
  pro: process.env.DEEPSEEK_MODEL_PRO || 'deepseek-v4-pro',
  flash: process.env.DEEPSEEK_MODEL_FLASH || 'deepseek-v4-flash',
};

let client = null;
function getClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw httpError('Falta DEEPSEEK_API_KEY en backend/.env para usar el asistente.', 400);
  }
  if (!client) {
    // DeepSeek expone una API compatible con OpenAI; reutilizamos el SDK oficial.
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// PATRONES DE PROMPT (Spring AI): role prompting + salida estructurada +
// abstención (anti-alucinación) + few-shot.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres NodePilot, un asistente experto en el ecosistema Node.js: Express.js, APIs REST, middleware, rutas, Sequelize, MySQL, JWT y WebSockets.

REGLAS:
- Respondes SIEMPRE en español.
- Generas código idiomático y moderno de Node.js (CommonJS, salvo que pidan ES Modules).
- ABSTENCIÓN: si la petición sale del ecosistema Node.js, o no tienes información suficiente, dilo con honestidad en "explanation" y NO inventes APIs, paquetes ni comportamientos.
- SALIDA: respondes EXCLUSIVAMENTE con un objeto JSON válido. Nada de texto fuera del JSON, nada de fences \`\`\`.

FORMATO JSON EXACTO:
{
  "explanation": "explicación breve en español de lo que hiciste o tu respuesta directa",
  "files": [ { "path": "ruta/relativa.js", "content": "contenido COMPLETO del archivo" } ],
  "notes": "advertencias o siguientes pasos (opcional, puede ser cadena vacía)"
}

- Si solo responden a una pregunta sin crear/editar archivos, deja "files": [].
- En "content" va SIEMPRE el archivo completo, jamás fragmentos ni "...".
- Usa rutas relativas a la raíz del proyecto (ej: "src/index.js", "package.json").`;

// Few-shot: ancla el formato y el estilo esperado.
const FEW_SHOT = [
  {
    role: 'user',
    content: 'Crea una ruta Express GET /ping que responda "pong" en un archivo src/routes/ping.js',
  },
  {
    role: 'assistant',
    content: JSON.stringify({
      explanation:
        'Creé un router de Express con la ruta GET /ping que responde "pong". Móntalo en tu app con app.use(require("./routes/ping")).',
      files: [
        {
          path: 'src/routes/ping.js',
          content:
            "const express = require('express');\nconst router = express.Router();\n\nrouter.get('/ping', (req, res) => {\n  res.send('pong');\n});\n\nmodule.exports = router;\n",
        },
      ],
      notes: '',
    }),
  },
];

// ---------------------------------------------------------------------------
// Validación de código (grounding empírico anti-alucinación)
// ---------------------------------------------------------------------------

const ESLINT_CONFIG = {
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'commonjs',
    globals: {
      require: 'readonly',
      module: 'readonly',
      exports: 'readonly',
      process: 'readonly',
      console: 'readonly',
      __dirname: 'readonly',
      __filename: 'readonly',
      Buffer: 'readonly',
      global: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      setImmediate: 'readonly',
    },
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'off',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-const-assign': 'error',
  },
};

async function validateFiles(files) {
  const report = [];
  let eslint;
  try {
    eslint = new ESLint({ overrideConfigFile: true, overrideConfig: ESLINT_CONFIG });
  } catch {
    return report; // si ESLint no inicializa, no bloqueamos la generación
  }
  for (const f of files || []) {
    if (!f || !f.path) continue;
    if (f.path.endsWith('.json')) {
      try {
        JSON.parse(f.content);
      } catch (e) {
        report.push({ path: f.path, errors: [`JSON inválido: ${e.message}`] });
      }
      continue;
    }
    if (!/\.(js|jsx|mjs|cjs)$/.test(f.path)) continue;
    try {
      const res = await eslint.lintText(f.content, { filePath: f.path });
      const errs = (res[0]?.messages || [])
        .filter((m) => m.severity === 2 || m.fatal)
        .map((m) => `L${m.line || 0}: ${m.message}${m.ruleId ? ` (${m.ruleId})` : ''}`);
      if (errs.length) report.push({ path: f.path, errors: errs });
    } catch {
      /* ignora fallos del linter para no romper el chat */
    }
  }
  return report; // [] = todo válido
}

// ---------------------------------------------------------------------------
// Parseo robusto de la respuesta del modelo
// ---------------------------------------------------------------------------

function repairJson(s) {
  if (!s) return '';
  s = s.trim();

  let inString = false;
  let escaped = false;
  let result = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && !escaped) {
      inString = !inString;
    }
    
    if (inString) {
      if (c === '\n') {
        result += '\\n';
      } else if (c === '\r') {
        result += '\\r';
      } else if (c === '\t') {
        result += '\\t';
      } else {
        result += c;
      }
    } else {
      result += c;
    }

    if (c === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  s = result;

  // Quitar comas sobrantes antes de cerrar llaves o corchetes
  s = s.replace(/,(\s*[\]\}])/g, '$1');

  return s;
}

function extractJsonBlock(text) {
  // Busca el inicio de un objeto JSON que contenga las claves esperadas
  const startIdx = text.search(/\{\s*"(explanation|files|notes)"/i);
  if (startIdx === -1) return null;
  
  let braceCount = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    
    if (c === '"' && !escaped) {
      inString = !inString;
    }
    
    if (!inString) {
      if (c === '{') {
        braceCount++;
      } else if (c === '}') {
        braceCount--;
        if (braceCount === 0) {
          return text.substring(startIdx, i + 1);
        }
      }
    }
    
    if (c === '\\' && !escaped) {
      escaped = true;
    } else {
      escaped = false;
    }
  }
  
  return null;
}

function parseJson(text) {
  if (!text) return null;

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      try {
        return JSON.parse(repairJson(s));
      } catch {
        return null;
      }
    }
  };

  // 1. Intentar parsear el texto completo
  let p = tryParse(text);
  if (p) return p;

  // 2. Intentar buscar bloques markdown ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    p = tryParse(fence[1]);
    if (p) return p;
  }

  // 3. Intentar extraer mediante balanceo inteligente de llaves
  const block = extractJsonBlock(text);
  if (block) {
    p = tryParse(block);
    if (p) return p;
  }

  // 4. Fallback al regex tradicional de llaves si el inteligente falló
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    p = tryParse(brace[0]);
    if (p) return p;
  }

  return null;
}

async function callAndParse(modelKey, messages) {
  const completion = await getClient().chat.completions.create({
    model: MODELS[modelKey] || MODELS.flash,
    messages,
    temperature: 0.2,
    max_tokens: 8192,
  });
  const text = completion.choices?.[0]?.message?.content || '';
  const parsed = parseJson(text);
  if (!parsed) return { explanation: text || '(respuesta vacía)', files: [], notes: '' };
  return {
    explanation: parsed.explanation || '',
    files: Array.isArray(parsed.files) ? parsed.files.filter((f) => f && f.path) : [],
    notes: parsed.notes || '',
  };
}

// ---------------------------------------------------------------------------
// Autocompletado inline (ghost text estilo Copilot)
// Patrón FIM (Fill-In-the-Middle) sobre el endpoint chat: le damos el código
// ANTES y DESPUÉS del cursor y pedimos SOLO el fragmento que va en medio.
// Usa el modelo flash, temperatura baja y pocos tokens => rápido y barato.
// ---------------------------------------------------------------------------

const COMPLETION_SYSTEM = `Eres un motor de autocompletado de código integrado en un editor, como GitHub Copilot.
Devuelves EXCLUSIVAMENTE el fragmento de código que debe insertarse en la posición del cursor.
REGLAS ESTRICTAS:
- NADA de explicaciones, comentarios extra ni vallas de código markdown (\`\`\`).
- NO repitas el código que ya aparece antes del cursor.
- Continúa de forma natural e idiomática (Node.js/Express/Sequelize cuando aplique).
- Si no hay una continuación útil y segura, responde con una cadena vacía.
- Mantén la sugerencia breve: como mucho unas pocas líneas.`;

// Quita vallas markdown si el modelo las añade pese a las instrucciones.
function stripFences(s) {
  const m = s.match(/^```[a-zA-Z0-9]*\n?([\s\S]*?)\n?```$/);
  return m ? m[1] : s;
}

async function complete({ prefix = '', suffix = '', language = 'javascript', model = 'flash' }) {
  getClient(); // valida la API key
  const messages = [
    { role: 'system', content: COMPLETION_SYSTEM },
    {
      role: 'user',
      content: `Lenguaje: ${language}. Completa el código donde está «<CURSOR>». Devuelve SOLO el texto que va en <CURSOR>.\n\n${prefix}<CURSOR>${suffix}`,
    },
  ];
  const completion = await getClient().chat.completions.create({
    model: MODELS[model] || MODELS.flash,
    messages,
    temperature: 0.1,
    max_tokens: 96,
    stop: ['<CURSOR>'],
  });
  let text = completion.choices?.[0]?.message?.content || '';
  text = stripFences(text);
  return text;
}

// ---------------------------------------------------------------------------
// Historial (MySQL)
// ---------------------------------------------------------------------------

async function loadHistory(projectId, limit = 10) {
  try {
    const rows = await ChatMessage.findAll({
      where: { projectId },
      order: [['id', 'DESC']],
      limit,
    });
    return rows.reverse().map((r) => ({ role: r.role, content: r.content }));
  } catch {
    return []; // sin DB, el asistente sigue funcionando (sin memoria)
  }
}

async function saveMessage(projectId, role, content) {
  try {
    await ChatMessage.create({ projectId, role, content });
  } catch {
    /* sin persistencia si la DB no está */
  }
}

async function getHistory(projectId) {
  try {
    const rows = await ChatMessage.findAll({ where: { projectId }, order: [['id', 'ASC']] });
    return rows.map((r) => ({ role: r.role, content: r.content, createdAt: r.createdAt }));
  } catch {
    return [];
  }
}

// Borra el historial de un proyecto: empieza una conversación desde cero.
async function clearHistory(projectId) {
  try {
    await ChatMessage.destroy({ where: { projectId } });
  } catch {
    /* sin DB no hay nada que borrar; la UI se limpia igual */
  }
}

// Helper para obtener todo el contexto de código del workspace del proyecto
async function getWorkspaceContext(projectId) {
  try {
    const treeObj = await fileService.buildTree(projectId);
    const filesContext = [];

    const collect = async (items) => {
      for (const item of items) {
        if (item.type === 'file') {
          const ext = path.extname(item.name).toLowerCase();
          // Solo leemos archivos de código o configuración relevantes y evitamos binarios
          if (['.js', '.jsx', '.json', '.css', '.md', '.env', '.example'].includes(ext) || item.name.startsWith('.')) {
            try {
              const fileData = await fileService.readFile(projectId, item.path);
              // Limitar el tamaño de archivo individual a 20KB para evitar consumir demasiados tokens
              if (fileData.content.length < 20000) {
                filesContext.push({
                  path: item.path,
                  content: fileData.content
                });
              }
            } catch (e) {
              // Ignorar errores de lectura individuales
            }
          }
        } else if (item.children) {
          await collect(item.children);
        }
      }
    };

    await collect(treeObj.tree);
    return filesContext;
  } catch (err) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Orquestación del chat con bucle de autocorrección
// ---------------------------------------------------------------------------

async function chat({ projectId, message, model = 'flash', context }) {
  if (!message || !message.trim()) throw httpError('Mensaje vacío.', 400);
  getClient(); // valida la API key cuanto antes

  const history = await loadHistory(projectId);

  // Obtener los logs recientes de la terminal integrada del proyecto
  let terminalLogsDescription = '';
  try {
    const logs = processManager.getLogs(projectId) || [];
    if (logs.length > 0) {
      // Tomar las últimas 40 líneas de logs de la terminal para no saturar el contexto
      const recentLogs = logs.slice(-40);
      terminalLogsDescription = 'Logs recientes de la terminal integrada del proyecto:\n```\n' +
        recentLogs.map((l) => `[${l.stream}] ${l.line}`).join('') +
        '\n```\n';
    }
  } catch (err) {
    // Ignorar si falla
  }

  // Obtener contexto de los archivos en el workspace
  const workspaceFiles = await getWorkspaceContext(projectId);
  let workspaceDescription = '';
  if (workspaceFiles.length > 0) {
    workspaceDescription = 'Archivos del proyecto en el workspace:\n';
    for (const file of workspaceFiles) {
      if (context && context.path === file.path) continue; // no duplicar el archivo actual
      workspaceDescription += `\n--- Archivo: ${file.path} ---\n${file.content}\n`;
    }
  }

  let userContent = message;
  if (terminalLogsDescription) {
    userContent = `${terminalLogsDescription}\n${userContent}`;
  }
  if (workspaceDescription) {
    userContent = `${workspaceDescription}\n\n${userContent}`;
  }
  if (context && context.path && context.content) {
    userContent = `Archivo actual abierto en el editor (${context.path}):\n\`\`\`\n${context.content}\n\`\`\`\n\n${userContent}`;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...FEW_SHOT,
    ...history,
    { role: 'user', content: userContent },
  ];

  let result = await callAndParse(model, messages);
  let validation = await validateFiles(result.files);
  let corrected = 0;

  // Grounding empírico: si ESLint marca errores, se los devolvemos al modelo.
  while (validation.length && corrected < 2) {
    corrected++;
    const detail = validation
      .map((v) => `- ${v.path}:\n    ${v.errors.join('\n    ')}`)
      .join('\n');
    messages.push({ role: 'assistant', content: JSON.stringify(result) });
    messages.push({
      role: 'user',
      content: `ESLint encontró errores en el código que generaste. Corrígelos y devuelve el JSON completo de nuevo:\n${detail}`,
    });
    result = await callAndParse(model, messages);
    validation = await validateFiles(result.files);
  }

  await saveMessage(projectId, 'user', message);
  await saveMessage(projectId, 'assistant', result.explanation || '');

  return {
    explanation: result.explanation,
    files: result.files,
    notes: result.notes,
    validation, // [] = pasó; si trae items, quedaron errores tras los reintentos
    corrected, // nº de rondas de autocorrección aplicadas
    model,
  };
}

module.exports = { chat, complete, getHistory, clearHistory, validateFiles };
