import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

// Esto arregla los problemas de "CORS" (para que tu Angular desde otro lugar pueda acceder sin bloqueos)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejo de petición "OPTIONS" para CORS (fundamental para navegadores)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Aquí recibiremos la palabra o instrucción desde Angular
    const { action, word, primaryTranslation } = await req.json()
    
    // Aquí manda a traer tu API Key de los secretos mágicos de Supabase
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('No se encontró la API Key de Gemini configurada secretamente en Supabase.')
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let resultText = "";

    // Acción 1: Solo traducir la palabra
    if (action === 'translate') {
      const prompt = `Traduce la palabra o frase en inglés "${word}" al español de la forma más natural y usada comúnmente en conversaciones con respecto a su significado. 
Responde ÚNICAMENTE con la traducción en español, sin comillas, signos de puntuación extra, sin pronunciación ni explicaciones de ningún tipo. Solo el texto en español.`;
      
      const result = await model.generateContent(prompt);
      resultText = result.response.text().trim();
      
      return new Response(JSON.stringify({ text: resultText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    // Acción 2: Generar detalle (el JSON)
    } else if (action === 'details') {
      const prompt = `Actúa como un profesor nativo de inglés.
Considera la palabra/frase en inglés: "${word}".
Su significado principal en español es "${primaryTranslation}".

Proporciona EXACTAMENTE un objeto JSON válido, sin comillas invertidas de markdown y sin ningún otro texto explicativo, con las siguientes propiedades:
1. "secondaryMeaning": Un segundo significado, uso común, sinónimo o acepción popular que tenga en español (diferente al principal), que sea muy conciso. (Máximo 2-4 palabras).
2. "sentence": Una oración completa que muestre cómo usar esa palabra en inglés, adecuada para nivel B1 (intermedio), con contexto natural y claro.

Formato requerido estricto:
{"secondaryMeaning": "...", "sentence": "..."}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = text.substring(jsonStart, jsonEnd);
        return new Response(jsonStr, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('Error al decodificar formato de Gemini.');
    }

    throw new Error('No seleccionaste la acción correcta (translate o details).');

  } catch (error) {
    // Si algo estalla, lo enviamos amablemente como JSON también
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
