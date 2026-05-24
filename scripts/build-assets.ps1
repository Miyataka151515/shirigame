Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class CutoutTool
{
    static bool IsBackgroundCandidate(Color p)
    {
        int max = Math.Max(p.R, Math.Max(p.G, p.B));
        int min = Math.Min(p.R, Math.Min(p.G, p.B));
        return p.R > 218 && p.G > 218 && p.B > 218 && (max - min) < 58;
    }

    public static void Save(string inputPath, string outputPath, int maxSize)
    {
        using (var src = new Bitmap(inputPath))
        {
            int width = src.Width;
            int height = src.Height;
            bool[] bg = new bool[width * height];
            var q = new Queue<int>();

            Action<int, int> enqueue = (x, y) =>
            {
                if (x < 0 || y < 0 || x >= width || y >= height) return;
                int idx = y * width + x;
                if (bg[idx]) return;
                if (!IsBackgroundCandidate(src.GetPixel(x, y))) return;
                bg[idx] = true;
                q.Enqueue(idx);
            };

            for (int x = 0; x < width; x++)
            {
                enqueue(x, 0);
                enqueue(x, height - 1);
            }
            for (int y = 0; y < height; y++)
            {
                enqueue(0, y);
                enqueue(width - 1, y);
            }

            while (q.Count > 0)
            {
                int idx = q.Dequeue();
                int x = idx % width;
                int y = idx / width;
                enqueue(x + 1, y);
                enqueue(x - 1, y);
                enqueue(x, y + 1);
                enqueue(x, y - 1);
            }

            int left = width, top = height, right = 0, bottom = 0;
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    if (!bg[y * width + x])
                    {
                        if (x < left) left = x;
                        if (y < top) top = y;
                        if (x > right) right = x;
                        if (y > bottom) bottom = y;
                    }
                }
            }

            int pad = 8;
            left = Math.Max(0, left - pad);
            top = Math.Max(0, top - pad);
            right = Math.Min(width - 1, right + pad);
            bottom = Math.Min(height - 1, bottom + pad);

            int cropW = right - left + 1;
            int cropH = bottom - top + 1;
            double scale = Math.Min((double)maxSize / cropW, (double)maxSize / cropH);
            int outW = Math.Max(1, (int)Math.Ceiling(cropW * scale));
            int outH = Math.Max(1, (int)Math.Ceiling(cropH * scale));

            using (var dst = new Bitmap(outW, outH, PixelFormat.Format32bppArgb))
            {
                for (int dy = 0; dy < outH; dy++)
                {
                    for (int dx = 0; dx < outW; dx++)
                    {
                        int sx = Math.Min(width - 1, left + (int)(dx / scale));
                        int sy = Math.Min(height - 1, top + (int)(dy / scale));
                        Color p = src.GetPixel(sx, sy);
                        if (bg[sy * width + sx])
                        {
                            dst.SetPixel(dx, dy, Color.FromArgb(0, 255, 255, 255));
                        }
                        else
                        {
                            dst.SetPixel(dx, dy, Color.FromArgb(255, p.R, p.G, p.B));
                        }
                    }
                }
                dst.Save(outputPath, ImageFormat.Png);
            }
        }
    }
}
"@

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Assets = Join-Path $Root "assets"

function Save-Cutout {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$MaxSize
    )

    [CutoutTool]::Save($InputPath, $OutputPath, $MaxSize)
}

function Save-ChromaCutout {
    param(
        [string]$InputPath,
        [string]$OutputPath,
        [int]$MaxSize
    )

    $src = [System.Drawing.Bitmap]::new($InputPath)
    $bounds = [System.Drawing.Rectangle]::Empty

    for ($y = 0; $y -lt $src.Height; $y++) {
        for ($x = 0; $x -lt $src.Width; $x++) {
            $p = $src.GetPixel($x, $y)
            $isBg = ($p.G -gt 180 -and $p.R -lt 80 -and $p.B -lt 90)
            if (-not $isBg) {
                if ($bounds.IsEmpty) {
                    $bounds = [System.Drawing.Rectangle]::new($x, $y, 1, 1)
                } else {
                    $bounds = [System.Drawing.Rectangle]::Union($bounds, [System.Drawing.Rectangle]::new($x, $y, 1, 1))
                }
            }
        }
    }

    $pad = 10
    $bounds = [System.Drawing.Rectangle]::FromLTRB(
        [Math]::Max(0, $bounds.Left - $pad),
        [Math]::Max(0, $bounds.Top - $pad),
        [Math]::Min($src.Width, $bounds.Right + $pad),
        [Math]::Min($src.Height, $bounds.Bottom + $pad)
    )

    $scale = [Math]::Min($MaxSize / $bounds.Width, $MaxSize / $bounds.Height)
    $w = [int][Math]::Ceiling($bounds.Width * $scale)
    $h = [int][Math]::Ceiling($bounds.Height * $scale)
    $dst = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($dy = 0; $dy -lt $h; $dy++) {
        for ($dx = 0; $dx -lt $w; $dx++) {
            $sx = [Math]::Min($src.Width - 1, $bounds.Left + [int]($dx / $scale))
            $sy = [Math]::Min($src.Height - 1, $bounds.Top + [int]($dy / $scale))
            $p = $src.GetPixel($sx, $sy)
            $isBg = ($p.G -gt 180 -and $p.R -lt 80 -and $p.B -lt 90)
            if ($isBg) {
                $dst.SetPixel($dx, $dy, [System.Drawing.Color]::FromArgb(0, 0, 255, 0))
            } else {
                $dst.SetPixel($dx, $dy, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
            }
        }
    }

    $dst.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dst.Dispose()
    $src.Dispose()
}

function New-Sprite {
    param(
        [string]$OutputPath,
        [scriptblock]$Draw
    )

    $bmp = [System.Drawing.Bitmap]::new(96, 96, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    & $Draw $g
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

function Brush($hex) {
    return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Pen($hex, $size) {
    return [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($hex), $size)
}

Save-Cutout "C:\Users\takah\Downloads\unnamed (1).jpg" (Join-Path $Assets "player.png") 180
Save-Cutout "C:\Users\takah\Downloads\unnamed (2).jpg" (Join-Path $Assets "squirrel.png") 150
Save-ChromaCutout "C:\Users\takah\.codex\generated_images\019e0731-e2c9-78d0-a022-b8e93e203e6a\ig_070e6c9452508fe30169fdc14fc930819196cf2751e607d18e.png" (Join-Path $Assets "peach.png") 72

New-Sprite (Join-Path $Assets "beer.png") {
    param($g)
    $outline = Pen "#5c2d1e" 4
    $glass = Brush "#ffd56a"
    $foam = Brush "#fff4c7"
    $shine = Brush "#fff9e9"
    $g.FillRectangle($glass, 24, 30, 42, 46)
    $g.DrawRectangle($outline, 24, 30, 42, 46)
    $g.FillEllipse($foam, 18, 18, 22, 20)
    $g.FillEllipse($foam, 34, 14, 24, 24)
    $g.FillEllipse($foam, 52, 18, 18, 20)
    $g.DrawEllipse($outline, 64, 40, 18, 24)
    $g.FillRectangle((Brush "#f2a63b"), 30, 42, 30, 30)
    $g.FillRectangle($shine, 34, 36, 6, 24)
}

New-Sprite (Join-Path $Assets "yakitori.png") {
    param($g)
    $stick = Pen "#7b4a25" 4
    $outline = Pen "#6d3419" 3
    $sauce = Brush "#d77836"
    $light = Brush "#ffd184"
    $g.DrawLine($stick, 22, 76, 74, 24)
    foreach ($p in @(@(26,58), @(39,46), @(52,34))) {
        $g.FillEllipse($sauce, $p[0], $p[1], 22, 18)
        $g.DrawEllipse($outline, $p[0], $p[1], 22, 18)
        $g.FillEllipse($light, $p[0] + 5, $p[1] + 4, 7, 5)
    }
}

New-Sprite (Join-Path $Assets "pudding.png") {
    param($g)
    $outline = Pen "#6b3a24" 4
    $body = Brush "#ffe28a"
    $caramel = Brush "#b96a2c"
    $shine = Brush "#fff4be"
    $g.FillEllipse($body, 18, 36, 60, 36)
    $g.DrawEllipse($outline, 18, 36, 60, 36)
    $g.FillEllipse($caramel, 28, 24, 40, 18)
    $g.DrawEllipse($outline, 28, 24, 40, 18)
    $g.FillEllipse($shine, 34, 44, 12, 8)
}

New-Sprite (Join-Path $Assets "bomb.png") {
    param($g)
    $outline = Pen "#2d2431" 4
    $body = Brush "#333342"
    $shine = Brush "#6b6573"
    $fire = Brush "#ff5d4a"
    $spark = Brush "#ffd76c"
    $g.FillEllipse($body, 22, 30, 48, 48)
    $g.DrawEllipse($outline, 22, 30, 48, 48)
    $g.FillEllipse($shine, 34, 40, 12, 10)
    $g.DrawLine((Pen "#5c2d1e" 4), 62, 30, 74, 18)
    $g.FillEllipse($fire, 70, 10, 16, 16)
    $g.FillEllipse($spark, 74, 14, 7, 7)
}

New-Sprite (Join-Path $Assets "octopus.png") {
    param($g)
    $outline = Pen "#5b2444" 4
    $body = Brush "#e56aa2"
    $dark = Brush "#c94d8d"
    $light = Brush "#ffb1cc"
    $eye = Brush "#fff7ff"
    $pupil = Brush "#34314a"
    $g.FillEllipse($body, 20, 18, 56, 46)
    $g.DrawEllipse($outline, 20, 18, 56, 46)
    foreach ($x in 24, 38, 52, 66) {
        $g.FillEllipse($dark, $x, 56, 16, 24)
        $g.DrawEllipse($outline, $x, 56, 16, 24)
    }
    $g.FillEllipse($light, 30, 26, 16, 10)
    $g.FillEllipse($eye, 34, 36, 11, 13)
    $g.FillEllipse($eye, 52, 36, 11, 13)
    $g.FillEllipse($pupil, 38, 40, 5, 6)
    $g.FillEllipse($pupil, 56, 40, 5, 6)
    $g.FillEllipse((Brush "#80305c"), 45, 51, 8, 5)
}

New-Sprite (Join-Path $Assets "microphone.png") {
    param($g)
    $outline = Pen "#493547" 4
    $head = Brush "#6f6b86"
    $shine = Brush "#d9d7ee"
    $gold = Brush "#ffd05c"
    $handle = Brush "#4c4366"
    $g.FillEllipse($head, 28, 14, 38, 42)
    $g.DrawEllipse($outline, 28, 14, 38, 42)
    $g.DrawLine((Pen "#3a334c" 2), 35, 22, 58, 22)
    $g.DrawLine((Pen "#3a334c" 2), 33, 32, 61, 32)
    $g.DrawLine((Pen "#3a334c" 2), 35, 43, 58, 43)
    $g.FillEllipse($shine, 38, 22, 9, 8)
    $g.FillRectangle($gold, 36, 54, 24, 10)
    $g.DrawRectangle($outline, 36, 54, 24, 10)
    $g.FillRectangle($handle, 42, 62, 12, 24)
    $g.DrawRectangle($outline, 42, 62, 12, 24)
}

New-Sprite (Join-Path $Assets "cat.png") {
    param($g)
    $outline = Pen "#252530" 4
    $black = Brush "#30303a"
    $white = Brush "#f8f5ed"
    $pink = Brush "#f2a3b3"
    $eye = Brush "#f8d35d"
    $pupil = Brush "#171721"
    $gray = Brush "#6d6d78"
    $shadow = Brush "#d8d4ca"
    $whisker = Pen "#4b3b45" 2

    # Compact body behind the head, kept round so it reads as a cat instead of a stretched dash.
    $g.FillEllipse($black, 46, 38, 30, 24)
    $g.DrawEllipse($outline, 46, 38, 30, 24)
    $g.FillEllipse($white, 53, 45, 15, 12)

    # Curled tail on the far right.
    $g.DrawArc((Pen "#30303a" 7), 66, 30, 22, 28, 65, 250)
    $g.DrawArc((Pen "#f8f5ed" 3), 72, 37, 10, 13, 80, 210)

    # Large left-facing head.
    $g.FillEllipse($white, 16, 24, 45, 42)
    $g.DrawEllipse($outline, 16, 24, 45, 42)

    # Ears.
    $g.FillPolygon($black, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(24, 30),
        [System.Drawing.Point]::new(20, 10),
        [System.Drawing.Point]::new(38, 26)
    ))
    $g.DrawPolygon($outline, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(24, 30),
        [System.Drawing.Point]::new(20, 10),
        [System.Drawing.Point]::new(38, 26)
    ))
    $g.FillPolygon($pink, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(27, 25),
        [System.Drawing.Point]::new(24, 16),
        [System.Drawing.Point]::new(33, 24)
    ))
    $g.FillPolygon($white, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(45, 27),
        [System.Drawing.Point]::new(58, 11),
        [System.Drawing.Point]::new(60, 35)
    ))
    $g.DrawPolygon($outline, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(45, 27),
        [System.Drawing.Point]::new(58, 11),
        [System.Drawing.Point]::new(60, 35)
    ))
    $g.FillPolygon($pink, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(50, 26),
        [System.Drawing.Point]::new(56, 17),
        [System.Drawing.Point]::new(56, 30)
    ))

    # Black-and-white mixed fur patches.
    $g.FillPie($black, 16, 24, 45, 42, 190, 120)
    $g.FillEllipse($gray, 38, 29, 18, 18)
    $g.FillEllipse($shadow, 21, 51, 16, 9)

    # Face points left: eyes, nose and whiskers are concentrated on the left.
    $g.FillEllipse($eye, 27, 38, 8, 10)
    $g.FillEllipse($eye, 43, 38, 8, 10)
    $g.FillRectangle($pupil, 30, 41, 3, 6)
    $g.FillRectangle($pupil, 46, 41, 3, 6)
    $g.FillEllipse($pink, 25, 49, 8, 6)
    $g.DrawArc((Pen "#4b3b45" 2), 28, 51, 10, 8, 5, 130)
    $g.DrawArc((Pen "#4b3b45" 2), 35, 51, 10, 8, 40, 130)
    $g.DrawLine($whisker, 25, 49, 8, 43)
    $g.DrawLine($whisker, 25, 53, 7, 55)
    $g.DrawLine($whisker, 49, 49, 64, 43)
    $g.DrawLine($whisker, 49, 53, 65, 55)

    # Tiny paws tucked under the dash pose.
    $g.FillEllipse($white, 39, 60, 10, 8)
    $g.DrawEllipse((Pen "#252530" 2), 39, 60, 10, 8)
    $g.FillEllipse($black, 55, 59, 10, 8)
}

New-Sprite (Join-Path $Assets "golden-peach.png") {
    param($g)
    $outline = Pen "#7a4b14" 4
    $gold = Brush "#ffd85a"
    $deep = Brush "#f2a93a"
    $shine = Brush "#fff7b0"
    $leaf = Brush "#5fc46f"
    $g.FillEllipse($gold, 21, 25, 54, 54)
    $g.DrawEllipse($outline, 21, 25, 54, 54)
    $g.DrawArc((Pen "#f08c38" 3), 45, 30, 16, 48, 88, 175)
    $g.FillEllipse($deep, 26, 55, 42, 18)
    $g.FillEllipse($shine, 32, 34, 15, 18)
    $g.FillEllipse($shine, 54, 42, 7, 7)
    $g.FillRectangle((Brush "#7b4a25"), 45, 17, 8, 14)
    $g.FillEllipse($leaf, 50, 14, 26, 14)
    $g.DrawEllipse((Pen "#377f42" 3), 50, 14, 26, 14)
}
