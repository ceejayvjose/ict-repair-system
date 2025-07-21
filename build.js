const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Step 1: Build React app
console.log('Building React app...');
exec('npm run build', { cwd: path.join(__dirname, 'react-app') }, (err) => {
  if (err) {
    console.error('React build failed:', err);
    return;
  }

  console.log('React app built successfully.');

  // Step 2: Copy build to Electron folder
  const distPath = path.join(__dirname, 'react-app', 'dist');
  const electronDistPath = path.join(__dirname, 'ict-repair-desktop', 'dist');

  fs.rmSync(electronDistPath, { recursive: true, force: true });
  fs.cpSync(distPath, electronDistPath, { recursive: true });

  console.log('Build files copied to Electron app.');

  // Step 3: Build the Electron app
  console.log('Packaging Electron app...');
  exec('npm run build', { cwd: path.join(__dirname, 'ict-repair-desktop') }, (err) => {
    if (err) {
      console.error('Electron packaging failed:', err);
      return;
    }

    console.log('Electron app built successfully in dist-app/');
  });
});