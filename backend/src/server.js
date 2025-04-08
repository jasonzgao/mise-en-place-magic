require('dotenv').config();
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
    
    // Log the request (in production you would use a proper logging service)
    console.log(`Processing recipe request: ${title}`);
    
    // Create prompt for OpenAI
    const prompt = `
      I need help with mise-en-place instructions for this recipe:
      
      Title: ${title || 'Untitled Recipe'}
      ${times ? `Times: ${times}` : ''}
      
      Ingredients:
      ${ingredients.join('\n')}
      
      Instructions:
      ${instructions.join('\n')}
      
      Please provide a step-by-step mise-en-place guide that:
      1. Minimizes the number of prep bowls needed
      2. Groups ingredients that will be added together
      3. Specifies which ingredients need to be chopped, minced, etc.
      4. Provides the most efficient prep order
      5. Considers timing to maximize efficiency
      
      Format your response as a clear, numbered list of mise-en-place steps with groups of ingredients.
    `;
    
    // Call OpenAI API with retry mechanism
    let attempt = 0;
    let completion;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a professional chef specializing in mise-en-place organization." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7,
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
    
    // Extract and send response
    const miseEnPlaceInstructions = completion.choices[0].message.content;
    
    // Cache the result (in a production app you would use Redis or another caching solution)
    // This is just a placeholder for the concept
    
    res.json({ miseEnPlaceInstructions });
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