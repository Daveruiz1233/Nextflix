import fs from 'fs';
import path from 'path';

// This script converts our AdGuard domains into the WKContentRuleList JSON format for iOS
async function generateRules() {
    const filterPath = path.join(process.cwd(), 'public', 'filter.bin');
    if (!fs.existsSync(filterPath)) {
        console.error('filter.bin not found. Run update-filters.mjs first.');
        return;
    }

    // For iOS, we want to generate a list of the TOP ad domains to block
    // We'll extract them from the same sources as update-filters.mjs
    const sources = [
        'https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt'
    ];

    let domains = [];
    for (const url of sources) {
        console.log(`Downloading rules from ${url}...`);
        const res = await fetch(url);
        const text = await res.text();
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('||') && line.endsWith('^')) {
                const domain = line.slice(2, -1);
                domains.push(domain);
            }
        }
    }

    // Apple has limits (around 50k rules per list)
    // We'll take the first 40k to be safe and performant
    const limitedDomains = domains.slice(0, 40000);

    const rules = limitedDomains.map(domain => ({
        trigger: {
            'url-filter': domain.replace('.', '\\.'),
            'load-type': ['third-party']
        },
        action: {
            type: 'block'
        }
    }));

    const iosPath = path.join(process.cwd(), 'ios', 'App', 'App', 'adblock-rules.json');
    const androidPath = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets', 'adblock-rules.json');

    // Ensure directories exist
    [path.dirname(iosPath), path.dirname(androidPath)].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    fs.writeFileSync(iosPath, JSON.stringify(rules, null, 2));
    fs.writeFileSync(androidPath, JSON.stringify(rules, null, 2));

    console.log(`✅ Generated ${rules.length} native blocking rules.`);
}

generateRules();
