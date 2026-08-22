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

# Test if NVENC (NVIDIA GPU) is available
$useGpu = $false
try {
    $testResult = & $ffmpegCmd -y -i "$InputFile" -t 1 -c:v h264_nvenc "src/videos/.gpu_check.mp4" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $useGpu = $true
        Remove-Item -Force -ErrorAction SilentlyContinue "src/videos/.gpu_check.mp4"
    }
} catch {
    $useGpu = $false
}

if ($useGpu) {
    Write-Host "⚡ NVIDIA GPU Detected! Using Ultra-Fast NVENC Hardware Encoding (~12-14 mins)..." -ForegroundColor Green
    Write-Host ""
    & $ffmpegCmd -i "$InputFile" -c:v h264_nvenc -b:v $VideoBitrate -maxrate 12000k -bufsize 20000k -preset p6 -movflags +faststart -c:a aac -b:a $AudioBitrate "$OutputFile"
} else {
    Write-Host "💻 Using Multi-threaded CPU Encoding (libx264)..." -ForegroundColor Yellow
    Write-Host ""
    & $ffmpegCmd -i "$InputFile" -c:v libx264 -b:v $VideoBitrate -maxrate 12000k -bufsize 20000k -preset medium -movflags +faststart -c:a aac -b:a $AudioBitrate "$OutputFile"
}

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
