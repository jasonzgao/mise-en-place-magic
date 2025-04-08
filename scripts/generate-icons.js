const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Ensure the script can be run from anywhere
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'src', 'images', 'icon.svg');
const outputDir = path.join(rootDir, 'src', 'images');

// Icon sizes needed for Chrome extension
const sizes = [16, 48, 128];

// Check if convert (ImageMagick) is installed
exec('which convert', (error) => {
  if (error) {
    console.error('Error: ImageMagick is not installed. Please install it first.');
    console.error('For Mac: brew install imagemagick');
    console.error('For Ubuntu: sudo apt-get install imagemagick');
    process.exit(1);
  }

  // Check if SVG file exists
  if (!fs.existsSync(svgPath)) {
    console.error(`Error: SVG file not found at ${svgPath}`);
    process.exit(1);
  }

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Convert SVG to PNG for each size
  sizes.forEach(size => {
    const outputPath = path.join(outputDir, `icon${size}.png`);
    
    // Use ImageMagick to convert SVG to PNG
    const command = `convert -background none -size ${size}x${size} ${svgPath} ${outputPath}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating ${size}x${size} icon:`, error);
        return;
      }
      
      if (stderr) {
        console.error(`Warning for ${size}x${size} icon:`, stderr);
        return;
      }
      
      console.log(`Created ${size}x${size} icon at ${outputPath}`);
    });
  });

  console.log('Icon generation process initiated. Please wait...');
}); 