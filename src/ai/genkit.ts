import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Specifying versions is optional, but can be useful for stability.
      // We can define multiple models with different configurations.
    }),
  ],
  // The default model used when no model is specified in a request.
  model: 'googleai/gemini-2.5-flash',
  // The default embedder used when no embedder is specified.
  embedder: 'googleai/text-embedding-004',
});

// We can also define other models to be used explicitly in our flows.
export const searchModel = googleAI.model('gemini-2.5-flash-lite');
