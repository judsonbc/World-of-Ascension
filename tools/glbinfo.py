import json,struct,sys
def load(p):
    d=open(p,'rb').read()
    o=12;js=None;bn=None
    while o<len(d):
        l,t=struct.unpack('<II',d[o:o+8]);o+=8
        if t==0x4E4F534A: js=json.loads(d[o:o+l])
        elif t==0x004E4942 and bn is None: bn=d[o:o+l]
        o+=l
    return js,bn
if __name__=='__main__':
    j,b=load(sys.argv[1])
    print('nodes',len(j['nodes']),'skins',len(j.get('skins',[])),'meshes',len(j.get('meshes',[])),'anims',len(j['animations']), 'bin',len(b))
    print([a['name'] for a in j['animations']])
    sk=j['skins'][0]
    print('joints',[j['nodes'][i]['name'] for i in sk['joints']])
    a=j['animations'][0]
    print(a['name'],len(a['channels']),a['channels'][:2], a['samplers'][0])
    acc=j['accessors'][a['samplers'][0]['input']];print(acc)
    print(j.get('extensionsUsed'))
