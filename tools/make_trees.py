#!/usr/bin/env python3
"""Converts the "Textured Stylized Trees" OBJ pack into the game's compact tree pack (v5_321).
   python3 tools/make_trees.py "<path to 'Textured Stylized Trees - May 2020' folder>"
Writes web/trees/trees.json (manifest), web/trees/trees.bin (geometry) and web/trees/tex/*.png|jpg (textures).
Per model, one part for the bark and one for the leaves. Per vertex: position float32 x3, normal int8 x3 (+1 pad), uv float32 x2.
Indices are uint16. The trunk base of every model is at y=0 and the model's x/z origin is kept (the trunk stands on it)."""
import sys, os, json, struct, collections
import numpy as np
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/trees/Textured Stylized Trees - May 2020'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'trees')
os.makedirs(os.path.join(OUT, 'tex'), exist_ok=True)

# the models that ship (a spread of silhouettes per family; the other files of the pack are the same style)
MODELS = (['Tree_%d' % i for i in (1, 2, 3, 5, 6, 8, 9)] + ['Birch_%d' % i for i in (1, 3, 5, 8)] +
          ['Pine_%d' % i for i in (1, 2, 4, 5)] + ['DeadTree_%d' % i for i in (1, 3, 5, 7, 9)] +
          ['DeadBirch_%d' % i for i in (1, 4, 7)])
MAT_KIND = {'Bark': 'bark', 'Birch_Bark': 'bark', 'Tree_Leaves': 'leaf', 'Birch_Leaves': 'leaf', 'Pine_Leaves': 'leaf'}


def parse(path):
    v, vt, vn = [], [], []
    faces = collections.defaultdict(list)  # material -> list of [(vi,ti,ni), ...]
    mat = None
    for line in open(path):
        p = line.split()
        if not p:
            continue
        if p[0] == 'v':
            v.append([float(x) for x in p[1:4]])
        elif p[0] == 'vt':
            vt.append([float(p[1]), float(p[2])])
        elif p[0] == 'vn':
            vn.append([float(x) for x in p[1:4]])
        elif p[0] == 'usemtl':
            mat = p[1]
        elif p[0] == 'f':
            idx = []
            for t in p[1:]:
                a = t.split('/')
                idx.append((int(a[0]) - 1, int(a[1]) - 1 if len(a) > 1 and a[1] else -1, int(a[2]) - 1 if len(a) > 2 and a[2] else -1))
            faces[mat].append(idx)
    return np.array(v), np.array(vt) if vt else np.zeros((1, 2)), np.array(vn) if vn else np.zeros((1, 3)), faces


bin_buf = bytearray()
manifest = {'models': {}, 'tex': {}}


def align4():
    while len(bin_buf) % 4:
        bin_buf.append(0)


for name in MODELS:
    v, vt, vn, faces = parse(os.path.join(SRC, 'OBJ', name + '.obj'))
    h = float(v[:, 1].max())
    mdl = {'h': round(h, 4), 'w': round(float(max(abs(v[:, 0]).max(), abs(v[:, 2]).max())), 4), 'parts': []}
    for m, fl in faces.items():
        kind = MAT_KIND[m]
        remap, P, N, U, I = {}, [], [], [], []
        for f in fl:
            ids = []
            for key in f:
                if key not in remap:
                    remap[key] = len(P)
                    P.append(v[key[0]])
                    N.append(vn[key[2]] if key[2] >= 0 else (0, 1, 0))
                    U.append(vt[key[1]] if key[1] >= 0 else (0, 0))
                ids.append(remap[key])
            for k in range(1, len(ids) - 1):  # fan triangulation (the pack is quads / tris)
                I += [ids[0], ids[k], ids[k + 1]]
        P, N, U, I = np.array(P, np.float32), np.array(N, np.float32), np.array(U, np.float32), np.array(I, np.uint16)
        N = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-6)
        N8 = np.zeros((len(P), 4), np.int8)
        N8[:, :3] = np.round(N * 127).astype(np.int8)
        align4(); po = len(bin_buf); bin_buf += P.tobytes()
        align4(); no = len(bin_buf); bin_buf += N8.tobytes()
        align4(); uo = len(bin_buf); bin_buf += U.tobytes()
        align4(); io = len(bin_buf); bin_buf += I.tobytes()
        mdl['parts'].append({'k': kind, 'n': len(P), 'ni': len(I), 'p': po, 'nrm': no, 'uv': uo, 'i': io})
    manifest['models'][name] = mdl

# textures: bark -> 512 jpg, leaves -> 256/512 png (alpha cut-out, so keep the alpha). Keys are what trees3d.js refers to.
T = os.path.join(SRC, 'Textures'); CV = os.path.join(T, 'Color Variations')
TEX = {
    'bark': (os.path.join(T, 'Tree_Bark.jpg'), 512), 'barkDead': (os.path.join(CV, 'Bark_Dead.png'), 512),
    'birchBark': (os.path.join(T, 'Birch_Bark.png'), 512), 'birchBarkDead': (os.path.join(CV, 'Birch_Bark_Dead.png'), 512),
    'leaf': (os.path.join(T, 'Tree_Leaves.png'), 512), 'leafLight': (os.path.join(CV, 'Leaves_Light.png'), 512),
    'leafPink': (os.path.join(CV, 'Leaves_Pink.png'), 512), 'leafBlue': (os.path.join(CV, 'Leaves_Blue.png'), 512),
    'leafCyan': (os.path.join(CV, 'Leaves_Cyan.png'), 512), 'leafPurple': (os.path.join(CV, 'Leaves_Purple.png'), 512),
    'leafOrange': (os.path.join(CV, 'Leaves_Orange.png'), 512), 'leafRed': (os.path.join(CV, 'Leaves_Red.png'), 512),
    'leafDarkRed': (os.path.join(CV, 'Leaves_DarkRed.png'), 512),
    'birchLeaf': (os.path.join(T, 'Birch_Leaves_Green.png'), 512), 'birchLeafYellow': (os.path.join(T, 'Birch_Leaves_Yellow.png'), 512),
    'pine': (os.path.join(T, 'Pine_Leaves.png'), 512), 'pineLight': (os.path.join(CV, 'Pine_Leaves_Light.png'), 512),
    'pineRed': (os.path.join(CV, 'Pine_Leaves_Red.png'), 512),
}
FROST = {'pineSnow': 'pine', 'leafFrost': 'leaf'}  # snow world: the green leaf / needle textures washed towards white
TEX.update({k: TEX[v] for k, v in FROST.items()})
for key, (path, size) in TEX.items():
    im = Image.open(path)
    leaf = 'bark' not in key.lower()
    if im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    if leaf:
        im = im.convert('RGBA')
        if key in FROST:
            fr = Image.new('RGBA', im.size, (232, 240, 250, 255))
            a0 = im.getchannel('A'); im = Image.blend(im, fr, .5); im.putalpha(a0)
        # bleed the colour of the leaves into the transparent area so mip-mapping / filtering leaves no dark halo
        a = np.array(im); rgb = a[..., :3].astype(np.float32); al = a[..., 3:4].astype(np.float32) / 255
        from PIL import ImageFilter
        s = 1.0
        blur = np.array(Image.fromarray((rgb * al).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
        ba = np.array(Image.fromarray((al[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)[..., None] / 255
        fill = blur / np.maximum(ba, 1e-3)
        out = np.where(al > .5, rgb, fill)
        a[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
        im = Image.fromarray(a, 'RGBA')
        fn = key + '.png'; im.save(os.path.join(OUT, 'tex', fn), optimize=True)
    else:
        im = im.convert('RGB'); fn = key + '.jpg'; im.save(os.path.join(OUT, 'tex', fn), quality=82, optimize=True)
    manifest['tex'][key] = fn

json.dump(manifest, open(os.path.join(OUT, 'trees.json'), 'w'), separators=(',', ':'))
open(os.path.join(OUT, 'trees.bin'), 'wb').write(bin_buf)
print('models', len(manifest['models']), 'bin', len(bin_buf) // 1024, 'KB; textures', len(manifest['tex']))
tot = sum(os.path.getsize(os.path.join(OUT, 'tex', f)) for f in os.listdir(os.path.join(OUT, 'tex')))
print('textures total', tot // 1024, 'KB')
for k, m in manifest['models'].items():
    print(k, 'h=%.1f w=%.1f' % (m['h'], m['w']), [(p['k'], p['n']) for p in m['parts']])
