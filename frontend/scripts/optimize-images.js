const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  const directories = [
    path.join(__dirname, '../public/img'),
    path.join(__dirname, '../public/img/nav'),
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      console.log(`⚠️  Skipping ${dir} (not found)`);
      continue;
    }
    
    console.log(`\n📁 Processing: ${dir}`);
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      if (file.endsWith('.png')) {
        const inputPath = path.join(dir, file);
        const outputPath = path.join(dir, file.replace('.png', '.webp'));
        
        console.log(`Converting ${file}...`);
        
        try {
          await sharp(inputPath)
            .webp({ quality: 85, effort: 6 })
            .toFile(outputPath);
          
          const originalSize = fs.statSync(inputPath).size;
          const optimizedSize = fs.statSync(outputPath).size;
          const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
          
          console.log(`✅ ${file} → ${file.replace('.png', '.webp')}`);
          console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB`);
          console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)}KB`);
          console.log(`   Saved: ${savings}%\n`);
        } catch (error) {
          console.error(`❌ Error converting ${file}:`, error.message);
        }
      }
    }
  }
  
  console.log('✅ All images optimized!');
}

optimizeImages().catch(console.error);

