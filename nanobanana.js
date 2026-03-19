// script.js
// Jalankan: node script.js [path_gambar] [prompt] [--proxy url_proxy]

const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Konstanta AES
const AES_KEY = "ai-enhancer-web__aes-key";
const AES_IV = "aienhancer-aesiv";

/**
 * Enkripsi settings object
 */
function encryptSettings(settings) {
    const key = CryptoJS.enc.Utf8.parse(AES_KEY);
    const iv = CryptoJS.enc.Utf8.parse(AES_IV);
    return CryptoJS.AES.encrypt(
        JSON.stringify(settings),
        key,
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    ).toString();
}

/**
 * Konversi file gambar ke Data URL
 */
function imageFileToDataUrl(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else throw new Error('Format gambar tidak didukung. Gunakan jpg, png, atau webp.');

    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Minta input dari terminal
 */
function promptUser(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

/**
 * Parsing argumen command line
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let imagePath = null;
    let promptText = null;
    let proxyUrl = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--proxy' || args[i] === '-p') {
            proxyUrl = args[++i];
        } else if (!imagePath) {
            imagePath = args[i];
        } else if (!promptText) {
            promptText = args[i];
        }
    }
    return { imagePath, promptText, proxyUrl };
}

/**
 * Buat task enhancement dengan proxy yang benar
 */
async function createEnhancementTask(base64Image, settings, proxyUrl) {
    const url = 'https://aienhancer.ai/api/v1/r/image-enhance/create';
    const payload = {
        model: 2,
        image: [base64Image],
        function: 'ai-image-editor',
        settings: encryptSettings(settings)
    };

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 16; ASUS_AI2401_A Build/BP2A.250605.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36',
        'Origin': 'https://aienhancer.ai',
        'Referer': 'https://aienhancer.ai/ai-image-editor',
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Android WebView";v="134"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'mark.via.gp'
    };

    // Konfigurasi axios dengan proxy
    const config = {
        headers,
        timeout: 30000 // 30 detik timeout
    };

    if (proxyUrl) {
        // Untuk koneksi HTTPS melalui proxy HTTP, kita perlu HttpsProxyAgent
        // Tapi proxyUrl adalah http://, jadi kita buat agent khusus
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent; // untuk jaga-jaga
        config.proxy = false; // nonaktifkan proxy bawaan axios
    }

    try {
        console.log('Mengirim request ke API...');
        const response = await axios.post(url, payload, config);
        
        if (response.data.code !== 100000) {
            throw new Error(`API error: ${response.data.message}`);
        }
        return response.data.data.id;
    } catch (error) {
        if (error.response) {
            // Server merespon dengan status error
            throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}\n${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            // Request dibuat tapi tidak ada respon
            throw new Error(`Tidak ada respon dari server: ${error.message}`);
        } else {
            // Error saat setup request
            throw error;
        }
    }
}

/**
 * Polling hasil task
 */
async function pollEnhancementResult(taskId, proxyUrl, interval = 2000, timeout = 60000) {
    const url = 'https://aienhancer.ai/api/v1/r/image-enhance/result';
    const start = Date.now();
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 16; ASUS_AI2401_A Build/BP2A.250605.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.135 Mobile Safari/537.36',
        'Origin': 'https://aienhancer.ai',
        'Referer': 'https://aienhancer.ai/ai-image-editor',
        'Accept': '*/*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'x-requested-with': 'mark.via.gp'
    };

    const config = { headers };
    if (proxyUrl) {
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
        config.proxy = false;
    }

    let attempts = 0;
    while (Date.now() - start < timeout) {
        attempts++;
        try {
            console.log(`Polling attempt ${attempts}...`);
            const response = await axios.post(url, { task_id: taskId }, config);
            
            if (response.data.code !== 100000) {
                throw new Error(`API error: ${response.data.message}`);
            }

            const task = response.data.data;
            console.log('Status:', task.status || 'processing');
            
            if (task.status === 'succeeded') {
                return task.output;
            }
            if (task.status === 'failed') {
                throw new Error(`Task failed: ${task.error || 'Unknown error'}`);
            }
            
        } catch (error) {
            if (error.response) {
                console.log(`Polling error (${error.response.status}): ${error.response.statusText}`);
            } else {
                console.log(`Polling error: ${error.message}`);
            }
            // Lanjut polling meskipun error
        }

        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Polling timeout setelah ' + (timeout/1000) + ' detik');
}

/**
 * Cek koneksi proxy
 */
async function testProxyConnection(proxyUrl) {
    try {
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        const response = await axios.get('https://ifconfig.me', {
            httpsAgent: proxyAgent,
            proxy: false,
            timeout: 10000
        });
        console.log('✅ Proxy berfungsi. IP:', response.data.trim());
        return true;
    } catch (error) {
        console.log('❌ Proxy tidak berfungsi:', error.message);
        return false;
    }
}

/**
 * Fungsi utama
 */
async function main() {
    try {
        const { imagePath: argImage, promptText: argPrompt, proxyUrl } = parseArgs();

        if (proxyUrl) {
            // Sembunyikan password saat ditampilkan
            const maskedProxy = proxyUrl.replace(/:([^@]+)@/, ':****@');
            console.log(`Menggunakan proxy: ${maskedProxy}`);
            
            // Test proxy dulu
            console.log('Mengecek koneksi proxy...');
            const proxyOk = await testProxyConnection(proxyUrl);
            if (!proxyOk) {
                console.log('Lanjutkan tanpa proxy? (y/n)');
                // Dalam script otomatis, kita lanjutkan saja
            }
        }

        let imagePath = argImage;
        let promptText = argPrompt;

        if (!imagePath) {
            imagePath = await promptUser('Masukkan path gambar: ');
        }
        if (!promptText) {
            promptText = await promptUser('Masukkan prompt edit (contoh: "Make it cyberpunk style"): ');
        }

        // Validasi file exists
        if (!fs.existsSync(imagePath)) {
            throw new Error(`File tidak ditemukan: ${imagePath}`);
        }

        console.log(`Membaca gambar: ${imagePath}`);
        const base64Image = imageFileToDataUrl(imagePath);
        console.log('Ukuran base64:', Math.round(base64Image.length / 1024), 'KB');

        const settings = {
            aspect_ratio: "match_input_image",
            output_format: "jpg",
            prompt: promptText
        };

        console.log('Membuat task enhancement...');
        const taskId = await createEnhancementTask(base64Image, settings, proxyUrl);
        console.log('✅ Task ID:', taskId);

        console.log('Menunggu hasil... (polling setiap 2 detik)');
        const resultUrl = await pollEnhancementResult(taskId, proxyUrl);
        console.log('\n✅ Gambar hasil edit:');
        console.log(resultUrl);
        
        // Bisa langsung download? Terserah user
        console.log('\nDownload dengan: curl -o hasil.jpg "' + resultUrl + '"');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

if (require.main === module) {
    main();
}