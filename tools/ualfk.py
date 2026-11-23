import numpy as np, json, struct
from glbinfo import load
from scipy.spatial.transform import Rotation as Rot
CT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(j,b,i):
    a=j['accessors'][i];bv=j['bufferViews'][a['bufferView']]
    dt=CT[a['componentType']];n=NC[a['type']]
    off=bv.get('byteOffset',0)+a.get('byteOffset',0)
    arr=np.frombuffer(b,dtype=dt,count=a['count']*n,offset=off).reshape(a['count'],n) if 'byteStride' not in bv else None
    if arr is None:
        st=bv['byteStride'];isz=np.dtype(dt).itemsize
        arr=np.stack([np.frombuffer(b,dtype=dt,count=n,offset=off+k*st) for k in range(a['count'])])
    arr=arr.astype(np.float64)
    if a.get('normalized'):
        arr=arr/{5120:127,5121:255,5122:32767,5123:65535}[a['componentType']]
    return arr
class UAL:
    def __init__(s,path):
        s.j,s.b=load(path);j=s.j
        s.N=j['nodes'];s.par={}
        for i,n in enumerate(s.N):
            for c in n.get('children',[]): s.par[c]=i
        s.idx={n['name']:i for i,n in enumerate(s.N)}
        s.anims={}
        for a in j['animations']:
            ch={}
            for c in a['channels']:
                sm=a['samplers'][c['sampler']]
                t=acc(j,s.b,sm['input'])[:,0];v=acc(j,s.b,sm['output'])
                ch[(c['target']['node'],c['target']['path'])]=(t,v)
            s.anims[a['name']]=ch
        s.order=self_order(s)
    def rest(s,i):
        n=s.N[i]
        return (np.array(n.get('translation',[0,0,0]),float),np.array(n.get('rotation',[0,0,0,1]),float))
def self_order(s):
    # parents before children
    out=[];seen=set()
    def v(i):
        if i in seen:return
        if i in s.par:v(s.par[i])
        seen.add(i);out.append(i)
    for i in range(len(s.N)):v(i)
    return out
def sample(ch,node,path,t,default):
    k=(node,path)
    if k not in ch:return default
    tt,vv=ch[k]
    if len(tt)==1:return vv[0]
    t=min(max(t,tt[0]),tt[-1])
    i=np.searchsorted(tt,t,side='right')-1;i=min(i,len(tt)-2)
    f=(t-tt[i])/(tt[i+1]-tt[i]) if tt[i+1]>tt[i] else 0
    if path=='rotation':
        a=vv[i];b=vv[i+1]
        if np.dot(a,b)<0:b=-b
        q=a*(1-f)+b*f;return q/np.linalg.norm(q)
    return vv[i]*(1-f)+vv[i+1]*f
def fk(u,ch,t):
    """world rotation (quat xyzw) and world position per node"""
    W={};P={}
    for i in u.order:
        tr,ro=u.rest(i)
        tr=sample(ch,i,'translation',t,tr);ro=sample(ch,i,'rotation',t,ro)
        R=Rot.from_quat(ro)
        if i in u.par:
            p=u.par[i];W[i]=W[p]*R;P[i]=P[p]+W[p].apply(tr)
        else:
            W[i]=R;P[i]=tr
    return W,P
