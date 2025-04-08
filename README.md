# Mise en Place Magic

A Chrome extension that simplifies recipe webpages into a clean, minimalist canvas with intelligent mise-en-place instructions powered by OpenAI.

## Features

- **Automatic Recipe Detection**: The extension automatically detects when you're browsing a recipe webpage.
- **Clean Canvas Overlay**: Transform cluttered recipe pages into a clean, distraction-free canvas with one click.
- **Intelligent Mise-en-Place**: AI-generated guidance for efficient ingredient preparation, minimizing the number of prep bowls needed.
- **Simplified Recipe View**: See all important recipe information in one organized view without scrolling through walls of text.

## Installation

### Development Mode

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/mise-en-place-magic.git
   ```

2. Generate icons from the SVG (requires ImageMagick):
   ```
   cd mise-en-place-magic
   node scripts/generate-icons.js
   ```

3. Set up the backend:
   ```
   cd backend
   npm install
   cp .env.example .env
   ```

4. Edit the `.env` file to add your OpenAI API key.

5. Start the backend:
   ```
   npm start
   ```

6. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by toggling the switch in the top right corner
   - Click "Load unpacked" and select the root directory of this project

7. The extension should now be installed and visible in your Chrome toolbar

### Production Deployment

For a production-ready deployment:

1. **Deploy the Backend Service**:
   - Choose a hosting provider like Vercel, Render, Heroku, or AWS
   - Set the necessary environment variables including your OpenAI API key
   - Deploy the backend service from the `backend` directory

2. **Update the Backend URL**:
   - In `src/js/content.js`, update the `backendUrl` variable with your deployed backend URL

3. **Generate a production build**:
   - Ensure all icons are generated using the script
   - Package the extension for the Chrome Web Store

4. **Publish to Chrome Web Store**:
   - Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Follow their submission process to publish your extension

## Usage

1. Navigate to any recipe webpage
2. If the extension detects recipe content, the Mise en Place Magic icon will become active
3. Click the icon in your Chrome toolbar
4. Click the "Simplify Recipe" button in the popup
5. A clean canvas will slide in from the right with the simplified recipe and mise-en-place instructions
6. Use the "×" button or press Escape to close the canvas

## OpenAI API Setup

### Creating an API Key

1. Create an account at [OpenAI](https://platform.openai.com/)
2. Navigate to the [API Keys section](https://platform.openai.com/account/api-keys)
3. Click "Create new secret key"
4. Copy the generated key (you won't be able to see it again)
5. Add this key to your `.env` file in the backend directory

### Managing API Costs

The extension uses GPT-4 by default, which provides the best mise-en-place instructions but costs more. To reduce costs:

1. In `backend/src/server.js`, change the model from "gpt-4" to "gpt-3.5-turbo"
2. Implement caching to avoid repeated API calls for the same recipe
3. Consider implementing usage limits in your backend

## How It Works

1. **Recipe Detection**: The extension uses pattern matching and DOM analysis to detect recipe content.
2. **Data Extraction**: When a recipe is detected, it extracts title, times, ingredients, and instructions.
3. **AI Processing**: The data is sent to the backend, which uses OpenAI to generate mise-en-place instructions.
4. **Display**: Results are shown in a clean canvas overlay.

## Security Considerations

- API keys are stored only on the backend server, never in the extension code
- CORS protection limits which origins can access your backend
- Rate limiting prevents abuse
- Input validation guards against malicious inputs

## Backend Architecture

The backend is built with Express.js and includes:

- CORS protection
- Rate limiting
- Input validation
- Error handling
- Retry mechanism for API calls

## Customizing

### Styling

Modify `src/css/content.css` to change the appearance of the recipe canvas.

### Recipe Detection

Update the selectors in `src/js/content.js` to improve recipe detection for specific sites.

### OpenAI Prompt

Modify the prompt in `backend/src/server.js` to customize the mise-en-place instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the LICENSE file for details. 