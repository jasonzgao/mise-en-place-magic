# Backend Service for Mise en Place Magic

This directory contains starter code for a backend service to handle OpenAI API calls for the Mise en Place Magic Chrome extension.

## Why a Backend Service?

It's not secure to include API keys directly in a Chrome extension, as users could potentially extract the key. A backend service allows you to:

1. Keep your API key secure
2. Implement rate limiting
3. Add authentication
4. Cache responses to reduce API costs

## Sample Implementation

Below is a sample implementation using Express.js (Node.js):

1. Create a `.env` file with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

2. Install dependencies:
```
npm init -y
npm install express dotenv openai cors
```

## Deployment Options

You can deploy your backend service to:

- [Vercel](https://vercel.com)
- [Heroku](https://heroku.com)
- [Render](https://render.com)
- [AWS Lambda](https://aws.amazon.com/lambda/)
- [Google Cloud Functions](https://cloud.google.com/functions)

## Security Considerations

- Use HTTPS for all API calls
- Implement proper authentication (API keys, JWT tokens, etc.)
- Add rate limiting to prevent abuse
- Set appropriate CORS headers to restrict which domains can access your API 