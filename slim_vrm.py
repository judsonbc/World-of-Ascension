# usage: python3 tools/slim_vrm.py OUT_DIR [GLOB]   e.g.  python3 tools/slim_vrm.py slim "new/*.vrm"   (needs Pillow). Shrinks VRM avatars for the game, see CHANGELOG v5_299.
import json,struct,io,sys,glob,os
from PIL import Image
MAXTEX=512   # longest side of the base-colour maps
def parse(p):
    b=open(p,'rb').read();o=12;j=None;bn=None
    while o+8<=len(b):
        l,t=struct.unpack('<II',b[o:o+8]);o+=8
        if t==0x4E4F534A:j=json.loads(b[o:o+l])
        elif t==0x004E4942 and bn is None:bn=b[o:o+l]
        o+=l
    return j,bn
def pad(b,c=b'\x00'):
    return b+c*((4-len(b)%4)%4)
def slim(src,dst):
    j,bn=parse(src)
    # ---- 1. materials: keep only base colour textures
    keep_tex=[]
    def tex_of(m):
        b=m.get('pbrMetallicRoughness',{}).get('baseColorTexture');return b
    for m in j['materials']:
        b=tex_of(m)
        if b and b['index'] not in keep_tex:keep_tex.append(b['index'])
        for k in ('normalTexture','emissiveTexture','occlusionTexture'):m.pop(k,None)
        pm=m.get('pbrMetallicRoughness',{});pm.pop('metallicRoughnessTexture',None)
        mt=(m.get('extensions') or {}).get('VRMC_materials_mtoon')
        if mt:
            for k in list(mt):
                if k.endswith('Texture'):mt.pop(k)
    # ---- 2. textures / images: downscale + re-encode
    new_tex=[];new_img=[];img_blobs=[];remap={}
    for ti in keep_tex:
        t=j['textures'][ti];im=j['images'][t['source']];bv=j['bufferViews'][im['bufferView']]
        d=bn[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
        I=Image.open(io.BytesIO(d));I.load()
        if max(I.size)>MAXTEX:
            r=MAXTEX/max(I.size);I=I.resize((max(1,round(I.size[0]*r)),max(1,round(I.size[1]*r))),Image.LANCZOS)
        has_a=I.mode in('RGBA','LA','P') and ('A' in I.getbands() or I.mode=='P')
        if I.mode!='RGBA' and has_a:I=I.convert('RGBA')
        out=io.BytesIO()
        alpha_used=I.mode=='RGBA' and I.getchannel('A').getextrema()[0]<255
        if alpha_used:
            I.save(out,'PNG',optimize=True);mime='image/png'
        else:
            I.convert('RGB').save(out,'JPEG',quality=84,optimize=True,progressive=False);mime='image/jpeg'
        remap[ti]=len(new_tex)
        nt=dict(t);nt['source']=len(new_img);new_tex.append(nt)
        new_img.append({'mimeType':mime,'name':im.get('name','tex%d'%ti)});img_blobs.append(out.getvalue())
    for m in j['materials']:
        b=tex_of(m)
        if b:b['index']=remap[b['index']]
    # ---- 3. meshes: drop morph targets (blend shapes are not used by the game)
    for me in j['meshes']:
        for pr in me['primitives']:pr.pop('targets',None)
        me.pop('weights',None)
        if 'extras' in me:me['extras'].pop('targetNames',None)
    vrm=j['extensions'].get('VRMC_vrm',{})
    for name,ex in (vrm.get('expressions',{}).get('preset',{})|vrm.get('expressions',{}).get('custom',{})).items():
        ex.pop('morphTargetBinds',None)
    # ---- 4. rebuild accessors / bufferViews from what is still used
    used_acc=[]
    def use(a):
        if a not in used_acc:used_acc.append(a)
    for me in j['meshes']:
        for pr in me['primitives']:
            for a in pr['attributes'].values():use(a)
            if 'indices' in pr:use(pr['indices'])
    for s in j.get('skins',[]):
        if 'inverseBindMatrices' in s:use(s['inverseBindMatrices'])
    amap={a:i for i,a in enumerate(used_acc)}
    for me in j['meshes']:
        for pr in me['primitives']:
            pr['attributes']={k:amap[v] for k,v in pr['attributes'].items()}
            if 'indices' in pr:pr['indices']=amap[pr['indices']]
    for s in j.get('skins',[]):
        if 'inverseBindMatrices' in s:s['inverseBindMatrices']=amap[s['inverseBindMatrices']]
    j.pop('animations',None)
    used_bv=[]
    for a in used_acc:
        bv=j['accessors'][a]['bufferView']
        if bv not in used_bv:used_bv.append(bv)
    newbin=bytearray();bvmap={};newbv=[]
    for bi in used_bv:
        bv=j['bufferViews'][bi];o=bv.get('byteOffset',0)
        while len(newbin)%4:newbin.append(0)
        nb={k:v for k,v in bv.items() if k!='byteOffset'};nb['byteOffset']=len(newbin)
        newbin+=bn[o:o+bv['byteLength']];bvmap[bi]=len(newbv);newbv.append(nb)
    new_acc=[]
    for a in used_acc:
        ac=dict(j['accessors'][a]);ac['bufferView']=bvmap[ac['bufferView']];new_acc.append(ac)
    for k,blob in enumerate(img_blobs):
        while len(newbin)%4:newbin.append(0)
        new_img[k]['bufferView']=len(newbv);newbv.append({'buffer':0,'byteOffset':len(newbin),'byteLength':len(blob)});newbin+=blob
    while len(newbin)%4:newbin.append(0)
    j['accessors']=new_acc;j['bufferViews']=newbv;j['textures']=new_tex;j['images']=new_img
    j['buffers']=[{'byteLength':len(newbin)}]
    j.pop('samplers',None) if False else None
    # drop unused extension declarations that no longer apply
    jb=pad(json.dumps(j,separators=(',',':')).encode(),b' ')
    total=12+8+len(jb)+8+len(newbin)
    with open(dst,'wb') as f:
        f.write(struct.pack('<III',0x46546C67,2,total))
        f.write(struct.pack('<II',len(jb),0x4E4F534A));f.write(jb)
        f.write(struct.pack('<II',len(newbin),0x004E4942));f.write(bytes(newbin))
    return os.path.getsize(src),os.path.getsize(dst),len(new_tex)
if __name__=='__main__':
    out=sys.argv[1];os.makedirs(out,exist_ok=True)
    tot0=tot1=0
    for p in sorted(glob.glob(sys.argv[2] if len(sys.argv)>2 else 'web/*.vrm')):
        a,b,n=slim(p,os.path.join(out,os.path.basename(p)));tot0+=a;tot1+=b
        print(f"{os.path.basename(p):26s} {a/1e6:6.2f} MB -> {b/1e6:5.2f} MB  ({n} textures)")
    print(f"TOTAL {tot0/1e6:.1f} MB -> {tot1/1e6:.1f} MB")
