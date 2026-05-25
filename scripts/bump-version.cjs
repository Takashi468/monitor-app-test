const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Error: No version number provided.');
  console.error('Usage: bun run bump <new-version>  OR  npm run bump <new-version>  OR  node scripts/bump-version.cjs <new-version>');
  console.error('Example: bun run bump 0.2.1');
  process.exit(1);
}

// Simple semver regex validation (e.g., 1.2.3 or 1.2.3-beta.0)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
if (!semverRegex.test(newVersion)) {
  console.error(`Error: "${newVersion}" is not a valid semver version (e.g., 0.1.1, 1.0.0-beta.1).`);
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');

console.log(`Bumping version to ${newVersion}...`);

let success = true;

// Helper to update JSON files
function updateJsonFile(filePath, key, value) {
  if (fs.existsSync(filePath)) {
    try {
      console.log(`Updating ${path.relative(projectRoot, filePath)}...`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      data[key] = value;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    } catch (err) {
      console.error(`Error updating ${path.relative(projectRoot, filePath)}:`, err.message);
      success = false;
    }
  } else {
    console.warn(`Warning: ${path.relative(projectRoot, filePath)} not found!`);
  }
}

// Helper to update Cargo.toml
function updateCargoToml(filePath, newVersion) {
  if (fs.existsSync(filePath)) {
    try {
      console.log(`Updating ${path.relative(projectRoot, filePath)}...`);
      let content = fs.readFileSync(filePath, 'utf8');
      // Replace the first occurrence of version = "..." under [package]
      const versionRegex = /^version\s*=\s*"[^"]*"/m;
      if (versionRegex.test(content)) {
        content = content.replace(versionRegex, `version = "${newVersion}"`);
        fs.writeFileSync(filePath, content, 'utf8');
      } else {
        console.error(`Error: Could not find version line under [package] in ${path.relative(projectRoot, filePath)}`);
        success = false;
      }
    } catch (err) {
      console.error(`Error updating ${path.relative(projectRoot, filePath)}:`, err.message);
      success = false;
    }
  } else {
    console.warn(`Warning: ${path.relative(projectRoot, filePath)} not found!`);
  }
}

// 1. Update package.json
updateJsonFile(path.join(projectRoot, 'package.json'), 'version', newVersion);

// 2. Update src-tauri/tauri.conf.json
updateJsonFile(path.join(projectRoot, 'src-tauri', 'tauri.conf.json'), 'version', newVersion);

// 3. Update src-tauri/Cargo.toml
updateCargoToml(path.join(projectRoot, 'src-tauri', 'Cargo.toml'), newVersion);

if (success) {
  console.log(`\nVersion updated successfully to ${newVersion}!`);
  console.log(`Don't forget to commit your changes.`);
} else {
  console.error(`\nFailed to update some version files. Please check the errors above.`);
  process.exit(1);
}
