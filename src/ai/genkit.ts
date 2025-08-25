import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// IMPORTANT: You must add GOOGLE_API_KEY="your-api-key" to a .env file in the root
// of this project for the AI features to work.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});
