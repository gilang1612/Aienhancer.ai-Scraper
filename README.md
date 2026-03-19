# Nanobanana

Script Nanobanana melalui aienhancer.ai API.

## Fitur

- Upload gambar (JPG, PNG, WEBP)
- Edit gambar dengan prompt teks
- Dukungan proxy untuk koneksi
- Polling otomatis hingga proses selesai
- Enkripsi AES untuk settings

## Instalasi

### Prasyarat

- Node.js terinstall
- npm (Node Package Manager)

### Install Dependencies

```bash
npm install crypto-js axios https-proxy-agent
```

## Cara Penggunaan

### Basic Usage

```bash
node nanobanana.js <path_gambar> "<prompt_edit>"
```

### Contoh

```bash
node nanobanana.js image.jpg "Make it cyberpunk style"
```

### Dengan Proxy

```bash
node nanobanana.js image.jpg "Make it cyberpunk style" --proxy http://user:pass@ip:port
```

### Interactive Mode

Jalankan tanpa argumen untuk mode interaktif:

```bash
node nanobanana.js
```

## Parameter

| Parameter | Deskripsi |
|-----------|-----------|
| `path_gambar` | Path ke file gambar (jpg, png, webp) |
| `prompt_edit` | Instruksi edit dalam bahasa Inggris |
| `--proxy, -p` | URL proxy (opsional) |

## Contoh Prompt

- "Make it cyberpunk style"
- "Convert to anime style"
- "Enhance quality and sharpness"
- "Add neon lighting effects"
- "Make it look like a painting"

## Output

Script akan menampilkan URL hasil gambar yang sudah di-edit. Download dengan:

```bash
curl -o hasil.jpg "<url_hasil>"
```

## Catatan

- Format gambar yang didukung: JPG, PNG, WEBP
- Timeout polling: 60 detik
- Interval polling: 2 detik

## License

Use at your own risk.
