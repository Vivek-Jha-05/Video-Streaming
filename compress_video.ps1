# High-Quality Video Compressor (NVIDIA GPU NVENC Accelerated, Target 6.5 - 7.5 GB)
param (
    [string]$InputFile = "src/videos/Vivah.mp4",
    [string]$OutputFile = "src/videos/Vivah_Compressed.mp4",
    [string]$VideoBitrate = "9500k",
    [string]$AudioBitrate = "256k"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 High-Quality GPU Video Compressor (Target: 6.5-7.5 GB)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Input File:     $InputFile"
Write-Host "Output File:    $OutputFile"
Write-Host "Target Bitrate: $VideoBitrate (1080p Theater Grade)"
Write-Host "Audio Bitrate:  $AudioBitrate (Studio Fidelity AAC)"
Write-Host ""

if (-not (Test-Path $InputFile)) {
    Write-Host "Error: Input file '$InputFile' not found!" -ForegroundColor Red
    exit 1
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ffmpegCmd = "ffmpeg"

# Test if Hardware Acceleration (QSV / NVENC) is available
$encoder = "libx264"
$extraParams = @("-preset", "medium")

# 1. Check NVIDIA NVENC
try {
    $null = & $ffmpegCmd -y -f lavfi -i color=c=black:s=128x128:d=0.1 -c:v h264_nvenc "src/videos/.test_enc.mp4" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $encoder = "h264_nvenc"
        $extraParams = @("-preset", "p6")
        Remove-Item -Force -ErrorAction SilentlyContinue "src/videos/.test_enc.mp4"
    }
} catch {}

# 2. Check Intel QSV if NVENC not available
if ($encoder -eq "libx264") {
    try {
        $null = & $ffmpegCmd -y -f lavfi -i color=c=black:s=128x128:d=0.1 -c:v h264_qsv "src/videos/.test_enc.mp4" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $encoder = "h264_qsv"
            $extraParams = @()
            Remove-Item -Force -ErrorAction SilentlyContinue "src/videos/.test_enc.mp4"
        }
    } catch {}
}

if ($encoder -eq "h264_nvenc") {
    Write-Host "⚡ NVIDIA GPU Detected! Using NVENC Hardware Acceleration..." -ForegroundColor Green
} elseif ($encoder -eq "h264_qsv") {
    Write-Host "⚡ Intel Quick Sync (QSV) Detected! Using Intel GPU Hardware Acceleration (~3-4x speed)..." -ForegroundColor Green
} else {
    Write-Host "💻 Using Multi-threaded CPU Encoding (libx264)..." -ForegroundColor Yellow
}

Write-Host "Encoding with $encoder..." -ForegroundColor Cyan
Write-Host ""

& $ffmpegCmd -y -i "$InputFile" -c:v $encoder -b:v $VideoBitrate -maxrate 12000k -bufsize 20000k @extraParams -movflags +faststart -c:a aac -b:a $AudioBitrate "$OutputFile"

if ($LASTEXITCODE -eq 0 -and (Test-Path $OutputFile)) {
    $originalSize = (Get-Item $InputFile).Length / 1GB
    $compressedSize = (Get-Item $OutputFile).Length / 1GB
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " ✅ Compression Completed Successfully!" -ForegroundColor Green
    Write-Host " Original Size:   $([math]::Round($originalSize, 2)) GB" -ForegroundColor White
    Write-Host " Compressed Size: $([math]::Round($compressedSize, 2)) GB" -ForegroundColor Yellow
    Write-Host " Output File:     $OutputFile" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Host "Compression encountered an issue. Exit code: $LASTEXITCODE" -ForegroundColor Red
}
