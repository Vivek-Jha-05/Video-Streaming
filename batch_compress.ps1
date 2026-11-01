# Batch Video Compressor for 03, 04, 05 (1080p Theater Quality, QSV Hardware Accelerated)
param (
    [string]$VideoBitrate = "9500k",
    [string]$AudioBitrate = "256k"
)

$videos = @(
    @{ Input = "public/videos/03.mp4"; Output = "src/videos/03_Compressed.mp4"; Name = "03" },
    @{ Input = "public/videos/04.mp4"; Output = "src/videos/04_Compressed.mp4"; Name = "04" },
    @{ Input = "public/videos/05.mp4"; Output = "src/videos/05_Compressed.mp4"; Name = "05" }
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Batch Video Compressor (1080p Theater Quality)" -ForegroundColor Yellow
Write-Host " Target Bitrate: $VideoBitrate (Video) + $AudioBitrate (Audio)" -ForegroundColor Yellow
Write-Host " Target Output:  src/videos/" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$ffmpegCmd = "ffmpeg"

# Detect best available encoder
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

# 2. Check Intel QSV
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

Write-Host "Encoder Selected: $encoder" -ForegroundColor Green
Write-Host ""

$totalStart = Get-Date

foreach ($item in $videos) {
    $in = $item.Input
    $out = $item.Output
    $name = $item.Name

    if (-not (Test-Path $in)) {
        Write-Host "Skipping ${name}: Input file '$in' not found!" -ForegroundColor Red
        continue
    }

    Write-Host "----------------------------------------------------------" -ForegroundColor DarkCyan
    Write-Host " Compressing Video ${name}: $in -> $out" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------------" -ForegroundColor DarkCyan

    $videoStart = Get-Date
    & $ffmpegCmd -y -i "$in" -c:v $encoder -b:v $VideoBitrate -maxrate 12000k -bufsize 20000k @extraParams -movflags +faststart -c:a aac -b:a $AudioBitrate "$out"

    if ($LASTEXITCODE -eq 0 -and (Test-Path $out)) {
        $inSize = [math]::Round(((Get-Item $in).Length / 1GB), 2)
        $outSize = [math]::Round(((Get-Item $out).Length / 1GB), 2)
        $elapsed = [math]::Round(((Get-Date) - $videoStart).TotalMinutes, 1)
        Write-Host " ✅ $name Completed in $elapsed min! Original: $inSize GB -> Compressed: $outSize GB" -ForegroundColor Green
    } else {
        Write-Host " ❌ Error compressing $name! Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
}

$totalElapsed = [math]::Round(((Get-Date) - $totalStart).TotalMinutes, 1)
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 🎉 All Batch Compressions Finished in $totalElapsed min!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
