#!/usr/bin/env python3
"""Builds the SLASH part of web/skillfx/ (v5_327): the "Attack Slashes" textures (sl_*.png) + the baked slash meshes ('mesh' in data.json).
The spell sprites (sp_*.png, 'spells' in data.json) are made by tools/make_skillfx_vfx.py since v5_328 (Free RPG VFX Sprite Sheet Starter Pack); this tool keeps whatever 'spells' data.json already has.
usage: python3 tools/make_skillfx.py <Attack Slashes folder> web/skillfx   (needs Pillow)"""
import sys,os,json,glob,struct,zlib,shutil
from PIL import Image
sl,out=sys.argv[1:3]
os.makedirs(out,exist_ok=True)
dj=os.path.join(out,'data.json')
data=json.load(open(dj)) if os.path.exists(dj) else {'spells':{}}
data['mesh']={}
# slash textures: 1920x500 -> 1024x256 (power of two, so they can repeat in WebGL1 too)
for f in sorted(glob.glob(os.path.join(sl,'textures','*.png'))):
    n=os.path.basename(f)[:-4].lower().replace(' ','_')
    Image.open(f).convert('RGBA').resize((1024,256),Image.LANCZOS).save(os.path.join(out,'sl_'+n+'.png'),optimize=True)
# slash meshes from the FBX (binary 7400): Circle.011 = sword ring, Circle.007 = claw band
d=open(os.path.join(sl,'source','Slash .fbx'),'rb').read()
def prop(o):
    t=chr(d[o]);o+=1
    if t in 'YCFDLIB':
        n={'Y':2,'C':1,'F':4,'D':8,'L':8,'I':4,'B':1}[t];f={'Y':'<h','C':'<B','F':'<f','D':'<d','L':'<q','I':'<i','B':'<B'}[t];return struct.unpack(f,d[o:o+n])[0],o+n
    if t in 'fdlib':
        ln,enc,cl=struct.unpack('<III',d[o:o+12]);o+=12;raw=d[o:o+cl];o+=cl
        if enc:raw=zlib.decompress(raw)
        return list(struct.unpack('<%d%s'%(ln,{'f':'f','d':'d','l':'q','i':'i','b':'B'}[t]),raw)),o
    ln=struct.unpack('<I',d[o:o+4])[0];return d[o+4:o+4+ln],o+4+ln
def node(o):
    end,np,pl,nl=struct.unpack('<IIIB',d[o:o+13])
    if end==0:return None,o+13
    name=d[o+13:o+13+nl].decode();p=o+13+nl;props=[]
    for _ in range(np):v,p=prop(p);props.append(v)
    kids=[]
    while p<end:
        k,p=node(p)
        if k:kids.append(k)
    return (name,props,kids),end
o=27;top=[]
while o<len(d)-200:
    n,o=node(o)
    if n is None:break
    top.append(n)
obj=[n for n in top if n[0]=='Objects'][0]
for nm,key in (('Circle.011','sword'),('Circle.007','claw')):
    g=[g for g in obj[2] if g[0]=='Geometry' and g[1][1].split(b'\x00')[0].decode()==nm][0]
    v=[k for k in g[2] if k[0]=='Vertices'][0][1][0];pi=[k for k in g[2] if k[0]=='PolygonVertexIndex'][0][1][0]
    lu=[k for k in g[2] if k[0]=='LayerElementUV'][0]
    uv=[k for k in lu[2] if k[0]=='UV'][0][1][0];ui=[k for k in lu[2] if k[0]=='UVIndex'][0][1][0]
    pos=[];uvs=[];idx=[];poly=[]
    for n,i in enumerate(pi):
        poly.append((~i if i<0 else i,ui[n]))
        if i<0:
            b=len(pos)//3
            for vv,uu in poly:pos+=[round(v[vv*3],3),round(v[vv*3+1],3),round(v[vv*3+2],3)];uvs+=[round(uv[uu*2],4),round(uv[uu*2+1],4)]
            idx+=[b,b+1,b+2,b,b+2,b+3];poly=[]
    data['mesh'][key]={'p':pos,'uv':uvs,'i':idx}
json.dump(data,open(os.path.join(out,'data.json'),'w'),separators=(',',':'))
print('ok',len(data['spells']),'spells kept',len(glob.glob(out+'/sl_*.png')),'slash textures')
