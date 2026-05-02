const fs = require('fs');
require('dotenv').config();

const targetPath = './src/environments/environment.ts';
const dirPath = './src/environments';

// Create environments directory if it doesn't exist
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Generate the environment file content based on Vercel's injected process.env
const envConfigFile = `export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL || ''}',
    key: '${process.env.SUPABASE_KEY || ''}'
  }
};
`;

// Write the file
fs.writeFileSync(targetPath, envConfigFile);
console.log(`Environment file generated dynamically at ${targetPath}`);
