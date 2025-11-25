import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let localImageCache = null;

// Helper: Generate Koei-style Avatar URL based on attributes
export const getAvatarUrl = (name, stars, country, keywords) => {
    // 0. Check Local Custom Image (Project Root / public / images)
    try {
        const imageDir = path.resolve(__dirname, '../../public/images');
        
        // Load cache if empty
        if (!localImageCache || localImageCache.length === 0) {
            if (fs.existsSync(imageDir)) {
                localImageCache = fs.readdirSync(imageDir);
                console.log(`[DB] Image Cache Loaded: ${localImageCache.length} files from ${imageDir}`);
            } else {
                console.log(`[DB] Image directory not found at ${imageDir}`);
                localImageCache = [];
            }
        }

        if (localImageCache && localImageCache.length > 0) {
            const normalizedName = name.trim().normalize('NFC');
            
            // Find a file that matches the general's name
            // Format is typically: "id_name_index.jpg" (e.g. 0002_关羽_1.jpg)
            const match = localImageCache.find(f => {
                const fName = f.normalize('NFC');
                
                // Quick check: filename must contain the name
                if (!fName.includes(normalizedName)) return false;
                
                // Strict check: Split by '_' and ensure one part equals the name exactly
                // This handles "0002_关羽_1.jpg" matching "关羽" correctly
                const parts = fName.split('_');
                return parts.some(part => {
                    // Remove extension if it's the last part (e.g. "关羽.jpg")
                    const cleanPart = part.replace(/\.[^/.]+$/, "");
                    return cleanPart === normalizedName;
                });
            });
            
            if (match) {
                console.log(`[DB] Found local image for ${name}: ${match}`);
                // Encode the filename to handle Chinese characters in URLs properly
                return `/api/images/${encodeURIComponent(match)}`;
            }
        }
    } catch (e) {
        console.error('[DB] Error checking local images:', e);
    }

    // 1. Country Theme Colors & Atmosphere (Fallback to AI)
    let theme = '';
    switch(country) {
        case '魏': 
            theme = 'main color majestic blue and purple, cold winter atmosphere, imposing palace background, noble aura'; 
            break;
        case '蜀': 
            theme = 'main color emerald green and gold, warm sunlight, bamboo forest or mountain background, benevolent aura'; 
            break;
        case '吴': 
            theme = 'main color crimson red and gold, fire particles, yangtze river background, fierce heroic aura'; 
            break;
        case '群': 
            theme = 'main color dark grey and black iron, chaotic battlefield smoke background, intimidating warlord aura'; 
            break;
        default:
            theme = 'ancient chinese warrior style';
    }

    // 2. Star Rating Quality & Detail Level
    let quality = '';
    switch(stars) {
        case 5: 
            quality = 'legendary masterpiece, god ray lighting, extremely intricate ornate armor with gold trim, glowing eyes, hyper-detailed face, 8k resolution, cinematic depth of field'; 
            break;
        case 4: 
            quality = 'epic hero portrait, highly detailed ornate armor, sharp focus, dynamic dramatic lighting, 4k resolution'; 
            break;
        case 3: 
            quality = 'veteran general, battle-worn realistic armor, gritty texture, serious expression, realistic lighting'; 
            break;
        default: 
            quality = 'common soldier, simple leather and iron armor, rough texture, muted colors'; 
            break;
    }

    // 3. Construct Prompt
    const prompt = encodeURIComponent(`Portrait of ${keywords}, ${name}, ${theme}, ${quality}, Koei Romance of the Three Kingdoms XIV art style, oil painting texture, hyper-realistic face`);
    
    // 4. Stable Seed based on name
    const seed = name.split('').reduce((a,b)=>a+b.charCodeAt(0), 0);
    
    return `https://image.pollinations.ai/prompt/${prompt}?width=300&height=450&nologo=true&seed=${seed}&model=flux`;
};
