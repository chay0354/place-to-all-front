# One-time crop of CC0 pixel animals (OpenGameArt.org / Maygonpepetreynsh)
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root 'scripts/pixel-animals-spritesheet.png'
$outDir = Join-Path $root 'public/avatars/presets'
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

$cell = [int]($src.Width / 4)
$pad = [int]($cell * 0.08)
$size = 256

function ColorFromHex([string]$hex) {
  $h = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    255,
    [Convert]::ToInt32($h.Substring(0, 2), 16),
    [Convert]::ToInt32($h.Substring(2, 2), 16),
    [Convert]::ToInt32($h.Substring(4, 2), 16)
  )
}

function Export-Preset([int]$col, [int]$row, [string]$name, [string]$bgHex) {
  $x = $col * $cell + $pad
  $y = $row * $cell + $pad
  $w = $cell - (2 * $pad)
  $h = $cell - (2 * $pad)

  $crop = New-Object System.Drawing.Bitmap $w, $h
  $gc = [System.Drawing.Graphics]::FromImage($crop)
  $gc.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $gc.DrawImage($src, 0, 0, [System.Drawing.Rectangle]::new($x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $gc.Dispose()

  $out = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $g.Clear((ColorFromHex $bgHex))

  $scale = [Math]::Min(($size * 0.82) / $crop.Width, ($size * 0.82) / $crop.Height)
  $dw = [int]($crop.Width * $scale)
  $dh = [int]($crop.Height * $scale)
  $dx = [int](($size - $dw) / 2)
  $dy = [int](($size - $dh) / 2)
  $g.DrawImage($crop, $dx, $dy, $dw, $dh)

  $outPath = Join-Path $outDir "$name.png"
  $out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $crop.Dispose(); $out.Dispose()
  Write-Output "Wrote $outPath"
}

Export-Preset 0 0 'corgi' '#f3f3f3'
Export-Preset 1 0 'shiba' '#e8755a'
Export-Preset 0 2 'lion' '#a8d8d0'
Export-Preset 2 2 'bear' '#e8c468'
Export-Preset 1 3 'sheep' '#c9b8e8'

$src.Dispose()
