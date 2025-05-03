require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const port = process.env.PORT || 3000;

console.log(process.env.OPENAI_API_KEY);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['chrome-extension://your-extension-id', 'http://localhost:3000'];

// Determine if we're in development mode (set this in .env)
const isDevelopment = process.env.NODE_ENV === 'development';

// Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    // Always log the request origin for debugging
    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    // In development mode, allow all origins
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to the API routes
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));

// Input validation middleware
const validateRecipeInput = (req, res, next) => {
  const { title, ingredients, instructions } = req.body;
  
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing ingredients array' });
  }
  
  if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
    return res.status(400).json({ error: 'Invalid or missing instructions array' });
  }
  
  // Limit the size of the input
  if (JSON.stringify(req.body).length > 100000) {
    return res.status(400).json({ error: 'Request payload too large' });
  }
  
  next();
};
// Route for generating mise-en-place instructions
app.post('/api/mise-en-place', validateRecipeInput, async (req, res) => {
  try {
    const { title, times, ingredients, instructions } = req.body;
    
    // Log the request
    console.log(`Processing recipe request: ${title}`);
    
    // Enhanced system prompt with clear output format requirements
    const systemPrompt = `You are a professional chef specializing in kitchen organization and efficiency. 
    Your task is to analyze recipes and provide two specific outputs:
    1. A complete list of ALL equipment needed to prepare and cook the recipe
    2. Precise mise-en-place instructions for efficient preparation. Additionally, the user should be able to seamlessly begin the first step in the provided instructions after finishing all of your generated mise-en-place instructions.

    Always structure your response in this exact format:
    ---EQUIPMENT---
    • [First piece of equipment]
    • [Second piece of equipment]
    • [Continue with all equipment needed]

    ---MISE-EN-PLACE---
    1. [First preparation step]
    2. [Second preparation step]
    3. [Continue with all preparation steps]

    Ensure every cooking vessel, tool, and utensil is included in the equipment list. Be comprehensive and specific (e.g., "small saucepan" instead of just "pan"). 
    Ensure every step in the mise-en-place instructions is comprehensive. Assume that the user is a beginner cook and explain exactly which container or bowl prepped ingredients go into.`;
    
    // Enhanced user prompt with more specific requirements
    const userPrompt = `
    Please analyze this recipe and provide both the equipment list and mise-en-place instructions:
    
    Title: ${title || 'Untitled Recipe'}
    ${times ? `Times: ${times}` : ''}
    
    Ingredients:
    ${ingredients.join('\n')}
    
    Instructions:
    ${instructions.join('\n')}
    
    For the equipment list:
    - Include ALL cooking vessels (pots, pans, baking sheets, etc.)
    - Include ALL utensils (spoons, whisks, spatulas, etc.)
    - Include ALL preparation tools (cutting boards, knives, graters, etc.)
    - Include ALL serving and measuring items (bowls, measuring cups, thermometers, etc.)
    - Be specific with sizes and types when the recipe indicates or implies them 
    
    For the mise-en-place instructions:
    1. Group ingredients into the same bowl/container if they'll be added together
    2. Specify prep work (chopping, mincing, measuring) for each ingredient
    3. Optimize to minimize the number of prep bowls
    4. List steps in the most efficient preparation order
    5. Consider timing to maximize efficiency.
    
    Remember to format your response with ---EQUIPMENT--- and ---MISE-EN-PLACE--- sections.`;
    
    // Call OpenAI API with retry mechanism
    let attempt = 0;
    let completion;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 2000, // Increased to accommodate both lists
          temperature: 0.5, // Reduced for more consistent, precise output
        });
        break; // Success, exit the loop
      } catch (error) {
        attempt++;
        console.error(`OpenAI API attempt ${attempt} failed:`, error);
        
        if (attempt >= maxAttempts) {
          throw error; // Re-throw after max attempts
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
    
    if (!completion) {
      throw new Error('Failed to get completion from OpenAI after multiple attempts');
    }
    
    // Extract and parse response
    const responseContent = completion.choices[0].message.content;
    
    // Parse the response to separate equipment list and mise-en-place instructions
    const equipmentMatch = responseContent.match(/---EQUIPMENT---([\s\S]*?)(?=---MISE-EN-PLACE---|$)/);
    const miseMatch = responseContent.match(/---MISE-EN-PLACE---([\s\S]*?)(?=$)/);
    
    const equipmentList = equipmentMatch ? equipmentMatch[1].trim() : '';
    const miseEnPlaceInstructions = miseMatch ? miseMatch[1].trim() : '';
    
    res.json({ 
      equipmentList,
      miseEnPlaceInstructions 
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Send an appropriate error message
    if (error.status === 429) {
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    } else {
      res.status(500).json({ error: 'Failed to generate mise-en-place instructions. Please try again.' });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

// Catch-all for 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app; // For testing 