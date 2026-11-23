# usage: python3 tools/quant_vrm.py IN_DIR OUT_DIR   (needs numpy). Second shrink pass for the already slimmed avatars (slim_vrm.py), see CHANGELOG v5_310.
# Re-encodes the vertex data of every mesh primitive (web/vrm3d.js turns it back into floats when it loads the model):
#   POSITION  float32 x3 -> uint16 x3 normalized over the accessor min/max box   (12 -> 8 bytes, error < 0.03 mm)
#   NORMAL    float32 x3 -> int8 x3 normalized                                    (12 -> 4 bytes)
#   TEXCOORD  float32 x2 -> uint16 x2 normalized (only when all UVs are in 0..1)  ( 8 -> 4 bytes)
#   JOINTS    uint16 x4  -> uint8 x4 when every joint index < 256                 ( 8 -> 4 bytes)
#   WEIGHTS   float32 x4 -> uint8 x4 normalized, renormalized to sum 255         (16 -> 4 bytes)
#   TEXTURES  PNG -> 256-colour palette PNG (alpha kept; the maps are flat toon colours, mean error ~1/255)  ( ~5x smaller)
#   TEXTURES  PNG -> 256-colour palette PNG (alpha kept; the maps are flat toon colours, mean error ~1/255)  (~5x smaller)
#   indices   uint32     -> uint16 when the primitive has < 65536 vertices        ( 4 -> 2 bytes)
import json,struct,sys,glob,os
import numpy as np,io
from PIL import Image
CT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def parse(p):
    b=open(p,'rb').read();o=12;j=None;bn=None
    while o+8<=len(b):
        l,t=struct.unpack('<II',b[o:o+8]);o+=8
        if t==0x4E4F534A:j=json.loads(b[o:o+l])
        elif t==0x004E4942 and bn is None:bn=b[o:o+l]
        o+=l
    return j,bn
def pad(b,c=b'\x00'):return b+c*((4-len(b)%4)%4)
def read(j,bn,i):
    a=j['accessors'][i];bv=j['bufferViews'][a['bufferView']];n=NC[a['type']];dt=np.dtype(CT[a['componentType']])
    base=bv.get('byteOffset',0)+a.get('byteOffset',0);stride=bv.get('byteStride') or dt.itemsize*n
    raw=np.frombuffer(bn,dtype=np.uint8,count=stride*(a['count']-1)+dt.itemsize*n,offset=base)
    rows=np.lib.stride_tricks.as_strided(raw,shape=(a['count'],dt.itemsize*n),strides=(stride,1))
    return np.ascontiguousarray(rows).view(dt).reshape(a['count'],n)
def rows(arr,pad_to=4):   # tightly pack rows, each row padded to a multiple of 4 bytes -> returns bytes, stride
    r=np.ascontiguousarray(arr);rb=r.dtype.itemsize*r.shape[1];st=(rb+3)//4*4
    out=np.zeros((r.shape[0],st),dtype=np.uint8);out[:,:rb]=r.view(np.uint8).reshape(r.shape[0],rb);return out.tobytes(),(st if st!=rb else None)
def quant(src,dst):
    j,bn=parse(src);new=bytearray();nbv=[];keep={}   # keep: old bufferView -> new index
    prims=[p for m in j['meshes'] for p in m['primitives']]
    done={}   # accessor -> True, each accessor is re-encoded once
    # which bufferViews are used by mesh accessors we touch
    touched=set()
    def addbv(data,stride=None,target=None):
        while len(new)%4:new.append(0)
        bv={'buffer':0,'byteOffset':len(new),'byteLength':len(data)}
        if stride:bv['byteStride']=stride
        if target:bv['target']=target
        new.extend(data);nbv.append(bv);return len(nbv)-1
    def redo(ai,kind):
        if ai in done:return
        done[ai]=True;a=j['accessors'][ai];v=read(j,bn,ai);old=a['bufferView']
        a.pop('byteOffset',None);a.pop('sparse',None)
        if kind=='pos':
            lo=np.array(a['min'],np.float64);hi=np.array(a['max'],np.float64);span=np.where(hi-lo>0,hi-lo,1)
            q=np.round((v.astype(np.float64)-lo)/span*65535).astype(np.uint16);data,st=rows(q);a['componentType']=5123;a['normalized']=True
        elif kind=='nor':
            q=np.clip(np.round(v.astype(np.float64)*127),-127,127).astype(np.int8);data,st=rows(q);a['componentType']=5120;a['normalized']=True
        elif kind=='uv':
            if v.min()<0 or v.max()>1:data,st=rows(v.astype(np.float32))
            else:q=np.round(v.astype(np.float64)*65535).astype(np.uint16);data,st=rows(q);a['componentType']=5123;a['normalized']=True
        elif kind=='jnt':
            if v.max()<256:data,st=rows(v.astype(np.uint8));a['componentType']=5121
            else:data,st=rows(v.astype(np.uint16))
        elif kind=='wgt':
            w=v.astype(np.float64);s=w.sum(1,keepdims=True);w=np.where(s>0,w/np.where(s>0,s,1),np.array([1,0,0,0]))
            q=np.round(w*255).astype(np.int64);d=255-q.sum(1);q[np.arange(len(q)),w.argmax(1)]+=d   # sum exactly 255
            data,st=rows(q.astype(np.uint8));a['componentType']=5121;a['normalized']=True
        elif kind=='idx':
            if a['count'] and v.max()<65536:data,st=rows(v.astype(np.uint16).reshape(-1,1));a['componentType']=5123;st=None;data=pad(v.astype(np.uint16).tobytes())
            else:data,st=v.astype(np.uint32).tobytes(),None
        a['bufferView']=addbv(data,st,34963 if kind=='idx' else 34962);touched.add(old)
    for p in prims:
        at=p['attributes']
        for k,kind in (('POSITION','pos'),('NORMAL','nor'),('TEXCOORD_0','uv'),('JOINTS_0','jnt'),('WEIGHTS_0','wgt')):
            if k in at:redo(at[k],kind)
        if 'indices' in p:redo(p['indices'],'idx')
    img_bvs={im['bufferView'] for im in j.get('images',[]) if 'bufferView' in im}
    # copy every other bufferView (images, inverse bind matrices ...) unchanged
    for i,bv in enumerate(j['bufferViews']):
        if i in touched:continue
        d=bn[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
        if i in img_bvs:
            I=Image.open(io.BytesIO(d));I.load()
            if I.mode=='RGBA' or (I.mode=='P' and 'transparency' in I.info):
                o=io.BytesIO();I.convert('RGBA').quantize(256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(o,'PNG',optimize=True)
                if o.tell()<len(d):d=o.getvalue()
        n=dict(bv);ni=addbv(d,bv.get('byteStride'),bv.get('target'));n['byteOffset']=nbv[ni]['byteOffset'];n['byteLength']=len(d);nbv[ni]=n;keep[i]=ni
    for a in j['accessors']:
        if a.get('bufferView') in keep and a is not None and not a.get('_q'):pass
    # remap the accessors / images that still point at an old (copied) view
    q_acc=set(done)
    for ai,a in enumerate(j['accessors']):
        if ai not in q_acc and 'bufferView' in a:a['bufferView']=keep[a['bufferView']]
    for im in j.get('images',[]):
        if 'bufferView' in im:im['bufferView']=keep[im['bufferView']]
    j['bufferViews']=nbv;j['buffers']=[{'byteLength':len(new)}]
    js=pad(json.dumps(j,separators=(',',':')).encode(),b' ');bb=pad(bytes(new))
    out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bb))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bb),0x004E4942)+bb
    open(dst,'wb').write(out);return len(out)
if __name__=='__main__':
    a,b=sys.argv[1],sys.argv[2];os.makedirs(b,exist_ok=True);T0=T1=0
    for f in sorted(glob.glob(os.path.join(a,'*.vrm'))):
        n=quant(f,os.path.join(b,os.path.basename(f)));o=os.path.getsize(f);T0+=o;T1+=n;print('%-26s %8d -> %8d  (%.0f%%)'%(os.path.basename(f),o,n,n*100/o))
    print('total %d -> %d (%.0f%%)'%(T0,T1,T1*100/T0))
