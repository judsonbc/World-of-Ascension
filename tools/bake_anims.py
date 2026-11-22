#!/usr/bin/env python3
"""bake_anims.py (v5_322) - turns the Quaternius Universal Animation Library 1 + 2 (CC0) into web/anims/ual.json + ual.bin
(retargeted rotations for the humanoid bones of the game's VRM avatars; read by web/anim3d.js).

   python3 tools/bake_anims.py "<Universal Animation Library[Standard] folder>" "<Universal Animation Library 2[Standard] folder>" [out dir = web/anims]

Needs Python 3 + numpy + scipy. Uses  Unreal-Godot/UALx_Standard.glb  (no root motion) for the poses and  UALx_Standard_RM.glb  only to measure how far a walk / run cycle travels.

Retargeting: the library rig and the VRM avatars are both in a T-pose, +Y up, +Z to the front, the character's left on +X.  So for every bone the animation is stored as
    dW = W_anim * W_rest^-1        (world rotation change from the T-pose)
and, to match how VRM3D.setB() composes bones (world = parentDelta * d * rest), each bone keeps d = dW_parent^-1 * dW  along the VRM humanoid chain.
File format  ual.bin : per clip, per frame (30 fps): 20 bones x (x,y,z,w) int16 /32767, then hips translation (x,y,z) int16 / 8192 (metres, change from the rest pelvis position).
"""
import sys, os, json, numpy as np
from scipy.spatial.transform import Rotation as Rot
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ualfk import UAL, fk, sample

FPS = 30
# VRM humanoid bone -> (library bone, VRM parent)
BONES = [
 ('hips','pelvis',None),('spine','spine_01','hips'),('chest','spine_02','spine'),('upperChest','spine_03','chest'),
 ('neck','neck_01','upperChest'),('head','Head','neck'),
 ('leftShoulder','clavicle_l','upperChest'),('leftUpperArm','upperarm_l','leftShoulder'),('leftLowerArm','lowerarm_l','leftUpperArm'),('leftHand','hand_l','leftLowerArm'),
 ('rightShoulder','clavicle_r','upperChest'),('rightUpperArm','upperarm_r','rightShoulder'),('rightLowerArm','lowerarm_r','rightUpperArm'),('rightHand','hand_r','rightLowerArm'),
 ('leftUpperLeg','thigh_l','hips'),('leftLowerLeg','calf_l','leftUpperLeg'),('leftFoot','foot_l','leftLowerLeg'),
 ('rightUpperLeg','thigh_r','hips'),('rightLowerLeg','calf_r','rightUpperLeg'),('rightFoot','foot_r','rightLowerLeg')]
NB = len(BONES)
SKIP = {'A_TPose', 'Driving_Loop', 'Pistol_Reload'}

def bake_pack(u, rm, tag, out_frames, meta):
    nm = u.idx
    W0, P0 = fk(u, {}, 0)
    rest_h = P0[nm['pelvis']]
    inv0 = {b[0]: W0[nm[b[1]]].inv() for b in BONES}
    for name, ch in u.anims.items():
        if name in SKIP: continue
        dur = max(float(t[-1]) for t, v in ch.values())
        loop = name.endswith('_Loop')
        nf = int(round(dur * FPS)) + 1
        data = np.zeros((nf, NB * 4 + 3), np.int16)
        prev = [None] * NB
        hand_pos = {'l': [], 'r': []}; foot = {'l': [], 'r': []}; pel = []
        for f in range(nf):
            t = min(f / FPS, dur)
            W, P = fk(u, ch, t)
            dW = {b[0]: W[nm[b[1]]] * inv0[b[0]] for b in BONES}
            for k, (vn, un, vp) in enumerate(BONES):
                d = dW[vn] if vp is None else dW[vp].inv() * dW[vn]
                q = d.as_quat()
                if prev[k] is not None and np.dot(q, prev[k]) < 0: q = -q
                prev[k] = q
                data[f, k*4:k*4+4] = np.round(q / np.linalg.norm(q) * 32767)
            hp = P[nm['pelvis']] - rest_h
            data[f, NB*4:NB*4+3] = np.clip(np.round(hp * 8192), -32767, 32767)
            for s in 'lr':
                hand_pos[s].append(P[nm['hand_' + s]]); foot[s].append(P[nm['foot_' + s]])
            pel.append(P[nm['pelvis']])
        info = {'src': tag, 'n': nf, 'dur': round(dur, 4), 'loop': loop}
        # strike moment: when a hand is fastest (used to start attack clips just before the hit)
        sp = np.zeros(nf)
        for s in 'lr':
            h = np.array(hand_pos[s]); v = np.linalg.norm(np.gradient(h, axis=0), axis=1) * FPS
            sp = np.maximum(sp, v)
        if nf > 4:
            ks = np.convolve(sp, np.ones(3) / 3, 'same'); info['hit'] = round(float(np.argmax(ks)) / FPS, 3)
            # every separate strike of a combo: local maxima above 55% of the fastest, at least .35 s apart
            hits = []
            for f in range(1, nf - 1):
                if ks[f] >= ks[f-1] and ks[f] > ks[f+1] and ks[f] > .55 * ks.max() and (not hits or f / FPS - hits[-1] > .35): hits.append(f / FPS)
            info['hits'] = [round(h, 3) for h in hits]
        # travel distance of one cycle (root motion pack)
        if rm and name in rm.anims:
            for (node, path), (t, v) in rm.anims[name].items():
                if path == 'translation' and rm.N[node]['name'] == 'root':
                    d = v[-1] - v[0]; info['rm'] = [round(float(x), 3) for x in d]
        # stance-foot estimate of the ground speed (m/s): the planted foot slides back against the pelvis
        if loop and nf > 8:
            pel = np.array(pel); ests = []
            for s in 'lr':
                fz = np.array(foot[s]); rel = (fz - pel)
                # horizontal motion along the dominant travel axis (z)
                vz = -np.gradient(rel[:, 2]) * FPS
                low = fz[:, 1] < fz[:, 1].min() + 0.04
                if low.sum() > 2: ests.append(float(np.median(vz[low])))
            if ests: info['spd'] = round(float(np.mean(ests)), 3)
        info['off'] = len(out_frames)
        out_frames.append(data)
        meta[name] = info
    return rest_h

def main():
    a, b = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'anims')
    os.makedirs(out, exist_ok=True)
    packs = [(a, 'UAL1_Standard', 'UAL1'), (b, 'UAL2_Standard', 'UAL2')]
    frames = []; meta = {}; rest_h = None
    for folder, stem, tag in packs:
        u = UAL(os.path.join(folder, 'Unreal-Godot', stem + '.glb'))
        rmp = os.path.join(folder, 'Unreal-Godot', stem + '_RM.glb')
        rm = UAL(rmp) if os.path.exists(rmp) else None
        rest_h = bake_pack(u, rm, tag, frames, meta)
    # convert frame offsets to row offsets into one big array
    off = 0
    for name, info in meta.items():
        info['off'] = off; off += info['n']
    allf = np.concatenate(frames, 0).astype('<i2')
    allf.tofile(os.path.join(out, 'ual.bin'))
    js = {'fps': FPS, 'bones': [b[0] for b in BONES], 'stride': NB * 4 + 3, 'pelvisH': round(float(rest_h[1]), 4), 'clips': meta,
          'credit': 'Universal Animation Library 1 + 2 by Quaternius, CC0 1.0'}
    json.dump(js, open(os.path.join(out, 'ual.json'), 'w'), separators=(',', ':'))
    print('clips', len(meta), 'frames', len(allf), 'bytes', allf.nbytes)

if __name__ == '__main__':
    main()
