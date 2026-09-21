import zlib
import struct
import math
import os

def create_png(width, height, draw_func, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter byte 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), 9)
    
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xffffffff
        return c + struct.pack(">I", crc)
    
    png = b'\x89PNG\r\n\x1a\n'
    # IHDR: width(4), height(4), bit depth(1=8), color type(1=6: RGBA), compression(1=0), filter(1=0), interlace(1=0)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Created {filename} ({width}x{height})")

def icon_drawer(is_maskable=False):
    def draw(x, y, w, h):
        # Coordinates normalized to -1.0 to 1.0
        nx = (x / w) * 2.0 - 1.0
        ny = (y / h) * 2.0 - 1.0
        
        # Rounded rectangle distance for squircle
        # p=4 superellipse or squircle: |x|^4 + |y|^4 <= r^4
        radius = 0.82 if not is_maskable else 1.05
        d = math.pow(abs(nx), 4) + math.pow(abs(ny), 4)
        
        if d > math.pow(radius, 4):
            if is_maskable:
                return (9, 9, 11, 255) # Full bleed black #09090b
            return (0, 0, 0, 0) # Transparent outside
        
        # Border check (subtle white border on squircle)
        inner_r = radius - 0.04
        if d > math.pow(inner_r, 4) and not is_maskable:
            return (50, 50, 55, 255)
            
        # Center monogram or geometric sourcing emblem
        # Box representing cargo / sourcing package in center
        # Center is (0, 0)
        # Sourcing box: -0.35 to 0.35 in x, -0.35 to 0.35 in y
        bx = abs(nx)
        by = abs(ny)
        
        # Minimalist modern geometric crest
        # Outer crest diamond / square rotated 45 deg
        dist_diamond = bx + by
        if 0.38 <= dist_diamond <= 0.44:
            return (255, 255, 255, 255) # Crisp white diamond
            
        # Central square
        if bx <= 0.22 and by <= 0.22:
            # Inner white border
            if (0.18 <= bx <= 0.22) or (0.18 <= by <= 0.22):
                return (255, 255, 255, 255)
            # Center N / S motif: cross lines
            if abs(nx) <= 0.04 and abs(ny) <= 0.16:
                return (255, 255, 255, 255)
            if abs(ny) <= 0.04 and abs(nx) <= 0.16:
                return (255, 255, 255, 255)
                
        # Background inside squircle: deep luxury charcoal/black
        # Subtle radial highlight from top
        dist_center = math.sqrt(nx*nx + (ny+0.3)*(ny+0.3))
        shade = max(9, int(22 - dist_center * 10))
        return (shade, shade, shade + 2, 255)
        
    return draw

os.makedirs('public', exist_ok=True)
create_png(192, 192, icon_drawer(False), 'public/pwa-192x192.png')
create_png(512, 512, icon_drawer(False), 'public/pwa-512x512.png')
create_png(512, 512, icon_drawer(True), 'public/pwa-maskable-512x512.png')
create_png(180, 180, icon_drawer(False), 'public/apple-touch-icon.png')
print("All PNG icons generated successfully!")
